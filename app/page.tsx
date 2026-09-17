import Image from 'next/image';
import UrlAnalyzer from '@/components/UrlAnalyzer';
import Navbar from '@/components/Navbar';
import FaqSection from '@/components/FaqSection';
import {
  Link2,
  ScanSearch,
  Download,
  Zap,
  Smartphone,
  Layers,
  ShieldCheck,
  MonitorPlay,
  Copyright,
} from 'lucide-react';

/* ─────────────────────────────────────────
   Static section data
───────────────────────────────────────── */

const PLATFORMS = [
  {
    name: 'ReelShort',
    domain: 'reelshort.com',
    status: 'Supported',
    description: 'Short-form drama & romance episodes',
    color: '#8b5cf6',
  },
  {
    name: 'DramaBox',
    domain: 'dramaboxdb.com',
    status: 'Supported',
    description: 'Short drama series & episodes',
    color: '#06b6d4',
  },
];

const STEPS = [
  {
    number: '01',
    icon: Link2,
    title: 'Paste the URL',
    description:
      'Copy the episode URL from your browser and paste it into the input field above.',
  },
  {
    number: '02',
    icon: ScanSearch,
    title: 'Analyze the Video',
    description:
      'We analyze the URL and extract available video qualities and metadata.',
  },
  {
    number: '03',
    icon: Download,
    title: 'Download',
    description:
      'Pick your preferred quality and download the video directly to your device.',
  },
];

const FEATURES = [
  {
    icon: Link2,
    title: 'URL-Based',
    description:
      'No browser extension, no app. Just paste a supported episode URL and go.',
  },
  {
    icon: Layers,
    title: 'Multiple Qualities',
    description:
      'Choose between native original quality or generated variants (360p, 480p, 1080p).',
  },
  {
    icon: Zap,
    title: 'Progressive Streaming',
    description:
      'Downloads begin streaming to your browser immediately — no waiting for the full file.',
  },
  {
    icon: Smartphone,
    title: 'Mobile Friendly',
    description:
      'Fully responsive interface that works across desktop, tablet, and mobile browsers.',
  },
  {
    icon: ShieldCheck,
    title: 'No Account Required',
    description:
      'No sign-up, no login, no tracking. Paste a URL and download — that is it.',
  },
  {
    icon: MonitorPlay,
    title: 'Metadata Preview',
    description:
      'See video title, thumbnail, duration, and resolution before downloading.',
  },
];

/* ─────────────────────────────────────────
   Page component
───────────────────────────────────────── */

