import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { validateSupportedUrl } from '@/lib/url-validator';
import { analyzeVideoUrl } from '@/lib/yt-dlp';
import { calculateVariantDimensions, TargetQuality } from '@/lib/quality';
import { generateVideoVariant, remuxHlsToMp4 } from '@/lib/ffmpeg';
import { getYtDlpPath } from '@/lib/binaries';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fetch as undiciFetch, ProxyAgent } from 'undici';

const execFileAsync = promisify(execFile);

/**
 * Streams a local media file from disk to the client via Web ReadableStream
 * without buffering the full file into Node RAM memory.
 * Automatically cleans up the temporary working directory upon stream end, error, or cancellation.
 */
function streamFileResponse(filePath: string, dirToCleanup: string, fileName: string): NextResponse {
  const stat = fs.statSync(filePath);
  const fileStream = fs.createReadStream(filePath);

  const safeHeaderFileName = fileName.replace(/"/g, '');
  const encodedFileName = encodeURIComponent(fileName);
  const contentDispositionHeader = `attachment; filename="${safeHeaderFileName}"; filename*=UTF-8''${encodedFileName}`;

  const webStream = new ReadableStream({
    start(controller) {
      fileStream.on('data', (chunk) => {
        controller.enqueue(chunk);
      });
      fileStream.on('end', () => {
        controller.close();
        fs.promises.rm(dirToCleanup, { recursive: true, force: true }).catch(() => { });
      });
      fileStream.on('error', (err) => {
        controller.error(err);
        fs.promises.rm(dirToCleanup, { recursive: true, force: true }).catch(() => { });
      });
    },
    cancel() {
      fileStream.destroy();
      fs.promises.rm(dirToCleanup, { recursive: true, force: true }).catch(() => { });
    },
  });

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Disposition': contentDispositionHeader,
      'Content-Length': String(stat.size),
      'Access-Control-Expose-Headers': 'Content-Disposition',
    },
  });
}

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
  let tempDir: string | null = null;

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

    if (source === 'native') {
      if (!isHlsStream) {
        const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
        // Native Direct MP4 Download (e.g. DramaBox direct .mp4 URL)
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

        const safeHeaderFileName = fileName.replace(/"/g, '');
        const encodedFileName = encodeURIComponent(fileName);
        const contentDispositionHeader = `attachment; filename="${safeHeaderFileName}"; filename*=UTF-8''${encodedFileName}`;

        return new NextResponse(response.body as unknown as ReadableStream, {
          status: 200,
          headers: {
            'Content-Type': 'video/mp4',
            'Content-Disposition': contentDispositionHeader,
            'Access-Control-Expose-Headers': 'Content-Disposition',
          },
        });
      } else {
        // Native HLS Stream Download (e.g. ReelShort .m3u8 URL)
        tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'downloader-'));
        const outputFilePath = path.join(tempDir, fileName);

        // Process HLS manifest stream into playable MP4
        await remuxHlsToMp4(trimmedStreamUrl, outputFilePath);

        const currentTempDir = tempDir;
        tempDir = null; // Ownership transferred to stream cleanup
        return streamFileResponse(outputFilePath, currentTempDir, fileName);
      }
    } else {
      // Generated Download Variants (360p, 480p, 1080p)
      tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'downloader-'));
      const outputFilePath = path.join(tempDir, `output_${quality}.mp4`);

      // Determine variant dimensions
      const sourceW = video.width || 720;
      const sourceH = video.height || 1280;
      const targetDims = calculateVariantDimensions(sourceW, sourceH, quality);

      // Transcode variant directly from stream URL via FFmpeg
      await generateVideoVariant({
        inputPath: trimmedStreamUrl,
        outputPath: outputFilePath,
        targetWidth: targetDims.width,
        targetHeight: targetDims.height,
      });

      const currentTempDir = tempDir;
      tempDir = null; // Ownership transferred to stream cleanup
      return streamFileResponse(outputFilePath, currentTempDir, fileName);
    }
  } catch (error: unknown) {
    console.error('[Download API Error]:', error);

    // Cleanup temp files if error occurred
    if (tempDir) {
      await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => { });
    }

    return NextResponse.json(
      {
        success: false,
        error: "The download couldn't be completed. Please try again.",
      },
      { status: 500 }
    );
  }
}
