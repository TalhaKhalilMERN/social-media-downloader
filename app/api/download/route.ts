import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { validateSupportedUrl } from '@/lib/url-validator';
import { analyzeVideoUrl } from '@/lib/yt-dlp';
import { calculateVariantDimensions, TargetQuality } from '@/lib/quality';
import { generateVideoVariant } from '@/lib/ffmpeg';
import { getYtDlpPath } from '@/lib/binaries';
import { execFile } from 'child_process';
import { promisify } from 'util';

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
  const fileName = `${platform}-${quality}.mp4`;

  let tempDir: string | null = null;

  try {
    // Step 2: Analyze metadata
    const { video } = await analyzeVideoUrl(validation.normalizedUrl);

    // Step 3: Get direct media stream URL using yt-dlp -g
    const ytDlpPath = getYtDlpPath();
    const { stdout: directStreamUrl } = await execFileAsync(
      ytDlpPath,
      ['-g', '-f', 'b/best', '--no-warnings', validation.normalizedUrl],
      { timeout: 30000 }
    );

    const trimmedStreamUrl = directStreamUrl.trim().split('\n')[0];
    if (!trimmedStreamUrl) {
      throw new Error('Could not retrieve direct media stream URL.');
    }

    if (source === 'native') {
      // Native download: Stream direct video to browser
      const response = await fetch(trimmedStreamUrl);
      if (!response.ok || !response.body) {
        throw new Error('Failed to fetch native media stream.');
      }

      return new NextResponse(response.body as unknown as ReadableStream, {
        status: 200,
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      });
    } else {
      // Generated download: FFmpeg temporary video variant processing
      tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'downloader-'));
      const inputFilePath = path.join(tempDir, 'input_source.mp4');
      const outputFilePath = path.join(tempDir, `output_${quality}.mp4`);

      // Download source video to temporary input file
      const sourceRes = await fetch(trimmedStreamUrl);
      if (!sourceRes.ok || !sourceRes.body) {
        throw new Error('Failed to download source stream for transcoding.');
      }

      const buffer = Buffer.from(await sourceRes.arrayBuffer());
      await fs.promises.writeFile(inputFilePath, buffer);

      // Determine variant dimensions
      const sourceW = video.width || 720;
      const sourceH = video.height || 1280;
      const targetDims = calculateVariantDimensions(sourceW, sourceH, quality);

      // Transcode variant via FFmpeg
      await generateVideoVariant({
        inputPath: inputFilePath,
        outputPath: outputFilePath,
        targetWidth: targetDims.width,
        targetHeight: targetDims.height,
      });

      const generatedBuffer = await fs.promises.readFile(outputFilePath);

      // Asynchronous temp file cleanup
      await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      tempDir = null;

      return new NextResponse(generatedBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Content-Length': String(generatedBuffer.byteLength),
        },
      });
    }
  } catch (error: unknown) {
    console.error('[Download API Error]:', error);

    // Cleanup temp files if error occurred
    if (tempDir) {
      await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
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