export default function Home() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      {/* ── Navbar ── */}
      <Navbar />

      <main className="flex-1 flex flex-col items-center w-full">

        {/* ────────────────────────────────────────
            HERO
        ──────────────────────────────────────── */}
        <section
          id="downloader"
          className="relative w-full flex flex-col items-center pt-16 pb-20 px-4 overflow-hidden"
        >
          {/* Background glows */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-80 pointer-events-none -z-10 animate-pulse-glow"
            style={{
              background:
                'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.18) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute top-1/3 left-1/4 w-72 h-72 rounded-full pointer-events-none -z-10 blur-3xl animate-pulse-glow"
            style={{ background: 'rgba(99,102,241,0.06)' }}
          />

          {/* Platform pills */}
          {/* <div className="flex items-center gap-2 mb-6">
            {PLATFORMS.map((p) => (
              <span
                key={p.name}
                className="text-[11px] font-semibold px-3 py-1 rounded-full flex items-center gap-1.5"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: p.color }}
                />
                {p.name}
              </span>
            ))}
          </div> */}

          {/* Headline */}
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-center max-w-2xl leading-tight mb-4"
            style={{ color: 'var(--text-primary)' }}
          >
            Download ReelShort &amp;{' '}
            <span style={{ color: 'var(--accent)' }}>DramaBox</span>{' '}
            Videos Instantly
          </h1>

          <p
            className="text-sm md:text-base text-center max-w-lg mb-10 leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            Paste any episode URL, pick your quality, and save the video directly to your device — no extensions, no sign-up.
          </p>

          {/* Downloader */}
          <div className="w-full max-w-3xl">
            <UrlAnalyzer />
          </div>

          {/* Trust line */}
          <p
            className="mt-6 text-xs text-center flex flex-wrap items-center justify-center gap-3"
            style={{ color: 'var(--text-muted)' }}
          >
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              No sign-up required
            </span>
            <span className="w-px h-3 bg-current opacity-30" />
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
              Progressive streaming
            </span>
            <span className="w-px h-3 bg-current opacity-30" />
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              Multiple qualities
            </span>
          </p>
        </section>

        {/* ────────────────────────────────────────
            PLATFORMS
        ──────────────────────────────────────── */}
        <section
          id="platforms"
          className="w-full max-w-5xl px-4 py-16 md:py-20 mx-auto"
        >
          <div className="text-center mb-10">
            <h2
              className="text-2xl md:text-3xl font-bold tracking-tight mb-3"
              style={{ color: 'var(--text-primary)' }}
            >
              Supported Platforms
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              We support the following video platforms.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {PLATFORMS.map((p) => (
              <div
                key={p.name}
                className="rounded-2xl p-6 flex items-start gap-4 transition-all duration-200 hover:scale-[1.01]"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                {/* Platform icon circle */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white text-sm font-extrabold"
                  style={{ background: p.color }}
                >
                  {p.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className="font-bold text-sm"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {p.name}
                    </span>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: 'var(--emerald-subtle)',
                        border: '1px solid var(--emerald-border)',
                        color: '#10b981',
                      }}
                    >
                      {p.status}
                    </span>
                  </div>
                  <p
                    className="text-xs leading-snug"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {p.description}
                  </p>
                  <p
                    className="text-[10px] mt-1 font-mono"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {p.domain}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ────────────────────────────────────────
            HOW IT WORKS
        ──────────────────────────────────────── */}
        <section
          id="how-it-works"
          className="w-full px-4 py-16 md:py-20"
          style={{ background: 'var(--bg-surface)' }}
        >
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2
                className="text-2xl md:text-3xl font-bold tracking-tight mb-3"
                style={{ color: 'var(--text-primary)' }}
              >
                How It Works
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Three simple steps to download any supported episode.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={i} className="relative flex flex-col items-center text-center gap-4 px-4">
                    {/* Connector line (between cards on md+) */}
                    {i < STEPS.length - 1 && (
                      <div
                        className="hidden md:block absolute top-8 left-[calc(50%+2.5rem)] w-[calc(100%-5rem)] h-px"
                        style={{ background: 'var(--border)' }}
                      />
                    )}
                    {/* Step number + icon */}
                    <div className="relative">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center"
                        style={{
                          background: 'var(--accent-subtle)',
                          border: '1px solid var(--accent-border)',
                        }}
                      >
                        <Icon className="w-7 h-7" style={{ color: 'var(--accent)' }} />
                      </div>
                      <span
                        className="absolute -top-2 -right-2 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center"
                        style={{
                          background: 'var(--accent)',
                          color: '#fff',
                        }}
                      >
                        {i + 1}
                      </span>
                    </div>
                    <div>
                      <h3
                        className="font-bold text-sm mb-1.5"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {step.title}
                      </h3>
                      <p
                        className="text-xs leading-relaxed"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ────────────────────────────────────────
            FEATURES
        ──────────────────────────────────────── */}
        <section
          id="features"
          className="w-full max-w-5xl px-4 py-16 md:py-20 mx-auto"
        >
          <div className="text-center mb-12">
            <h2
              className="text-2xl md:text-3xl font-bold tracking-tight mb-3"
              style={{ color: 'var(--text-primary)' }}
            >
              Features
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Everything you need, nothing you don&apos;t.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="rounded-2xl p-5 flex flex-col gap-3 transition-all duration-200 hover:scale-[1.01]"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: 'var(--accent-subtle)',
                      border: '1px solid var(--accent-border)',
                    }}
                  >
                    <Icon className="w-4.5 h-4.5 w-5 h-5" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <h3
                      className="font-bold text-sm mb-1"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {f.title}
                    </h3>
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {f.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ────────────────────────────────────────
            FAQ
        ──────────────────────────────────────── */}
        <div
          className="w-full"
          style={{ background: 'var(--bg-surface)' }}
        >
          <FaqSection />
        </div>

        {/* ────────────────────────────────────────
            FINAL CTA
        ──────────────────────────────────────── */}
        <section className="w-full max-w-3xl mx-auto px-4 py-16 md:py-20 text-center">
          <div
            className="rounded-2xl p-10 md:p-14"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <h2
              className="text-2xl md:text-3xl font-bold tracking-tight mb-3"
              style={{ color: 'var(--text-primary)' }}
            >
              Ready to download?
            </h2>
            <p
              className="text-sm mb-8 max-w-md mx-auto"
              style={{ color: 'var(--text-secondary)' }}
            >
              Paste a ReelShort or DramaBox episode URL and get started in seconds.
            </p>
            <a
              id="cta-go-to-downloader"
              href="#downloader"
              className="btn-accent inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all"
            >
              <Download className="w-4 h-4" />
              Go to Downloader
            </a>
          </div>
        </section>
      </main>

      {/* ────────────────────────────────────────
          FOOTER
      ──────────────────────────────────────── */}
      <footer
        className="w-full border-t"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-3">
                <Image
                  src="/logo.svg"
                  alt="VidSave Logo"
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-lg shrink-0 object-contain"
                />
                <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  VidSave
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                A simple, clean tool for downloading ReelShort and DramaBox episodes.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4
                className="text-xs font-semibold uppercase tracking-wider mb-4"
                style={{ color: 'var(--text-muted)' }}
              >
                Product
              </h4>
              <ul className="space-y-2.5">
                {[
                  { label: 'Home', href: '#downloader' },
                  { label: 'Platforms', href: '#platforms' },
                  { label: 'How It Works', href: '#how-it-works' },
                  { label: 'Features', href: '#features' },
                  { label: 'FAQ', href: '#faq' },
                ].map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="footer-link text-xs transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Platforms */}
            <div>
              <h4
                className="text-xs font-semibold uppercase tracking-wider mb-4"
                style={{ color: 'var(--text-muted)' }}
              >
                Platforms
              </h4>
              <ul className="space-y-2.5">
                {PLATFORMS.map((p) => (
                  <li key={p.name}>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {p.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4
                className="text-xs font-semibold uppercase tracking-wider mb-4"
                style={{ color: 'var(--text-muted)' }}
              >
                Legal
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Privacy Policy
                  </span>
                </li>
                <li>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Terms of Service
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div
            className="pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-3"
            style={{ borderColor: 'var(--border)' }}
          >
            <p
              className="text-[11px] flex items-center gap-1"
              style={{ color: 'var(--text-muted)' }}
            >
              <Copyright className="w-3 h-3" />
              {new Date().getFullYear()} VidSave. All rights reserved.
            </p>
            <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
              This tool is for personal use only. Respect platform terms of service.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
