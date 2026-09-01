import { NextRequest, NextResponse } from 'next/server';
import { analyzeVideoUrl } from '@/lib/yt-dlp';
import { validateSupportedUrl } from '@/lib/url-validator';
import { AnalyzeResponse } from '@/types/video';

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeResponse>> {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid JSON request payload.',
      },
      { status: 400 }
    );
  }

  const { url } = body || {};

  // Step 1: Server-side URL Validation
  const validation = validateSupportedUrl(url || '');
  if (!validation.isValid) {
    return NextResponse.json(
      {
        success: false,
        error: validation.error || 'Unsupported website. This downloader currently supports ReelShort and DramaBox only.',
      },
      { status: 400 }
    );
  }

  try {
    const { platform, video, formats } = await analyzeVideoUrl(validation.normalizedUrl || url || '');

    return NextResponse.json({
      success: true,
      platform,
      video,
      formats,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    const errorMessage = err?.message || 'Unknown extraction error';
    console.error(`[API /api/analyze Error] URL: ${url} - ${errorMessage}`);

    if (errorMessage.includes('timed out')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Analysis request timed out. Please try again.',
        },
        { status: 504 }
      );
    }

    if (errorMessage.includes('executable could not be found')) {
      return NextResponse.json(
        {
          success: false,
          error: 'yt-dlp is not installed or available on the server.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage.includes('Unsupported')
          ? errorMessage
          : 'Could not extract video metadata. Please verify that the URL is a valid, publicly accessible episode page.',
      },
      { status: 422 }
    );
  }
}
