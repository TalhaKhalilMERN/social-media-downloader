import { execFile } from 'child_process';
import fs from 'fs';
import { promisify } from 'util';
import { NormalizedFormat, NormalizedVideoMetadata, PlatformType } from '../types/video';
import { validateSupportedUrl } from './url-validator';

const execFileAsync = promisify(execFile);

// Candidate executable locations on Windows/Linux/macOS
const FALLBACK_YTDLP_PATHS = [
  'C:\\Users\\talha\\Downloads\\yt-dlp.exe',
  'C:\\yt-dlp.exe',
  '/usr/local/bin/yt-dlp',
  '/usr/bin/yt-dlp',
];

/**
 * Locate the yt-dlp executable path.
 * Checks process.env.YTDLP_PATH first, then fallback known local paths,
 * or defaults to 'yt-dlp' if assumed in system PATH.
 */
function getYtDlpExecutablePath(): string {
  if (process.env.YTDLP_PATH && fs.existsSync(/*turbopackIgnore: true*/ process.env.YTDLP_PATH)) {
    return process.env.YTDLP_PATH;
  }

  for (const fallbackPath of FALLBACK_YTDLP_PATHS) {
    if (fs.existsSync(/*turbopackIgnore: true*/ fallbackPath)) {
      return fallbackPath;
    }
  }

  return 'yt-dlp';
}

/**
 * Formats width & height into standard quality labels (e.g. 720x1280 -> 720p).
 */
function determineResolution(
  width?: number | null,
  height?: number | null,
  rawRes?: string | null
): string {
  if (width && height && width > 0 && height > 0) {
    const minDim = Math.min(width, height);
    return `${minDim}p`;
  }

  if (rawRes) {
    const match = rawRes.match(/(\d+)x(\d+)/i);
    if (match) {
      const w = parseInt(match[1], 10);
      const h = parseInt(match[2], 10);
      if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
        return `${Math.min(w, h)}p`;
      }
    }

    const pMatch = rawRes.match(/(\d+p)/i);
    if (pMatch) {
      return pMatch[1].toLowerCase();
    }
  }

  return 'Unknown';
}

interface RawYtDlpFormat {
  format_id?: string;
  width?: number;
  height?: number;
  resolution?: string;
  format_note?: string;
  filesize?: number;
  filesize_approx?: number;
  vcodec?: string;
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
  formats?: RawYtDlpFormat[];
}

/**
 * Execute yt-dlp with JSON metadata mode for validated ReelShort and DramaBox URLs.
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
  const ytDlpPath = getYtDlpExecutablePath();

  // Arguments passed securely to yt-dlp as an array
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
      timeout: 30000, // 30 second timeout
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for metadata JSON
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
  const topWidth = typeof rawJson.width === 'number' ? rawJson.width : null;
  const topHeight = typeof rawJson.height === 'number' ? rawJson.height : null;

  const rawFormats: RawYtDlpFormat[] = Array.isArray(rawJson.formats) ? rawJson.formats : [];
  // Filter out audio-only formats if video formats are present
  const videoFormats = rawFormats.filter((f) => f.vcodec !== 'none');
  const validFormatsList = videoFormats.length > 0 ? videoFormats : rawFormats;

  const normalizedFormats: NormalizedFormat[] = [];

  if (validFormatsList.length > 0) {
    for (const f of validFormatsList) {
      const w = typeof f.width === 'number' ? f.width : null;
      const h = typeof f.height === 'number' ? f.height : null;
      const res = determineResolution(w, h, f.resolution || f.format_note);
      const filesize =
        typeof f.filesize === 'number' && f.filesize > 0
          ? f.filesize
          : typeof f.filesize_approx === 'number' && f.filesize_approx > 0
          ? f.filesize_approx
          : null;

      normalizedFormats.push({
        id: String(f.format_id || 'native-format'),
        resolution: res,
        width: w,
        height: h,
        filesize,
        source: 'native',
      });
    }
  } else {
    // Fallback single format mapping from top-level metadata
    const res = determineResolution(topWidth, topHeight, rawJson.resolution);
    const filesize =
      typeof rawJson.filesize === 'number' && rawJson.filesize > 0
        ? rawJson.filesize
        : typeof rawJson.filesize_approx === 'number' && rawJson.filesize_approx > 0
        ? rawJson.filesize_approx
        : null;

    normalizedFormats.push({
      id: String(rawJson.format_id || 'default'),
      resolution: res,
      width: topWidth,
      height: topHeight,
      filesize,
      source: 'native',
    });
  }

  // Deduplicate formats by resolution + width + height + filesize
  const seen = new Set<string>();
  const uniqueFormats: NormalizedFormat[] = [];
  for (const fmt of normalizedFormats) {
    const key = `${fmt.resolution}-${fmt.width}-${fmt.height}-${fmt.filesize}`;
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
