'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { GITHUB_REPO_URL } from '@/lib/github-links';
import { ChevronDown, Menu, X, ArrowRight, Shield, Terminal, BookOpen, Layers, Cpu, ExternalLink, Command } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CommandPalette, useCommandPalette } from '@/components/CommandPalette';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const GithubIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

type Props = {
  session: boolean;
};

interface DropdownItem {
  title: string;
  desc?: string;
  href: string;
  badge?: string;
  icon?: React.ReactNode;
}

const PRODUCT_ITEMS: DropdownItem[] = [
  { title: 'Runtime Guard', desc: 'Pre-dispatch 4-gate execution boundary', href: '/#tiers', badge: 'v2.4' },
  { title: 'Policy Engine', desc: 'CBAC & dynamic security invariants', href: '/platform#policy', badge: 'CBAC' },
  { title: 'Agent Risk Map', desc: 'Instant exposure & tool authority scan', href: '/#check-agent', badge: 'FREE' },
  { title: 'Security Swarm', desc: 'Information-flow taint tracking', href: '/platform#swarm', badge: 'DIFC' },
  { title: 'CMQ Standard', desc: '15-probe boundary qualification test', href: '/#cmq', badge: 'SPEC' },
  { title: 'Evidence Center', desc: 'Cryptographic tamper-proof audit trails', href: '/#evidence', badge: 'ED25519' },
];

const SOLUTIONS_ITEMS: DropdownItem[] = [
  { title: 'Claude Code', desc: 'Hardened terminal CLI proxy', href: '/solutions#claude-code', badge: 'CLI' },
  { title: 'Cursor & IDEs', desc: 'Local editor agent enforcement', href: '/solutions#cursor', badge: 'IDE' },
  { title: 'MCP Servers', desc: 'Tool registry authorization layer', href: '/#registry', badge: 'PROTOCOL' },
  { title: 'Kubernetes Clusters', desc: 'DaemonSet network perimeter gateway', href: '/solutions#kubernetes', badge: 'DAEMONSET' },
  { title: 'Enterprise Fleet', desc: 'Centralized posture & spend governance', href: '/#enterprise', badge: 'FLEET' },
  { title: 'AI CI/CD Pipelines', desc: 'Automated policy compliance gates', href: '/solutions#ai-coding', badge: 'CI/CD' },
];

const TRUST_ITEMS: DropdownItem[] = [
  { title: 'Mastyf Registry', desc: 'Verified MCP tool catalog & ratings', href: '/#registry', badge: 'PUBLIC' },
  { title: 'Trust Scores', desc: 'Static & behavioral package audit', href: '/#registry', badge: 'AUDIT' },
  { title: 'Verification Kit', desc: 'Dual-engine reproducible test suite', href: '/research#verification', badge: 'TESTS' },
  { title: 'Cryptographic Ledger', desc: 'Non-repudiable execution receipts', href: '/#evidence', badge: 'IMMUTABLE' },
];

const DEVELOPER_ITEMS: DropdownItem[] = [
  { title: 'Quickstart', desc: 'Zero-setup npx runner in 30 seconds', href: '/developers', badge: 'NPX' },
  { title: 'Documentation', desc: 'Architecture, protocols & API reference', href: '/developers#docs', badge: 'DOCS' },
  { title: 'GitHub Repository', desc: 'Open source core & community extensions', href: GITHUB_REPO_URL, badge: 'OSS' },
  { title: 'SDKs & Libraries', desc: 'TypeScript and Python middleware', href: '/developers#sdks', badge: 'NODE/PY' },
  { title: 'Threat Lab', desc: 'Watch simulated multi-vector red team attacks', href: '/#threat-lab', badge: 'SIM' },
];

const RESEARCH_ITEMS: DropdownItem[] = [
  { title: 'Academic Monograph', desc: 'Formal DTRAP boundary specification', href: '/research', badge: 'PAPER' },
  { title: 'AgentDojo Benchmarks', desc: '629 evaluation episodes & defense scores', href: '/research#benchmarks', badge: 'EVAL' },
  { title: 'Adversarial Corpus', desc: '142 empirical attack vectors analyzed', href: '/research#attacks', badge: 'CORPUS' },
];

