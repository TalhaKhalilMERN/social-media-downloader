import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { NormalizedFormat, NormalizedVideoMetadata } from '../types/video';

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
 * Formats width & height into human readable resolution (e.g. 720x1280 -> 720p).
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
    // Check if rawRes is formatted like "720x1280" or "1280x720"
    const match = rawRes.match(/(\d+)x(\d+)/i);
    if (match) {
      const w = parseInt(match[1], 10);
      const h = parseInt(match[2], 10);
      if (!isNaN(w) && !isNaN(h)) {
        return `${Math.min(w, h)}p`;
      }
    }

    // Check if rawRes already contains resolution like "720p"
    const pMatch = rawRes.match(/(\d+p)/i);
    if (pMatch) {
      return pMatch[1].toLowerCase();
    }
  }

  return 'Unknown quality';
}

/**
 * Execute yt-dlp with JSON metadata mode.
 */
export async function analyzeVideoUrl(targetUrl: string): Promise<{
  video: NormalizedVideoMetadata;
  formats: NormalizedFormat[];
}> {
  const ytDlpPath = getYtDlpExecutablePath();

  // Arguments passed to yt-dlp child process securely as an array
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
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for JSON metadata
    });
    stdout = result.stdout;
  } catch (error: unknown) {
    const err = error as { code?: string; stderr?: string; message?: string; killed?: boolean };
    console.error('yt-dlp execution error:', err);

    if (err.killed || err.code === 'ETIMEDOUT') {
      throw new Error('Analysis timed out. The server took too long to respond.');
    }

    if (err.code === 'ENOENT') {
      throw new Error('yt-dlp executable could not be found on the server.');
    }

    const stderrMessage = err.stderr ? err.stderr.split('\n')[0] : err.message || 'Unknown execution error';
    throw new Error(`yt-dlp process failed: ${stderrMessage}`);
  }

  let rawJson: any;
  try {
    rawJson = JSON.parse(stdout);
  } catch (e) {
    console.error('Failed to parse yt-dlp JSON output:', e);
    throw new Error('Invalid metadata response returned by yt-dlp.');
  }

  if (!rawJson || typeof rawJson !== 'object') {
    throw new Error('No usable metadata returned from yt-dlp.');
  }

  const title = rawJson.title || rawJson.fulltitle || 'Untitled Video';
  const duration = typeof rawJson.duration === 'number' ? Math.round(rawJson.duration) : null;
  const webpageUrl = rawJson.webpage_url || targetUrl;
  const extractor = rawJson.extractor_key || rawJson.extractor || 'Unknown Extractor';
  const thumbnail = rawJson.thumbnail || (Array.isArray(rawJson.thumbnails) && rawJson.thumbnails.length > 0 ? rawJson.thumbnails[rawJson.thumbnails.length - 1]?.url : null) || null;
  const topWidth = typeof rawJson.width === 'number' ? rawJson.width : null;
  const topHeight = typeof rawJson.height === 'number' ? rawJson.height : null;

  const rawFormats: any[] = Array.isArray(rawJson.formats) ? rawJson.formats : [];
  const normalizedFormats: NormalizedFormat[] = [];

  if (rawFormats.length > 0) {
    for (const f of rawFormats) {
      const w = typeof f.width === 'number' ? f.width : null;
      const h = typeof f.height === 'number' ? f.height : null;
      const res = determineResolution(w, h, f.resolution || f.format_note);

      normalizedFormats.push({
        formatId: String(f.format_id || 'unknown'),
        extension: String(f.ext || 'mp4'),
        width: w,
        height: h,
        resolution: res,
        videoCodec: String(f.vcodec || 'unknown'),
        audioCodec: String(f.acodec || 'unknown'),
        protocol: String(f.protocol || 'https'),
        filesize: typeof f.filesize === 'number' ? f.filesize : (typeof f.filesize_approx === 'number' ? f.filesize_approx : null),
      });
    }
  } else {
    // Single format synthesis if yt-dlp returns metadata without a formats array (e.g. single direct stream)
    const res = determineResolution(topWidth, topHeight, rawJson.resolution);
    normalizedFormats.push({
      formatId: String(rawJson.format_id || 'default'),
      extension: String(rawJson.ext || 'mp4'),
      width: topWidth,
      height: topHeight,
      resolution: res,
      videoCodec: String(rawJson.vcodec || 'unknown'),
      audioCodec: String(rawJson.acodec || 'unknown'),
      protocol: String(rawJson.protocol || 'https'),
      filesize: typeof rawJson.filesize === 'number' ? rawJson.filesize : null,
    });
  }

  const videoMetadata: NormalizedVideoMetadata = {
    title,
    duration,
    webpageUrl,
    extractor,
    thumbnail,
    width: topWidth,
    height: topHeight,
  };

  return {
    video: videoMetadata,
    formats: normalizedFormats,
  };
}
