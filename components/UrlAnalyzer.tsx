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
  Clipboard, 
  XCircle,
  FileVideo,
  Download
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

    const validation = validateSupportedUrl(url);
    if (!validation.isValid) {
      setError(validation.error || 'Unsupported website. Please enter a valid ReelShort or DramaBox URL.');
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
        setError(data.error || 'Unable to analyze video. Please check the URL and try again.');
      } else {
        setResult(data);
      }
    } catch (err: unknown) {
      console.error('Fetch error:', err);
      setError('Network error occurred. Please check your connection and try again.');
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

    const videoTitle = result?.video?.title;
    const sanitizedTitle = videoTitle
      ? videoTitle.replace(/[\\/:\*\?"<>\|]/g, '').replace(/\s+/g, ' ').trim()
      : currentPlatform || 'video';
    const fallbackFileName = `${sanitizedTitle} - ${fmt.quality}.mp4`;

    // PATH A: Native Direct MP4 (e.g. DramaBox direct .mp4 URL)
    if (currentPlatform === 'dramabox' && fmt.source === 'native') {
      try {
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = downloadApiUrl;
        link.download = fallbackFileName;
        document.body.appendChild(link);
        link.click();

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
          message: 'Unable to initiate download. Please try again.',
        });
        setDownloadingFormatId(null);
      }
      return;
    }

    // PATH B & PATH C: ReelShort HLS Remux or Generated Variants
    try {
      const response = await fetch(downloadApiUrl);

      if (!response.ok) {
        let errorMsg = 'Unable to process download. Please try again.';
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

      let fileName = fallbackFileName;
      const disposition = response.headers.get('Content-Disposition');
      if (disposition) {
        const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
        if (utf8Match && utf8Match[1]) {
          try {
            fileName = decodeURIComponent(utf8Match[1]);
          } catch {
            fileName = utf8Match[1];
          }
        } else {
          const match = disposition.match(/filename="?([^";]+)"?/i);
          if (match && match[1]) {
            fileName = match[1];
          }
        }
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();

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

  const getStatusText = (platform?: PlatformType, fmt?: NormalizedFormat | null): string => {
    if (!fmt) return 'Preparing download...';
    if (fmt.source === 'generated') {
      return `Generating ${fmt.quality}...`;
    }
    if (platform === 'reelshort') {
      return `Preparing ${fmt.quality} download...`;
    }
    return 'Preparing download...';
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Input Form Card */}
      <div className="relative rounded-2xl bg-slate-900/80 border border-slate-800 p-5 md:p-6 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:border-slate-700">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative flex items-center">
            <input
              id="video-url-input"
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Paste ReelShort or DramaBox episode URL..."
              disabled={loading}
              className="w-full pl-4 pr-24 py-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all text-sm disabled:opacity-50"
            />

            <div className="absolute right-3 flex items-center gap-1">
              {url && !loading && (
                <button
                  type="button"
                  onClick={handleClear}
                  title="Clear input"
                  className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
              {!url && !loading && (
                <button
                  type="button"
                  onClick={handlePaste}
                  title="Paste from clipboard"
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors font-medium cursor-pointer"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  Paste
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              id="analyze-submit-btn"
              type="submit"
              disabled={loading || !url.trim()}
              className="w-full md:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-md shadow-violet-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Analyze URL
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Concise Error Alert */}
      {error && (
        <div className="rounded-xl bg-red-950/40 border border-red-900/60 p-4 text-red-200 flex items-center gap-3 shadow-md animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="rounded-2xl bg-slate-900/40 border border-slate-800 p-6 space-y-4 backdrop-blur-md animate-pulse">
          <div className="flex flex-col md:flex-row gap-5 items-start">
            <div className="w-full md:w-60 h-32 rounded-xl bg-slate-800" />
            <div className="space-y-3 flex-1 w-full">
              <div className="h-5 bg-slate-800 rounded w-3/4" />
              <div className="h-4 bg-slate-800/60 rounded w-1/2" />
              <div className="h-4 bg-slate-800/40 rounded w-1/3" />
            </div>
          </div>
        </div>
      )}

      {/* Analysis Results Container */}
      {result && result.video && (
        <div className="space-y-6 animate-fadeIn">
          {/* Metadata Card */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 md:p-6 backdrop-blur-xl shadow-xl space-y-5 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3.5 flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                Analysis Complete
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 font-medium capitalize flex items-center gap-1">
                <Globe className="w-3 h-3" />
                {result.platform || result.video.platform}
              </span>
            </div>

            <div className="flex flex-col md:flex-row gap-5 min-w-0">
              {result.video.thumbnail ? (
                <div className="relative w-full md:w-64 aspect-video md:aspect-auto md:h-36 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.video.thumbnail}
                    alt={result.video.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {result.video.duration && (
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-950/90 text-[11px] font-mono text-slate-200 border border-slate-800 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {formatDuration(result.video.duration)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full md:w-64 h-36 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-slate-500 shrink-0 gap-1.5">
                  <Film className="w-7 h-7 text-slate-600" />
                  <span className="text-xs">No preview thumbnail</span>
                </div>
              )}

              <div className="space-y-3 flex-1 min-w-0">
                <div className="min-w-0">
                  <h3 className="text-base md:text-lg font-bold text-slate-100 leading-snug break-words">
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

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[11px] text-slate-400 block mb-0.5">Duration</span>
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-violet-400" />
                      {formatDuration(result.video.duration)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[11px] text-slate-400 block mb-0.5">Resolution</span>
                    <span className="text-xs font-semibold text-slate-200 font-mono">
                      {result.video.width && result.video.height
                        ? `${result.video.width} × ${result.video.height}`
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Formats Section */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 md:p-6 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <FileVideo className="w-4 h-4 text-violet-400" />
                Available Qualities
              </h4>
            </div>

            {result.formats && result.formats.length > 0 ? (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-5">Quality</th>
                        <th className="py-3 px-5 text-center">Resolution</th>
                        <th className="py-3 px-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                      {result.formats.map((fmt: NormalizedFormat, idx: number) => {
                        const isDownloadingThis = downloadingFormatId === fmt.id;

                        return (
                          <tr key={`${fmt.id}-${idx}`} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-5 font-bold text-slate-100">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                  {fmt.quality}
                                </span>
                                {fmt.source === 'native' ? (
                                  <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                                    Original
                                  </span>
                                ) : (
                                  <span className="text-[10px] uppercase font-medium text-slate-400 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded">
                                    Generated
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-5 text-slate-300 font-mono text-xs text-center">
                              {fmt.resolution}
                            </td>
                            <td className="py-3 px-5 text-right">
                              <button
                                type="button"
                                disabled={!!downloadingFormatId}
                                onClick={() => handleDownloadClick(fmt)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

                {/* Status Indicator */}
                {downloadingFormatId && (
                  <div className="rounded-xl bg-slate-950/90 border border-violet-500/30 p-3.5 text-slate-200 flex items-center gap-3 shadow-md animate-fadeIn">
                    <Loader2 className="w-4 h-4 animate-spin text-violet-400 shrink-0" />
                    <span className="text-xs font-medium text-slate-300">
                      {getStatusText(currentPlatform, activeFmt)}
                    </span>
                  </div>
                )}

                {/* Download Error Alert */}
                {downloadError && (
                  <div className="rounded-xl bg-red-950/40 border border-red-900/60 p-3.5 text-red-200 flex items-center gap-3 shadow-md animate-fadeIn">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span className="text-xs text-red-300 flex-1">{downloadError.message}</span>
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
              <div className="p-6 text-center text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800 text-xs">
                No video formats detected for this URL.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
