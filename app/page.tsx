import UrlAnalyzer from '@/components/UrlAnalyzer';
import { Film, CheckCircle, AlertTriangle } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-4 md:p-8 relative overflow-hidden">
      {/* Dynamic Background Glow Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-violet-900/20 via-purple-900/10 to-transparent pointer-events-none blur-3xl -z-10" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header Container */}
      <header className="w-full max-w-4xl text-center pt-10 pb-8 space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs md:text-sm font-medium mb-2">
          <Film className="w-4 h-4 text-violet-400" />
          <span>Specialized Video Metadata Discovery</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
          ReelShort & DramaBox Downloader
        </h1>

        <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
          Download videos from supported ReelShort and DramaBox episode pages.
        </p>

        {/* Platform Support Info Card */}
        <div className="pt-2 max-w-xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-center gap-2 text-xs md:text-sm font-semibold text-slate-200">
            <span className="text-slate-400 font-normal">Supported platforms:</span>
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" /> ReelShort
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" /> DramaBox
            </span>
          </div>
        </div>

        {/* Small Notice */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-amber-400/90 font-medium">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Only ReelShort and DramaBox URLs are currently supported.</span>
        </div>
      </header>

      {/* Main Analyzer Tool */}
      <section className="w-full flex-1 flex flex-col items-center justify-start pb-16">
        <UrlAnalyzer />
      </section>

      {/* Simple Footer */}
      <footer className="w-full max-w-4xl text-center py-6 text-xs text-slate-500 border-t border-slate-900">
        <p>ReelShort & DramaBox Downloader &bull; Built with Next.js</p>
      </footer>
    </main>
  );
}
