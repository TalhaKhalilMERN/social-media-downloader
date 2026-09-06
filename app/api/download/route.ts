import { NextRequest, NextResponse } from 'next/server';
import { validateSupportedUrl } from '@/lib/url-validator';
import { analyzeVideoUrl } from '@/lib/yt-dlp';
import { calculateVariantDimensions, TargetQuality } from '@/lib/quality';
import { createFfmpegMediaStream } from '@/lib/ffmpeg';
import { getYtDlpPath } from '@/lib/binaries';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fetch as undiciFetch, ProxyAgent } from 'undici';

const execFileAsync = promisify(execFile);

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');
  const quality = (searchParams.get('quality') || '720p') as TargetQuality;
  const source = searchParams.get('source') || 'native';

  // Step 1: Security - Server-side Domain Validation
  const validation = validateSupportedUrl(targetUrl || '');
  if (!validation.isValid || !validation.normalizedUrl) {
    return NextResponse.json(
      { success: false, error: 'Unsupported website. This downloader currently supports ReelShort and DramaBox only.' },
      { status: 400 }
    );
  }

  // Security - Validate requested quality parameter
  const allowedQualities: TargetQuality[] = ['360p', '480p', '720p', '1080p'];
  if (!allowedQualities.includes(quality)) {
    return NextResponse.json(
      { success: false, error: 'Invalid video quality requested.' },
      { status: 400 }
    );
  }

  const platform = validation.platform || 'video';

  try {
    // Step 2: Analyze metadata
    const { video } = await analyzeVideoUrl(validation.normalizedUrl);

    // Format file name preserving actual video title
    const rawTitle = video.title || platform;
    const sanitizedTitle = rawTitle
      .replace(/[\\/:\*\?"<>\|]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const fileName = `${sanitizedTitle} - ${quality}.mp4`;

    const safeHeaderFileName = fileName.replace(/"/g, '');
    const encodedFileName = encodeURIComponent(fileName);
    const contentDispositionHeader = `attachment; filename="${safeHeaderFileName}"; filename*=UTF-8''${encodedFileName}`;

    // Step 3: Get direct media stream URL using yt-dlp -g
    const ytDlpPath = getYtDlpPath();
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

    const ytDlpArgs = [
      '-g',
      '-f',
      'b/best',
      '--no-warnings',
      ...(proxyUrl ? ['--proxy', proxyUrl] : []),
      validation.normalizedUrl,
    ];

    const { stdout: directStreamUrl } = await execFileAsync(
      ytDlpPath,
      ytDlpArgs,
      { timeout: 30000 }
    );

    const trimmedStreamUrl = directStreamUrl.trim().split('\n')[0];
    if (!trimmedStreamUrl) {
      throw new Error('Could not retrieve direct media stream URL.');
    }

    const isHlsStream = trimmedStreamUrl.includes('.m3u8') || trimmedStreamUrl.includes('m3u8');

    // Case 1 & Case 2: Native requests vs Generated quality variants
    if (source === 'native') {
      if (!isHlsStream) {
        // Case 1: Native Direct MP4 Streaming (e.g. DramaBox direct .mp4 URL)
        const response = await undiciFetch(trimmedStreamUrl, {
          dispatcher: proxyUrl ? new ProxyAgent(proxyUrl) : undefined,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        if (!response.ok || !response.body) {
          throw new Error('Failed to fetch native media stream.');
        }

        return new NextResponse(response.body as unknown as ReadableStream, {
          status: 200,
          headers: {
            'Content-Type': 'video/mp4',
            'Content-Disposition': contentDispositionHeader,
            'Access-Control-Expose-Headers': 'Content-Disposition',
          },
        });
      } else {
        // Case 3: Native HLS Stream Remuxing (e.g. ReelShort .m3u8 URL) -> On-the-fly fMP4 stdout stream
        const mediaStream = createFfmpegMediaStream({
          inputUrl: trimmedStreamUrl,
          mode: 'remux',
        });

        return new NextResponse(mediaStream, {
          status: 200,
          headers: {
            'Content-Type': 'video/mp4',
            'Content-Disposition': contentDispositionHeader,
            'Access-Control-Expose-Headers': 'Content-Disposition',
          },
        });
      }
    } else {
      // Case 2 & Case 4: Generated Download Variants (360p, 480p, 1080p) -> On-the-fly FFmpeg transcode fMP4 stream
      const sourceW = video.width || 720;
      const sourceH = video.height || 1280;
      const targetDims = calculateVariantDimensions(sourceW, sourceH, quality);

      const mediaStream = createFfmpegMediaStream({
        inputUrl: trimmedStreamUrl,
        mode: 'transcode',
        targetWidth: targetDims.width,
        targetHeight: targetDims.height,
      });

      return new NextResponse(mediaStream, {
        status: 200,
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Disposition': contentDispositionHeader,
          'Access-Control-Expose-Headers': 'Content-Disposition',
        },
      });
    }
  } catch (error: unknown) {
    console.error('[Download API Error]:', error);

    return NextResponse.json(
      {
        success: false,
        error: "The download couldn't be completed. Please try again.",
      },
      { status: 500 }
    );
  }
}
