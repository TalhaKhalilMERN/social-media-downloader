'use client';

import React, { useState } from 'react';
import { 
  Search, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Film, 
  Clock, 
  Globe, 
  Sparkles, 
  Clipboard, 
  XCircle,
  FileVideo,
  Download,
  Info
} from 'lucide-react';
import { AnalyzeResponse, NormalizedFormat, PlatformType } from '@/types/video';
import { validateSupportedUrl } from '@/lib/url-validator';

export default function UrlAnalyzer() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [downloadingFormatId, setDownloadingFormatId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<{ formatId: string; message: string } | null>(null);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        setError(null);
      }
    } catch {
      // Clipboard access denied or unsupported
    }
  };

  const handleClear = () => {
    setUrl('');
    setError(null);
    setResult(null);
    setDownloadError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Step 1: Client-side domain validation
    const validation = validateSupportedUrl(url);
    if (!validation.isValid) {
      setError(validation.error || 'Unsupported website. This downloader currently supports ReelShort and DramaBox only.');
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setDownloadError(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data: AnalyzeResponse = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to analyze video. Please check the URL and try again.');
      } else {
        setResult(data);
      }
    } catch (err: unknown) {
      console.error('Fetch error:', err);
      setError('Network connection error or server unreachable.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadClick = async (fmt: NormalizedFormat) => {
    if (!url.trim() || downloadingFormatId) return;

    setDownloadingFormatId(fmt.id);
    setDownloadError(null);

    const downloadApiUrl = `/api/download?url=${encodeURIComponent(url.trim())}&quality=${encodeURIComponent(fmt.quality)}&source=${encodeURIComponent(fmt.source)}`;
    const currentPlatform = result?.platform || result?.video?.platform;

    // PATH A: Native Direct MP4 (e.g. DramaBox direct .mp4 URL)
    // Uses direct download anchor trigger for progressive browser downloading without JS Blob memory buffering
    if (currentPlatform === 'dramabox' && fmt.source === 'native') {
      try {
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = downloadApiUrl;
        link.download = `${currentPlatform}-${fmt.quality}.mp4`;
        document.body.appendChild(link);
        link.click();

        // Keep loading state active while server resolves stream (~5s), then clear
        setTimeout(() => {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
          setDownloadingFormatId(null);
        }, 6000);
      } catch (err) {
        console.error('Direct download trigger error:', err);
        setDownloadError({
          formatId: fmt.id,
          message: 'Could not initiate direct download. Please try again.',
        });
        setDownloadingFormatId(null);
      }
      return;
    }

    // PATH B & PATH C: ReelShort HLS Remux or Generated Variants (360p, 480p, 1080p)
    // Server processes video into temporary file, frontend receives and triggers download
    try {
      const response = await fetch(downloadApiUrl);

      if (!response.ok) {
        let errorMsg = 'The download couldn\'t be completed. Please try again.';
        try {
          const errorJson = await response.json();
          if (errorJson?.error) {
            errorMsg = errorJson.error;
          }
        } catch {
          // Fallback if response is not JSON
        }
        setDownloadError({ formatId: fmt.id, message: errorMsg });
        return;
      }

      // Parse filename from Content-Disposition header if available
      let fileName = `${currentPlatform || 'video'}-${fmt.quality}.mp4`;
      const disposition = response.headers.get('Content-Disposition');
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) {
          fileName = match[1];
        }
      }

      // Read response as Blob for generated/remuxed file delivery
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      // Create hidden element to trigger browser attachment save without navigating away
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();

      // Cleanup DOM node and blob URL
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: unknown) {
      console.error('Download preparation error:', err);
      setDownloadError({
        formatId: fmt.id,
        message: 'Network error occurred while preparing download. Please try again.',
      });
    } finally {
      setDownloadingFormatId(null);
    }
  };

  const formatDuration = (seconds?: number | null) => {
    if (seconds === undefined || seconds === null) return 'N/A';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    }
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const activeFmt = result?.formats?.find((f) => f.id === downloadingFormatId) || null;
  const currentPlatform = result?.platform || result?.video?.platform;

  const getStatusTitle = (platform?: PlatformType, fmt?: NormalizedFormat | null): string => {
    if (!fmt) return 'Preparing download...';
    if (fmt.source === 'generated') {
      return `Generating ${fmt.quality} download...`;
    }
    if (platform === 'reelshort') {
      return `Preparing ${fmt.quality} download...`;
    }
    return 'Preparing download...';
  };

  const getStatusSubtitle = (platform?: PlatformType, fmt?: NormalizedFormat | null): string => {
    if (!fmt) return 'Please wait while your download is prepared.';
    if (fmt.source === 'generated') {
      return 'This may take 15–20 seconds depending on the video size.';
    }
    if (platform === 'reelshort') {
      return 'This may take a few moments while the video is prepared.';
    }
    return 'Initiating direct stream download.';
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Input Card */}
      <div className="relative rounded-2xl bg-slate-900/80 border border-slate-800 p-6 md:p-8 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:border-slate-700">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col space-y-2">
            <label htmlFor="video-url-input" className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              ReelShort or DramaBox Video URL
            </label>

            <div className="relative flex items-center">
              <input
                id="video-url-input"
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Paste a ReelShort or DramaBox episode URL..."
                disabled={loading}
                className="w-full pl-4 pr-24 py-4 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all text-sm md:text-base disabled:opacity-50"
              />

              <div className="absolute right-3 flex items-center gap-1">
                {url && !loading && (
                  <button
                    type="button"
                    onClick={handleClear}
                    title="Clear input"
                    className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                )}
                {!url && !loading && (
                  <button
                    type="button"
                    onClick={handlePaste}
                    title="Paste from clipboard"
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors font-medium"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    Paste
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              id="analyze-submit-btn"
              type="submit"
              disabled={loading || !url.trim()}
              className="w-full md:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm md:text-base shadow-lg shadow-violet-600/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing Video...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Analyze URL
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-xl bg-red-950/40 border border-red-900/60 p-4 md:p-5 text-red-200 flex items-start gap-3 shadow-lg animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold text-red-300 text-sm">Validation Error</h4>
            <p className="text-sm text-red-300/80">{error}</p>
          </div>
        </div>
      )}

      {/* Loading Skeleton Card */}
      {loading && (
        <div className="rounded-2xl bg-slate-900/40 border border-slate-800 p-6 md:p-8 space-y-6 backdrop-blur-md animate-pulse">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-full md:w-64 h-36 rounded-xl bg-slate-800" />
            <div className="space-y-3 flex-1 w-full">
              <div className="h-6 bg-slate-800 rounded w-3/4" />
              <div className="h-4 bg-slate-800/60 rounded w-1/2" />
              <div className="h-4 bg-slate-800/40 rounded w-1/3" />
            </div>
          </div>
        </div>
      )}

      {/* Analysis Result Container */}
      {result && result.video && (
        <div className="space-y-6 animate-fadeIn">
          {/* Metadata Header Card */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-6 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                Analysis Complete
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 font-medium flex items-center gap-1.5 capitalize">
                <Globe className="w-3.5 h-3.5" />
                Platform: {result.platform || result.video.platform}
              </span>
            </div>

            <div className="flex flex-col md:flex-row gap-6 min-w-0">
              {result.video.thumbnail ? (
                <div className="relative w-full md:w-72 aspect-video md:aspect-auto md:h-44 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.video.thumbnail}
                    alt={result.video.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {result.video.duration && (
                    <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-md bg-slate-950/90 text-xs font-mono text-slate-200 border border-slate-800 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {formatDuration(result.video.duration)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full md:w-72 h-44 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-slate-500 shrink-0 gap-2">
                  <Film className="w-8 h-8 text-slate-600" />
                  <span className="text-xs">No preview thumbnail</span>
                </div>
              )}

              <div className="space-y-4 flex-1 min-w-0">
                <div className="min-w-0">
                  <h3 className="text-lg md:text-xl font-bold text-slate-100 leading-snug break-words">
                    {result.video.title}
                  </h3>
                  <a
                    href={result.video.webpageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors truncate block mt-1 hover:underline max-w-full"
                    title={result.video.webpageUrl}
                  >
                    {result.video.webpageUrl}
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-xs text-slate-400 block mb-0.5">Duration</span>
                    <span className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-violet-400" />
                      {formatDuration(result.video.duration)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-xs text-slate-400 block mb-0.5">Source Dimension</span>
                    <span className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                      {result.video.width && result.video.height
                        ? `${result.video.width} × ${result.video.height}`
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Formats Card */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileVideo className="w-5 h-5 text-violet-400" />
                Available Qualities
              </h4>
              <span className="text-xs text-slate-400">
                Native & Generated Options
              </span>
            </div>

            {/* Generated Quality Notice Banner */}
            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-4 text-slate-300 text-xs flex items-start gap-3">
              <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold text-slate-200 block">Generated quality</span>
                <p className="text-slate-400 leading-relaxed">
                  360p, 480p, and 1080p versions are generated from the original video and may take a little longer to prepare before download.
                </p>
              </div>
            </div>

            {result.formats && result.formats.length > 0 ? (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3.5 px-6  text-center">Quality</th>
                        <th className="py-3.5 px-6  text-center">Resolution</th>
                        {/* <th className="py-3.5 px-6">Approx. Size</th> */}
                        <th className="py-3.5 px-6 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                      {result.formats.map((fmt: NormalizedFormat, idx: number) => {
                        const isDownloadingThis = downloadingFormatId === fmt.id;

                        return (
                          <tr key={`${fmt.id}-${idx}`} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-4 px-6 font-bold text-slate-100 text-center">
                              <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                {fmt.quality}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-slate-300 font-mono text-xs text-center">
                              {fmt.resolution}
                            </td>
                            {/* <td className="py-4 px-6 font-mono text-xs text-slate-300">
                              {fmt.filesizeDisplay}
                            </td> */}
                            <td className="py-4 px-6 text-center">
                              <button
                                type="button"
                                disabled={!!downloadingFormatId}
                                onClick={() => handleDownloadClick(fmt)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isDownloadingThis ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-200" />
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <Download className="w-3.5 h-3.5" />
                                    Download
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Status Indicator Banner Below Table */}
                {downloadingFormatId && (
                  <div className="rounded-xl bg-slate-950/80 border border-violet-500/30 p-5 text-slate-200 flex items-start gap-4 shadow-xl animate-fadeIn">
                    <div className="p-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 shrink-0 mt-0.5">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <h5 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                        {getStatusTitle(currentPlatform, activeFmt)}
                      </h5>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {getStatusSubtitle(currentPlatform, activeFmt)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Error Banner Below Table */}
                {downloadError && (
                  <div className="rounded-xl bg-red-950/40 border border-red-900/60 p-4 text-red-200 flex items-start gap-3 shadow-lg animate-fadeIn">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 flex-1">
                      <h5 className="font-semibold text-red-300 text-sm">Download Error</h5>
                      <p className="text-xs text-red-300/80">{downloadError.message}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDownloadError(null)}
                      className="text-red-400 hover:text-red-200 transition-colors p-1 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800 text-sm">
                No video formats detected for this URL.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
