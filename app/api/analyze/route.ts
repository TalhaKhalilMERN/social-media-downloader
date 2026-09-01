import { NextRequest, NextResponse } from 'next/server';
import { analyzeVideoUrl } from '@/lib/yt-dlp';
import { AnalyzeResponse } from '@/types/video';

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeResponse>> {
  let body: any;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid JSON request payload.',
      },
      { status: 400 }
    );
  }

  const { url } = body || {};

  if (!url || typeof url !== 'string' || !url.trim()) {
    return NextResponse.json(
      {
        success: false,
        error: 'A target URL is required.',
      },
      { status: 400 }
    );
  }

  const trimmedUrl = url.trim();

  // Syntactical URL validation
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmedUrl);
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: 'The provided URL is syntactically invalid.',
      },
      { status: 400 }
    );
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return NextResponse.json(
      {
        success: false,
        error: 'Only HTTP and HTTPS URLs are supported.',
      },
      { status: 400 }
    );
  }

  try {
    const { video, formats } = await analyzeVideoUrl(trimmedUrl);

    return NextResponse.json({
      success: true,
      video,
      formats,
    });
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown analysis error';
    console.error(`[API /api/analyze Error] URL: ${trimmedUrl} - ${errorMessage}`);

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

    if (errorMessage.includes('process failed') || errorMessage.includes('Unsupported')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Could not extract video metadata. Please check if the URL is accessible and contains valid video content.',
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected server error occurred during video analysis.',
      },
      { status: 500 }
    );
  }
}
