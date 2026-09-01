import { execFile } from 'child_process';
import { promisify } from 'util';
import { NormalizedFormat, NormalizedVideoMetadata, PlatformType } from '../types/video';
import { validateSupportedUrl } from './url-validator';
import { getYtDlpPath } from './binaries';
import { inspectMediaUrl } from './media-inspector';
import { getVideoQuality, calculateVariantDimensions } from './quality';

const execFileAsync = promisify(execFile);

interface RawYtDlpFormat {
  format_id?: string;
  width?: number;
  height?: number;
  resolution?: string;
  format_note?: string;
  filesize?: number;
  filesize_approx?: number;
  vcodec?: string;
  url?: string;
}

interface RawYtDlpOutput {
  title?: string;
  fulltitle?: string;
  duration?: number;
  webpage_url?: string;
  extractor_key?: string;
  extractor?: string;
  thumbnail?: string;
  thumbnails?: Array<{ url?: string }>;
  width?: number;
  height?: number;
  resolution?: string;
  format_id?: string;
  filesize?: number;
  filesize_approx?: number;
  url?: string;
  formats?: RawYtDlpFormat[];
}

function formatFileSizeDisplay(bytes?: number | null, isGenerated = false): string {
  if (isGenerated) {
    return 'Calculated on download';
  }
  if (!bytes || bytes <= 0) {
    return 'Size unavailable';
  }
  const kb = bytes / 1024;
  const mb = kb / 1024;
  if (mb >= 1024) {
    return `~${(mb / 1024).toFixed(1)} GB`;
  }
  if (mb >= 1) {
    return `~${mb.toFixed(1)} MB`;
  }
  return `~${kb.toFixed(0)} KB`;
}

/**
 * Execute yt-dlp metadata analysis and inspect video media with ffprobe.
 */
