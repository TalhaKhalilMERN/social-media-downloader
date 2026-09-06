import { execFile, spawn, ChildProcess } from 'child_process';
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

export interface FfmpegStreamOptions {
  inputUrl: string;
  mode: 'remux' | 'transcode';
  targetWidth?: number;
  targetHeight?: number;
}

function getProxyUrl(): string | undefined {
  return process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
}

/**
 * Creates a Web ReadableStream backed by an on-the-fly FFmpeg child process outputting
 * a fragmented MP4 (fMP4) stream to stdout (pipe:1).
 * Supports both HLS remuxing (-c copy) and video resolution transcoding (-vf scale=w:h).
 * Handles backpressure, stderr buffering, error handling, and process termination on disconnect.
 */
export function createFfmpegMediaStream(options: FfmpegStreamOptions): ReadableStream<Uint8Array> {
  const { inputUrl, mode, targetWidth, targetHeight } = options;
  const ffmpegPath = getFfmpegPath();
  const proxyUrl = getProxyUrl();

  const isHttpInput = /^https?:\/\//i.test(inputUrl);

  const baseArgs = [
    '-y',
    ...(proxyUrl && isHttpInput ? ['-http_proxy', proxyUrl] : []),
    '-i',
    inputUrl,
  ];

  let processingArgs: string[];
  if (mode === 'remux') {
    processingArgs = [
      '-c',
      'copy',
      '-bsf:a',
      'aac_adtstoasc',
      '-avoid_negative_ts',
      'make_zero',
    ];
  } else {
    const w = targetWidth || 720;
    const h = targetHeight || 1280;
    processingArgs = [
      '-vf',
      `scale=${w}:${h}`,
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '23',
      '-c:a',
      'aac',
      '-avoid_negative_ts',
      'make_zero',
    ];
  }

  const formatArgs = [
    '-f',
    'mp4',
    '-movflags',
    '+frag_keyframe+empty_moov+default_base_moof',
    'pipe:1',
  ];

  const args = [...baseArgs, ...processingArgs, ...formatArgs];

  let ffmpegProc: ChildProcess | null = null;
  let isCleanedUp = false;
  let stderrBuffer = '';

  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;

    if (ffmpegProc && !ffmpegProc.killed) {
      try {
        ffmpegProc.kill('SIGTERM');
        const procRef = ffmpegProc;
        setTimeout(() => {
          if (procRef && !procRef.killed) {
            procRef.kill('SIGKILL');
          }
        }, 2000);
      } catch {
        // Ignore kill errors
      }
    }
  };

  return new ReadableStream<Uint8Array>({
    start(controller) {
      try {
        ffmpegProc = spawn(ffmpegPath, args, {
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        ffmpegProc.stdout?.on('data', (chunk: Buffer) => {
          if (isCleanedUp) return;
          controller.enqueue(new Uint8Array(chunk));
        });

        ffmpegProc.stdout?.on('end', () => {
          if (isCleanedUp) return;
          controller.close();
          cleanup();
        });

        ffmpegProc.stderr?.on('data', (chunk: Buffer) => {
          stderrBuffer += chunk.toString();
          if (stderrBuffer.length > 8000) {
            stderrBuffer = stderrBuffer.slice(-8000);
          }
        });

        ffmpegProc.on('error', (err: Error) => {
          console.error('[FFmpeg Stream Process Error]:', err.message);
          if (!isCleanedUp) {
            controller.error(err);
            cleanup();
          }
        });

        ffmpegProc.on('close', (code: number | null) => {
          if (isCleanedUp) return;
          if (code !== 0 && code !== null) {
            const sanitizedStderr = stderrBuffer
              .replace(/:\/\/[^:@]+:[^@]+@/g, '://***:***@')
              .slice(-300);
            console.error(`[FFmpeg Exit Error] Code ${code}: ${sanitizedStderr}`);
            controller.error(new Error(`FFmpeg streaming processing failed with exit code ${code}`));
          } else {
            controller.close();
          }
          cleanup();
        });
      } catch (err: unknown) {
        controller.error(err as Error);
        cleanup();
      }
    },
    cancel() {
      cleanup();
    },
  });
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
