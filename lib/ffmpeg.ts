import { execFile } from 'child_process';
import { promisify } from 'util';
import { getFfmpegPath } from './binaries';
import { inspectMediaUrl } from './media-inspector';

const execFileAsync = promisify(execFile);

export interface GenerateVariantOptions {
  inputPath: string;
  outputPath: string;
  targetWidth: number;
  targetHeight: number;
}

function getProxyUrl(): string | undefined {
  return process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
}

/**
 * Remuxes or converts an HLS (.m3u8) stream URL into a playable MP4 file.
 * Prefers fast stream copying (-c copy) for speed and quality preservation.
 * Falls back to re-encoding if stream copy fails.
 */
export async function remuxHlsToMp4(inputUrl: string, outputPath: string): Promise<void> {
  const ffmpegPath = getFfmpegPath();

  // Attempt 1: Fast stream copy without re-encoding
  const proxyUrl = getProxyUrl();

  // Attempt 1: Fast stream copy without re-encoding
  const copyArgs = [
    '-y',
    ...(proxyUrl ? ['-http_proxy', proxyUrl] : []),
    '-i',
    inputUrl,
    '-c',
    'copy',
    '-movflags',
    '+faststart',
    outputPath,
  ];

  try {
    await execFileAsync(ffmpegPath, copyArgs, {
      timeout: 120000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return;
  } catch (copyError) {
    console.warn('FFmpeg HLS stream copy failed, falling back to re-encoding:', copyError);
  }

  // Attempt 2: Fallback re-encode to H.264 / AAC
  const transcodeArgs = [
    '-y',
    ...(proxyUrl ? ['-http_proxy', proxyUrl] : []),
    '-i',
    inputUrl,
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-crf',
    '23',
    '-c:a',
    'aac',
    '-movflags',
    '+faststart',
    outputPath,
  ];

  try {
    await execFileAsync(ffmpegPath, transcodeArgs, {
      timeout: 180000,
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (transcodeError) {
    console.error('FFmpeg HLS transcode error:', transcodeError);
    throw new Error("We couldn't process this HLS video stream right now. Please try again.");
  }
}

/**
 * Transcodes a video stream URL or media file to the requested resolution variant using FFmpeg.
 * Verifies the resulting generated file dimensions with ffprobe upon completion.
 */
export async function generateVideoVariant(options: GenerateVariantOptions): Promise<void> {
  const { inputPath, outputPath, targetWidth, targetHeight } = options;
  const ffmpegPath = getFfmpegPath();

  const proxyUrl = getProxyUrl();

  const args = [
    '-y',
    ...(proxyUrl && /^https?:\/\//i.test(inputPath) ? ['-http_proxy', proxyUrl] : []),
    '-i',
    inputPath,
    '-vf',
    `scale=${targetWidth}:${targetHeight}`,
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-crf',
    '23',
    '-c:a',
    'aac',
    '-movflags',
    '+faststart',
    outputPath,
  ];

  try {
    await execFileAsync(ffmpegPath, args, {
      timeout: 180000,
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (error) {
    console.error('FFmpeg variant generation error:', error);
    throw new Error("We couldn't prepare this quality right now. Please try again.");
  }

  // Verification step: verify generated file dimensions using ffprobe
  try {
    const verification = await inspectMediaUrl(outputPath);
    if (verification.width !== targetWidth || verification.height !== targetHeight) {
      console.warn(
        `Generated video resolution mismatch: expected ${targetWidth}x${targetHeight}, got ${verification.width}x${verification.height}`
      );
    }
  } catch (err) {
    console.warn('Post-generation ffprobe verification check warning:', err);
  }
}
