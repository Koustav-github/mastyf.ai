'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GITHUB_REPO_URL } from '@/lib/github-links';
import { ArrowRight, ShieldCheck, Menu, X, Cpu } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Product Console', href: '#product-stage' },
  { label: 'SSRN Preprint', href: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=7505299', external: true },
  { label: 'Benchmarks', href: '#proofs' },
  { label: 'Quickstart', href: '#deploy' },
  { label: 'Pricing', href: '#pricing' },
];

export function ModernNav({ session }: { session?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-3 transition-all duration-300">
      <div 
        className={`max-w-[1180px] mx-auto rounded-2xl px-4 sm:px-6 py-2.5 flex items-center justify-between transition-all duration-300 ${
          scrolled 
            ? 'bg-slate-950/85 backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/50' 
            : 'bg-slate-950/40 backdrop-blur-md border border-white/[0.04]'
        }`}
      >
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/20 transition-colors">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-extrabold tracking-tight text-white font-mono">mastyf<span className="text-amber-400">.ai</span></span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 hidden sm:inline">
              v2.2 FROZEN
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-300">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              target={link.external ? '_blank' : undefined}
              rel={link.external ? 'noreferrer' : undefined}
              className="hover:text-white transition-colors hover:scale-105 transform"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right CTA Area */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white transition-colors border border-white/[0.06]"
            aria-label="GitHub Repository"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </Link>

          {session ? (
            <Link
              href="/dashboard"
              className="px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-white transition-colors border border-white/[0.08]"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
          )}

          <Link
            href="#scanner"
            className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5"
          >
            <span>Run Free Check</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white focus:outline-none"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden max-w-[1180px] mx-auto mt-2 p-4 rounded-xl bg-slate-950/95 backdrop-blur-2xl border border-white/[0.08] shadow-2xl flex flex-col gap-3">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              target={link.external ? '_blank' : undefined}
              rel={link.external ? 'noreferrer' : undefined}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <Link
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
              <span>GitHub</span>
            </Link>
            <Link
              href="/login"
              className="text-xs text-amber-400 font-semibold"
            >
              Sign In →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
