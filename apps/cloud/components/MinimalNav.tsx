'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GITHUB_REPO_URL } from '@/lib/github-links';
import { ArrowRight } from 'lucide-react';

const LINKS = [
  { label: 'Platform', href: '/#platform' },
  { label: 'Developers', href: '/developers' },
  { label: 'Research', href: '/research' },
  { label: 'Pricing', href: '/pricing' },
];

const GithubIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

export function MinimalNav({ session }: { session: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 30);
      const el = document.documentElement;
      const scrollable = el.scrollHeight - el.clientHeight;
      setProgress(scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {/* Scroll progress */}
      <div
        className="fixed top-0 left-0 z-[300] h-[1.5px] bg-amber-400 transition-all duration-100 pointer-events-none"
        style={{ width: `${progress}%` }}
      />

      <header
        className={`fixed top-0 left-0 right-0 z-[200] transition-all duration-300 ${
          scrolled ? 'border-b border-white/[0.07] bg-[#050508]/90 backdrop-blur-xl' : ''
        }`}
      >
        <div className="max-w-[1120px] mx-auto px-6 h-14 flex items-center justify-between gap-8">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-[15px] tracking-[-0.02em] text-white hover:text-amber-100 transition-colors shrink-0"
          >
            mastyf<span className="text-amber-400">.ai</span>
            <span className="text-[10px] font-mono font-semibold text-slate-600 border border-white/[0.07] px-1.5 py-0.5 rounded-sm hidden sm:inline">
              v2.4
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[13.5px] font-medium text-slate-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-white/[0.05] transition-all"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex p-2 text-slate-500 hover:text-white hover:bg-white/[0.05] rounded-md transition-all"
              aria-label="GitHub"
            >
              <GithubIcon />
            </a>

            {session ? (
              <Link
                href="/dashboard"
                className="hidden sm:flex text-[13px] font-medium text-slate-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-white/[0.05] transition-all"
              >
                Console
              </Link>
            ) : (
              <Link
                href="/login"
                className="hidden sm:flex text-[13px] font-medium text-slate-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-white/[0.05] transition-all"
              >
                Sign in
              </Link>
            )}

            <Link
              href="#scanner"
              className="flex items-center gap-1.5 text-[13px] font-semibold text-[#0a0600] bg-amber-400 hover:bg-amber-300 px-4 py-1.5 rounded-lg transition-all hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(245,158,11,0.3)]"
            >
              <span>Check agent</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {/* Mobile toggle */}
            <button
              className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-white/[0.05] rounded-md transition-all"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                {mobileOpen ? (
                  <><line x1="2" y1="2" x2="14" y2="14"/><line x1="14" y1="2" x2="2" y2="14"/></>
                ) : (
                  <><line x1="2" y1="5" x2="14" y2="5"/><line x1="2" y1="11" x2="14" y2="11"/></>
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/[0.07] bg-[#050508]/95 backdrop-blur-xl px-6 py-4 flex flex-col gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-[14px] font-medium text-slate-400 hover:text-white px-3 py-2.5 rounded-md hover:bg-white/[0.05] transition-all"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-white/[0.07] mt-2 flex gap-2">
              <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="flex-1 text-center text-[13px] font-medium text-slate-500 py-2 border border-white/[0.08] rounded-lg hover:text-white hover:border-white/[0.15] transition-all">
                GitHub
              </a>
              {session ? (
                <Link href="/dashboard" className="flex-1 text-center text-[13px] font-medium text-slate-400 py-2 border border-white/[0.08] rounded-lg hover:text-white transition-all">
                  Console
                </Link>
              ) : (
                <Link href="/login" className="flex-1 text-center text-[13px] font-medium text-slate-400 py-2 border border-white/[0.08] rounded-lg hover:text-white transition-all">
                  Sign in
                </Link>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
