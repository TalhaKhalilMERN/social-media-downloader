import fs from 'fs';

const FALLBACK_YTDLP_PATHS = [
  'C:\\Users\\talha\\Downloads\\yt-dlp.exe',
  'C:\\yt-dlp.exe',
  '/usr/local/bin/yt-dlp',
  '/usr/bin/yt-dlp',
];

const FALLBACK_FFMPEG_PATHS = [
  'C:\\Users\\talha\\Downloads\\ffmpeg-9.0.1-essentials_build\\ffmpeg-9.0.1-essentials_build\\bin\\ffmpeg.exe',
  'C:\\ffmpeg\\bin\\ffmpeg.exe',
  'C:\\ffmpeg.exe',
  '/usr/local/bin/ffmpeg',
  '/usr/bin/ffmpeg',
];

const FALLBACK_FFPROBE_PATHS = [
  'C:\\Users\\talha\\Downloads\\ffmpeg-9.0.1-essentials_build\\ffmpeg-9.0.1-essentials_build\\bin\\ffprobe.exe',
  'C:\\ffmpeg\\bin\\ffprobe.exe',
  'C:\\ffmpeg.exe',
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
