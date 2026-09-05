import { execFile } from 'child_process';
import { promisify } from 'util';
import { getFfprobePath } from './binaries';

const execFileAsync = promisify(execFile);

export interface MediaInspectionResult {
  width: number;
  height: number;
  codec: string;
  duration: number | null;
}


function getProxyUrl(): string | undefined {
  return process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
}

/**
 * Inspects a media file or stream URL using ffprobe to obtain actual dimensions and codec metadata.
 */
export async function inspectMediaUrl(mediaUrl: string): Promise<MediaInspectionResult> {
  const ffprobePath = getFfprobePath();

  const proxyUrl = getProxyUrl();
  const useProxy = /^https?:\/\//i.test(mediaUrl);

  const args = [
    '-v',
    'error',
    ...(proxyUrl && useProxy ? ['-http_proxy', proxyUrl] : []),
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height,codec_name,duration',
    '-of',
    'json',
    mediaUrl,
  ];

  try {
    const { stdout } = await execFileAsync(ffprobePath, args, {
      timeout: 25000,
      maxBuffer: 5 * 1024 * 1024,
    });

    const parsed = JSON.parse(stdout);
    const stream = parsed?.streams?.[0];

    const width = typeof stream?.width === 'number' ? stream.width : 0;
    const height = typeof stream?.height === 'number' ? stream.height : 0;
    const codec = typeof stream?.codec_name === 'string' ? stream.codec_name : 'unknown';
    const duration =
      typeof stream?.duration === 'string'
        ? parseFloat(stream.duration)
        : typeof stream?.duration === 'number'
          ? stream.duration
          : null;

    if (width > 0 && height > 0) {
      return { width, height, codec, duration };
    }
  } catch (error) {
    console.error('ffprobe media inspection error:', error);
  }

  throw new Error("We couldn't determine the video's resolution.");
}
