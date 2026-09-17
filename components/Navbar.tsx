'use client';

import { useState } from 'react';
import { Sun, Moon, Download } from 'lucide-react';

function readDark(): boolean {
  if (typeof document === 'undefined') return true;
  return document.documentElement.classList.contains('dark');
}

export default function Navbar() {
  const [isDark, setIsDark] = useState(readDark);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const scrollToDownloader = () => {
    document.getElementById('downloader')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav
      className="sticky top-0 z-50 w-full border-b"
      style={{
        background: 'var(--bg-surface)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <button
          onClick={scrollToDownloader}
          className="flex items-center gap-2 font-bold text-sm tracking-tight hover:opacity-80 transition-opacity"
          style={{ color: 'var(--text-primary)' }}
        >
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            <Download className="w-3.5 h-3.5" />
          </span>
          <span className="hidden sm:inline">VidSave</span>
        </button>

        {/* Nav Links */}
        <div
          className="hidden md:flex items-center gap-6 text-xs font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          <a href="#platforms" className="hover:text-[var(--accent)] transition-colors">Platforms</a>
          <a href="#how-it-works" className="hover:text-[var(--accent)] transition-colors">How it works</a>
          <a href="#features" className="hover:text-[var(--accent)] transition-colors">Features</a>
          <a href="#faq" className="hover:text-[var(--accent)] transition-colors">FAQ</a>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            id="theme-toggle"
            onClick={toggleTheme}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-80"
            style={{
              background: 'var(--bg-muted)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={scrollToDownloader}
            className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-all"
            style={{ background: 'var(--accent)', color: '#fff' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
          >
            <Download className="w-3 h-3" />
            Download
          </button>
        </div>
      </div>
    </nav>
  );
}