export async function analyzeVideoUrl(targetUrl: string): Promise<{
  platform: PlatformType;
  video: NormalizedVideoMetadata;
  formats: NormalizedFormat[];
}> {
  // Step 1: Strict URL Validation (Server-side defense)
  const validation = validateSupportedUrl(targetUrl);
  if (!validation.isValid || !validation.platform) {
    throw new Error(validation.error || 'Unsupported website. This downloader currently supports ReelShort and DramaBox only.');
  }

  const platform = validation.platform;
  const ytDlpPath = getYtDlpPath();

  const args = [
    '-J',
    '--no-warnings',
    '--no-playlist',
    '--no-call-home',
    targetUrl,
  ];

  let stdout: string;
  try {
    const result = await execFileAsync(ytDlpPath, args, {
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    });
    stdout = result.stdout;
  } catch (error: unknown) {
    const err = error as { code?: string; stderr?: string; message?: string; killed?: boolean };
    console.error(`yt-dlp execution error for ${platform}:`, err);

    if (err.killed || err.code === 'ETIMEDOUT') {
      throw new Error('Analysis timed out while processing video metadata. Please try again.');
    }

    if (err.code === 'ENOENT') {
      throw new Error('yt-dlp executable could not be found on the server.');
    }

    throw new Error(`Unable to extract video content from this ${platform === 'reelshort' ? 'ReelShort' : 'DramaBox'} URL.`);
  }

  let rawJson: RawYtDlpOutput;
  try {
    rawJson = JSON.parse(stdout) as RawYtDlpOutput;
  } catch (e) {
    console.error('Failed to parse yt-dlp JSON output:', e);
    throw new Error('Invalid metadata response returned from server extractor.');
  }

  if (!rawJson || typeof rawJson !== 'object') {
    throw new Error('No video metadata could be retrieved for this URL.');
  }

  const title = rawJson.title || rawJson.fulltitle || `${platform === 'reelshort' ? 'ReelShort' : 'DramaBox'} Episode`;
  const duration = typeof rawJson.duration === 'number' ? Math.round(rawJson.duration) : null;
  const webpageUrl = rawJson.webpage_url || targetUrl;
  const extractor = rawJson.extractor_key || rawJson.extractor || platform;
  const thumbnail =
    rawJson.thumbnail ||
    (Array.isArray(rawJson.thumbnails) && rawJson.thumbnails.length > 0
      ? rawJson.thumbnails[rawJson.thumbnails.length - 1]?.url
      : null) ||
    null;

  const rawFormats: RawYtDlpFormat[] = Array.isArray(rawJson.formats) ? rawJson.formats : [];
  const validVideoFormats = rawFormats.filter(
    (f) => f.vcodec !== 'none' && typeof f.width === 'number' && f.width > 0 && typeof f.height === 'number' && f.height > 0
  );

  const distinctResolutions = new Set(validVideoFormats.map((f) => `${f.width}x${f.height}`));

  const formats: NormalizedFormat[] = [];
  let topWidth = typeof rawJson.width === 'number' ? rawJson.width : null;
  let topHeight = typeof rawJson.height === 'number' ? rawJson.height : null;

  // SCENARIO A: yt-dlp returns multiple real native formats with distinct resolutions
  if (validVideoFormats.length > 1 && distinctResolutions.size > 1) {
    for (const f of validVideoFormats) {
      const w = f.width as number;
      const h = f.height as number;
      const quality = getVideoQuality(w, h);
      const filesize =
        typeof f.filesize === 'number' && f.filesize > 0
          ? f.filesize
          : typeof f.filesize_approx === 'number' && f.filesize_approx > 0
          ? f.filesize_approx
          : null;

      formats.push({
        id: String(f.format_id || `native-${quality}`),
        quality,
        resolution: `${w} × ${h}`,
        width: w,
        height: h,
        filesize,
        filesizeDisplay: formatFileSizeDisplay(filesize, false),
        source: 'native',
      });
    }
  } else {
    // SCENARIO B: Single format or unknown resolution format -> ffprobe media inspection fallback
    const directStreamUrl =
      rawJson.url ||
      (rawFormats.length > 0 ? rawFormats[rawFormats.length - 1]?.url : null);

    if (directStreamUrl) {
      try {
        const probed = await inspectMediaUrl(directStreamUrl);
        topWidth = probed.width;
        topHeight = probed.height;
      } catch (probeErr) {
        console.warn('ffprobe direct stream inspection fallback warning:', probeErr);
      }
    }

    // Default fallback to standard 720x1280 vertical resolution if probe failed
    if (!topWidth || !topHeight || topWidth <= 0 || topHeight <= 0) {
      topWidth = 720;
      topHeight = 1280;
    }

    const sourceQuality = getVideoQuality(topWidth, topHeight);
    const nativeFilesize =
      typeof rawJson.filesize === 'number' && rawJson.filesize > 0
        ? rawJson.filesize
        : typeof rawJson.filesize_approx === 'number' && rawJson.filesize_approx > 0
        ? rawJson.filesize_approx
        : null;

    if (sourceQuality === '720p') {
      const dim360 = calculateVariantDimensions(topWidth, topHeight, '360p');
      const dim480 = calculateVariantDimensions(topWidth, topHeight, '480p');
      const dim1080 = calculateVariantDimensions(topWidth, topHeight, '1080p');

      formats.push({
        id: 'gen-360p',
        quality: '360p',
        resolution: `${dim360.width} × ${dim360.height}`,
        width: dim360.width,
        height: dim360.height,
        filesize: null,
        filesizeDisplay: 'Calculated on download',
        source: 'generated',
        generatedFrom: '720p',
      });

      formats.push({
        id: 'gen-480p',
        quality: '480p',
        resolution: `${dim480.width} × ${dim480.height}`,
        width: dim480.width,
        height: dim480.height,
        filesize: null,
        filesizeDisplay: 'Calculated on download',
        source: 'generated',
        generatedFrom: '720p',
      });

      formats.push({
        id: String(rawJson.format_id || 'native-720p'),
        quality: '720p',
        resolution: `${topWidth} × ${topHeight}`,
        width: topWidth,
        height: topHeight,
        filesize: nativeFilesize,
        filesizeDisplay: formatFileSizeDisplay(nativeFilesize, false),
        source: 'native',
      });

      formats.push({
        id: 'gen-1080p',
        quality: '1080p',
        resolution: `${dim1080.width} × ${dim1080.height}`,
        width: dim1080.width,
        height: dim1080.height,
        filesize: null,
        filesizeDisplay: 'Calculated on download',
        source: 'generated',
        generatedFrom: '720p',
      });
    } else {
      // General fallback if verified source is different (e.g. 480p)
      formats.push({
        id: String(rawJson.format_id || `native-${sourceQuality}`),
        quality: sourceQuality,
        resolution: `${topWidth} × ${topHeight}`,
        width: topWidth,
        height: topHeight,
        filesize: nativeFilesize,
        filesizeDisplay: formatFileSizeDisplay(nativeFilesize, false),
        source: 'native',
      });
    }
  }

  // Deduplicate formats by quality + width + height
  const seen = new Set<string>();
  const uniqueFormats: NormalizedFormat[] = [];
  for (const fmt of formats) {
    const key = `${fmt.quality}-${fmt.width}-${fmt.height}-${fmt.source}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueFormats.push(fmt);
    }
  }

  const videoMetadata: NormalizedVideoMetadata = {
    title,
    duration,
    webpageUrl,
    extractor,
    thumbnail,
    width: topWidth,
    height: topHeight,
    platform,
  };

  return {
    platform,
    video: videoMetadata,
    formats: uniqueFormats,
  };
}
