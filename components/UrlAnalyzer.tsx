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
  Monitor,
  Layers
} from 'lucide-react';
import { AnalyzeResponse, NormalizedFormat } from '@/types/video';

export default function UrlAnalyzer() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        setError(null);
      }
    } catch (err) {
      // Clipboard access denied or unsupported
    }
  };

  const handleClear = () => {
    setUrl('');
    setError(null);
    setResult(null);
  };

  const validateInput = (inputUrl: string): string | null => {
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      return 'Please enter or paste a video URL.';
    }
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return 'URL must start with http:// or https://';
      }
    } catch (e) {
      return 'Please enter a syntactically valid URL (e.g. https://example.com/video).';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateInput(url);
    if (validationError) {
      setError(validationError);
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

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
        setError(data.error || 'Failed to analyze video. Please try again.');
      } else {
        setResult(data);
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError('Network connection error or server unreachable.');
    } finally {
      setLoading(false);
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

  const formatFileSize = (bytes?: number | null) => {
    if (bytes === undefined || bytes === null) return 'N/A';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Input Card */}
      <div className="relative rounded-2xl bg-slate-900/80 border border-slate-800 p-6 md:p-8 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:border-slate-700">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col space-y-2">
            <label htmlFor="video-url-input" className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              Target Video URL
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
                placeholder="Paste video link here (e.g. https://www.dramabox.com/...)"
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
            <h4 className="font-semibold text-red-300 text-sm">Analysis Failed</h4>
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
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                Analysis Complete
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 font-medium flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                Source: {result.video.extractor}
              </span>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              {result.video.thumbnail ? (
                <div className="relative w-full md:w-72 aspect-video md:aspect-auto md:h-44 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0 group">
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

              <div className="space-y-4 flex-1">
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-slate-100 leading-snug">
                    {result.video.title}
                  </h3>
                  <a
                    href={result.video.webpageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors truncate block mt-1 hover:underline"
                  >
                    {result.video.webpageUrl}
                  </a>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
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
                      <Monitor className="w-4 h-4 text-indigo-400" />
                      {result.video.width && result.video.height
                        ? `${result.video.width}×${result.video.height}`
                        : 'N/A'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-xs text-slate-400 block mb-0.5">Detected Formats</span>
                    <span className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-purple-400" />
                      {result.formats ? result.formats.length : 0} Streams
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Formats Card */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileVideo className="w-5 h-5 text-violet-400" />
                Available Stream Formats
              </h4>
              <span className="text-xs text-slate-400">
                Detected via yt-dlp
              </span>
            </div>

            {result.formats && result.formats.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Quality</th>
                      <th className="py-3.5 px-4">Resolution</th>
                      <th className="py-3.5 px-4">Container</th>
                      <th className="py-3.5 px-4">Codecs (V / A)</th>
                      <th className="py-3.5 px-4">Protocol</th>
                      <th className="py-3.5 px-4 text-right">Estimated Size</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                    {result.formats.map((fmt: NormalizedFormat, idx: number) => (
                      <tr key={`${fmt.formatId}-${idx}`} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-100">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                            {fmt.resolution}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 font-mono text-xs">
                          {fmt.width && fmt.height ? `${fmt.width}×${fmt.height}` : 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 uppercase font-semibold text-xs text-slate-400">
                          {fmt.extension}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono text-slate-400 truncate max-w-[180px]" title={`${fmt.videoCodec} / ${fmt.audioCodec}`}>
                          {fmt.videoCodec} / {fmt.audioCodec}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-400 font-mono">
                          {fmt.protocol}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-300">
                          {formatFileSize(fmt.filesize)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800 text-sm">
                No individual stream formats detected for this video.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
