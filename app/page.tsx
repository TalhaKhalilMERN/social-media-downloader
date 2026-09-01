import UrlAnalyzer from '@/components/UrlAnalyzer';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-4 md:p-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[400px] bg-gradient-to-b from-violet-900/15 via-purple-900/10 to-transparent pointer-events-none blur-3xl -z-10" />
      <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Hero Header */}
      <header className="w-full max-w-3xl text-center pt-8 pb-6 space-y-3">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300">
          ReelShort & DramaBox Downloader
        </h1>

        <p className="text-slate-400 text-sm md:text-base max-w-md mx-auto leading-relaxed">
          Save episode videos in high quality with a single link.
        </p>

        {/* Platform Support Pills */}
        <div className="pt-1 flex items-center justify-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 font-medium text-slate-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            ReelShort
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 font-medium text-slate-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            DramaBox
          </span>
        </div>
      </header>

      {/* Main Downloader Section */}
      <section className="w-full flex-1 flex flex-col items-center justify-start pb-12">
        <UrlAnalyzer />
      </section>

      {/* Clean Footer */}
      <footer className="w-full max-w-4xl text-center py-6 text-xs text-slate-500 border-t border-slate-900">
        <p>ReelShort & DramaBox Downloader &bull; Built with Next.js</p>
      </footer>
    </main>
  );
}
