'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { GITHUB_REPO_URL, SSRN_PAPER_URL } from '@/lib/product-links';

const LINKS = [
  { href: '#explainer', label: 'How it works' },
  { href: '#boundary', label: 'The boundary' },
  { href: '#audit', label: 'Audit trail' },
  { href: '#evidence', label: 'Evidence' },
  { href: '/pricing', label: 'Pricing' },
];

export function HomeNav({ session }: { session: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <header className={`mf-nav${scrolled || open ? ' is-scrolled' : ''}`}>
      <div className="mf-wrap mf-nav-in">
        <Link href="/" className="mf-logo" aria-label="mastyf.ai home">
          <span className="mf-logo-tile">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" />
          </span>
          <span>
            mastyf<b>.</b>ai
          </span>
        </Link>
        <nav className="mf-links" aria-label="Primary">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="mf-nav-cta">
          <a className="mf-btn mf-btn-sm mf-hide-m" href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
            GitHub <ArrowUpRight size={14} />
          </a>
          <Link className="mf-btn mf-btn-sm mf-btn-primary" href={session ? '/dashboard' : '/login'}>
            {session ? 'Dashboard' : 'Sign in'}
          </Link>
          <button className="mf-burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      <div className={`mf-drawer${open ? ' open' : ''}`}>
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
            {l.label}
          </a>
        ))}
        <a href={SSRN_PAPER_URL} target="_blank" rel="noreferrer">
          Research preprint
        </a>
      </div>
    </header>
  );
}
