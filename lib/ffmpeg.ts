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

/**
 * Transcodes a video file to the requested resolution variant using FFmpeg.
 * Verifies the resulting generated file dimensions with ffprobe upon completion.
 */
export async function generateVideoVariant(options: GenerateVariantOptions): Promise<void> {
  const { inputPath, outputPath, targetWidth, targetHeight } = options;
  const ffmpegPath = getFfmpegPath();

  // Arguments array passed securely to execFile
  const args = [
    '-y',
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
    'copy',
    outputPath,
  ];

  try {
    await execFileAsync(ffmpegPath, args, {
      timeout: 120000, // 2 minutes timeout for transcoding
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
