'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

const faqs = [
  {
    q: 'Which platforms are supported?',
    a: 'Currently ReelShort (reelshort.com) and DramaBox (dramaboxdb.com / dramabox.com). We support episode video URLs from both platforms.',
  },
  {
    q: 'How do I download a video?',
    a: 'Copy the episode URL from your browser, paste it into the input field on this page, click "Analyze URL", choose your preferred quality, and click Download.',
  },
  {
    q: "Why isn't my URL working?",
    a: 'Make sure you are pasting a direct episode URL (not a homepage, series page, or mobile app link). The URL should contain the episode title or ID. Also verify the episode is publicly accessible.',
  },
  {
    q: 'Does the downloader work on mobile?',
    a: 'Yes. The interface is fully responsive. You can paste a URL and initiate a download from a mobile browser, though download behavior may differ depending on your mobile OS and browser.',
  },
  {
    q: 'Are all videos downloadable?',
    a: 'Only videos that are accessible without a login or paywall can be downloaded. Private, locked, or premium-only episodes may not be available.',
  },
  {
    q: 'What video qualities are available?',
    a: 'Available qualities depend on what the platform provides for the specific episode. Native quality is the original source quality; generated qualities (360p, 480p, 1080p) are transcoded from the source.',
  },
];

export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="w-full max-w-3xl mx-auto px-4 py-16 md:py-20">
      <div className="text-center mb-10">
        <h2
          className="text-2xl md:text-3xl font-bold tracking-tight mb-3"
          style={{ color: 'var(--text-primary)' }}
        >
          Frequently Asked Questions
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Quick answers to common questions about VidSave.
        </p>
      </div>

      <div className="space-y-2">
        {faqs.map((faq, i) => (
          <div
            key={i}
            className="rounded-xl border overflow-hidden transition-all duration-200"
            style={{
              background: 'var(--bg-surface)',
              borderColor: open === i ? 'var(--accent-border)' : 'var(--border)',
            }}
          >
            <button
              id={`faq-item-${i}`}
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left gap-3 transition-colors"
              style={{ color: 'var(--text-primary)' }}
            >
              <span className="text-sm font-semibold">{faq.q}</span>
              {open === i ? (
                <ChevronUp className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
              ) : (
                <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
              )}
            </button>
            {open === i && (
              <div
                className="px-5 pb-4 text-sm leading-relaxed animate-slideDown"
                style={{ color: 'var(--text-secondary)' }}
              >
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