function NavDropdown({
  title,
  items,
  activeDropdown,
  setActiveDropdown,
}: {
  title: string;
  items: DropdownItem[];
  activeDropdown: string | null;
  setActiveDropdown: (v: string | null) => void;
}) {
  const isActive = activeDropdown === title;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setActiveDropdown(title);
    }, 100);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        aria-expanded={isActive}
        className={cn(
          "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium tracking-tight transition-all duration-200",
          isActive
            ? "text-amber-400 bg-amber-400/10 border border-amber-400/25 shadow-[0_0_12px_rgba(245,158,11,0.12)]"
            : "text-slate-300 hover:text-white hover:bg-white/[0.06] border border-transparent"
        )}
        onClick={() => setActiveDropdown(isActive ? null : title)}
      >
        <span>{title}</span>
        <ChevronDown
          className={cn(
            "w-3 h-3 transition-transform duration-200 text-slate-400",
            isActive && "rotate-180 text-amber-400"
          )}
        />
      </button>

      {/* Floating Glass Dropdown Menu */}
      <div
        className={cn(
          "absolute top-full left-1/2 -translate-x-1/2 pt-2.5 w-80 transition-all duration-200 origin-top z-50",
          isActive ? "opacity-100 scale-100 visible pointer-events-auto" : "opacity-0 scale-95 invisible pointer-events-none"
        )}
      >
        <div className="bg-[#080d1a]/95 backdrop-blur-2xl border border-white/[0.12] shadow-[0_24px_50px_rgba(0,0,0,0.85)] rounded-2xl p-2 overflow-hidden ring-1 ring-white/5">
          <div className="flex flex-col gap-0.5">
            {items.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                onClick={() => setActiveDropdown(null)}
                className="group flex flex-col px-3 py-2 rounded-xl hover:bg-white/[0.06] transition-all text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-amber-400 transition-colors">
                    {item.title}
                  </span>
                  {item.badge && (
                    <span className="font-mono text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400/90 border border-amber-400/20 group-hover:bg-amber-400/20 group-hover:text-amber-300 transition-colors">
                      {item.badge}
                    </span>
                  )}
                </div>
                {item.desc && (
                  <span className="text-[11px] text-slate-400 group-hover:text-slate-300 transition-colors mt-0.5 line-clamp-1">
                    {item.desc}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SiteNav({ session }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const { open: paletteOpen, setOpen: setPaletteOpen, close: closePalette } = useCommandPalette();

  useEffect(() => {
    setOpen(false);
    setActiveDropdown(null);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      const doc = document.documentElement;
      const scrollTop = window.scrollY;
      const scrollHeight = doc.scrollHeight - doc.clientHeight;
      setScrollProgress(scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
    <CommandPalette open={paletteOpen} onClose={closePalette} />
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none px-3 sm:px-6 pt-3 sm:pt-4 transition-all duration-300">
      {/* Scroll progress bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-transparent pointer-events-none z-50">
        <div
          className="h-full bg-gradient-to-r from-amber-400 via-amber-300 to-cyan-400 transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>
      <div className="max-w-7xl mx-auto">
        <div
          className={cn(
            "pointer-events-auto relative flex items-center justify-between px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full transition-all duration-300",
            scrolled
              ? "bg-[#060913]/90 backdrop-blur-2xl border border-white/[0.12] shadow-[0_12px_36px_rgba(0,0,0,0.7)]"
              : "bg-[#070b16]/70 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-white/[0.14]"
          )}
        >
          {/* Subtle top hairline accent shimmer */}
          <div className="absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/30 to-transparent pointer-events-none" />

          {/* Left: Brand Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/30 group-hover:border-amber-400/60 transition-colors overflow-hidden">
                <Image
                  src="/logo.png"
                  alt="Mastyf Icon"
                  width={24}
                  height={24}
                  className="rounded group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-sm tracking-tight text-white group-hover:text-amber-300 transition-colors">
                  mastyf<span className="text-amber-400">.ai</span>
                </span>
                <span className="hidden sm:inline-block font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-400 border border-white/[0.08]">
                  v2.4
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Desktop Navigation (Flex distribution — NO overlapping absolute positioning!) */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            <NavDropdown title="Product" items={PRODUCT_ITEMS} activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} />
            <NavDropdown title="Solutions" items={SOLUTIONS_ITEMS} activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} />
            <NavDropdown title="Trust" items={TRUST_ITEMS} activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} />
            <NavDropdown title="Developers" items={DEVELOPER_ITEMS} activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} />
            <NavDropdown title="Research" items={RESEARCH_ITEMS} activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} />
            <Link
              href="/pricing"
              className="px-2.5 py-1.5 rounded-full text-xs font-medium tracking-tight text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
            >
              Pricing
            </Link>
          </nav>

          {/* Right: Actions Strip */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Command Palette trigger */}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono text-slate-500 hover:text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] rounded-lg transition-all"
              aria-label="Open command palette"
            >
              <Command className="w-3 h-3" />
              <span>K</span>
            </button>

            <a
              href={GITHUB_REPO_URL}
              rel="noopener noreferrer"
              target="_blank"
              className="hidden sm:flex text-slate-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/[0.06]"
              aria-label="View on GitHub"
            >
              <GithubIcon className="w-4 h-4" />
            </a>

            {session ? (
              <Link
                href="/dashboard"
                className="hidden sm:inline-flex text-xs font-medium text-slate-300 hover:text-white transition-colors px-3 py-1.5 rounded-full hover:bg-white/[0.06]"
              >
                Console
              </Link>
            ) : (
              <Link
                href="/login"
                className="hidden sm:inline-flex text-xs font-medium text-slate-300 hover:text-white transition-colors px-3 py-1.5 rounded-full hover:bg-white/[0.06]"
              >
                Sign In
              </Link>
            )}

            {/* High-conversion primary CTA button */}
            <Link
              href="#check-agent"
              className="group relative inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-1.5 text-xs font-semibold tracking-tight text-[#050508] bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-[length:200%_auto] hover:bg-[position:right_center] rounded-full transition-all duration-300 shadow-[0_0_18px_rgba(245,158,11,0.28)] hover:shadow-[0_0_24px_rgba(245,158,11,0.45)] border border-amber-300/60"
            >
              <span>Check Your Agent</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              className="lg:hidden p-1.5 text-slate-300 hover:text-white transition-colors rounded-full hover:bg-white/[0.06]"
              onClick={() => setOpen(!open)}
              aria-label="Toggle navigation menu"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer (Clean, glassmorphic dropdown) */}
      <div
        className={cn(
          "lg:hidden pointer-events-auto max-w-7xl mx-auto mt-2 px-1 transition-all duration-300 origin-top",
          open ? "opacity-100 scale-100 max-h-[85vh] visible" : "opacity-0 scale-95 max-h-0 invisible overflow-hidden"
        )}
      >
        <div className="bg-[#070b16]/95 backdrop-blur-2xl border border-white/[0.12] rounded-3xl p-5 shadow-[0_24px_60px_rgba(0,0,0,0.9)] max-h-[80vh] overflow-y-auto">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/#tiers"
                onClick={() => setOpen(false)}
                className="flex flex-col p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] transition-colors"
              >
                <span className="text-xs font-semibold text-white">Runtime Guard</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Execution boundary</span>
              </Link>
              <Link
                href="/#check-agent"
                onClick={() => setOpen(false)}
                className="flex flex-col p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] transition-colors"
              >
                <span className="text-xs font-semibold text-amber-400">Agent Risk Map</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Free exposure scan</span>
              </Link>
              <Link
                href="/solutions#claude-code"
                onClick={() => setOpen(false)}
                className="flex flex-col p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] transition-colors"
              >
                <span className="text-xs font-semibold text-white">Claude Code</span>
                <span className="text-[10px] text-slate-400 mt-0.5">CLI protection</span>
              </Link>
              <Link
                href="/#registry"
                onClick={() => setOpen(false)}
                className="flex flex-col p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] transition-colors"
              >
                <span className="text-xs font-semibold text-white">MCP Registry</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Trust scores</span>
              </Link>
            </div>

            <div className="flex flex-col gap-1 border-t border-white/[0.08] pt-3 text-sm">
              <Link href="/developers" onClick={() => setOpen(false)} className="px-3 py-2 text-slate-300 hover:text-white hover:bg-white/[0.04] rounded-lg">
                Developer Quickstart & Docs
              </Link>
              <Link href="/research" onClick={() => setOpen(false)} className="px-3 py-2 text-slate-300 hover:text-white hover:bg-white/[0.04] rounded-lg">
                Academic Research & Monograph
              </Link>
              <Link href="/pricing" onClick={() => setOpen(false)} className="px-3 py-2 text-slate-300 hover:text-white hover:bg-white/[0.04] rounded-lg">
                Pricing & Enterprise Fleet
              </Link>
            </div>

            <div className="flex items-center justify-between border-t border-white/[0.08] pt-3">
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-white px-2 py-1"
              >
                <GithubIcon className="w-4 h-4" />
                <span>GitHub (Open Source)</span>
              </a>

              {session ? (
                <Link href="/dashboard" onClick={() => setOpen(false)} className="text-xs font-semibold text-amber-400 px-3 py-1.5 rounded-lg bg-amber-400/10 border border-amber-400/20">
                  Open Console
                </Link>
              ) : (
                <Link href="/login" onClick={() => setOpen(false)} className="text-xs text-slate-300 hover:text-white px-3 py-1.5">
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
    </>
  );
}
