import fs from 'fs';

const FALLBACK_YTDLP_PATHS = [
  '/usr/local/bin/yt-dlp',
  '/usr/bin/yt-dlp',
];

const FALLBACK_FFMPEG_PATHS = [
  '/usr/local/bin/ffmpeg',
  '/usr/bin/ffmpeg',
];

const FALLBACK_FFPROBE_PATHS = [
  '/usr/local/bin/ffprobe',
  '/usr/bin/ffprobe',
];

/**
 * Resolves the executable path for yt-dlp.
 * Prefers process.env.YTDLP_PATH, then fallback paths, then system PATH.
 */
export function getYtDlpPath(): string {
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
 * Resolves the executable path for ffmpeg.
 * Prefers process.env.FFMPEG_PATH, then fallback paths, then system PATH.
 */
export function getFfmpegPath(): string {
  if (process.env.FFMPEG_PATH && fs.existsSync(/*turbopackIgnore: true*/ process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  for (const fallbackPath of FALLBACK_FFMPEG_PATHS) {
    if (fs.existsSync(/*turbopackIgnore: true*/ fallbackPath)) {
      return fallbackPath;
    }
  }
  return 'ffmpeg';
}

/**
 * Resolves the executable path for ffprobe.
 * Prefers process.env.FFPROBE_PATH, then fallback paths, then system PATH.
 */
export function getFfprobePath(): string {
  if (process.env.FFPROBE_PATH && fs.existsSync(/*turbopackIgnore: true*/ process.env.FFPROBE_PATH)) {
    return process.env.FFPROBE_PATH;
  }
  for (const fallbackPath of FALLBACK_FFPROBE_PATHS) {
    if (fs.existsSync(/*turbopackIgnore: true*/ fallbackPath)) {
      return fallbackPath;
    }
  }
  return 'ffprobe';
}
