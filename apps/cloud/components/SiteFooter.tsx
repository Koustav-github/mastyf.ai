import Image from 'next/image';
import Link from 'next/link';
import { GITHUB_REPO_URL } from '@/lib/github-links';
import { SITE_NAME } from '@/lib/product-links';
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/lib/support';
import { ArrowRight, ShieldCheck, ExternalLink, Zap, Shield, BookOpen, Terminal, DollarSign, Mail } from 'lucide-react';

const GithubIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const NAV_COLUMNS = [
  {
    title: 'Product',
    icon: Shield,
    links: [
      { label: 'Agent Check', href: '/#check-agent', badge: 'FREE' },
      { label: 'Runtime Guard', href: '/#tiers' },
      { label: 'CMQ Conformance', href: '/#cmq' },
      { label: 'Threat Lab', href: '/#threat-lab' },
      { label: 'Evidence Center', href: '/#evidence' },
      { label: 'Pricing & Licenses', href: '/pricing' },
    ],
  },
  {
    title: 'Solutions',
    icon: Zap,
    links: [
      { label: 'Claude Code', href: '/solutions#claude-code' },
      { label: 'Cursor & IDEs', href: '/solutions#cursor' },
      { label: 'MCP Tool Servers', href: '/#registry' },
      { label: 'Kubernetes Clusters', href: '/solutions#kubernetes' },
      { label: 'Enterprise Fleet', href: '/#enterprise' },
      { label: '30-Day Guided Pilot', href: '/#enterprise' },
    ],
  },
  {
    title: 'Trust & Registry',
    icon: ShieldCheck,
    links: [
      { label: 'Mastyf MCP Registry', href: '/#registry', badge: 'PUBLIC' },
      { label: 'Package Trust Scores', href: '/#registry' },
      { label: 'Verification Kit', href: '/research#verification' },
      { label: '15-Point CMQ Standard', href: '/#cmq' },
      { label: 'Cryptographic Ledger', href: '/#evidence' },
      { label: 'Compliance & SOC2', href: '/trust' },
    ],
  },
  {
    title: 'Developers',
    icon: Terminal,
    links: [
      { label: 'CLI Quickstart', href: '/developers' },
      { label: 'Documentation', href: '/developers#docs' },
      { label: 'GitHub Monorepo', href: GITHUB_REPO_URL, external: true },
      { label: 'Academic Monograph', href: '/research', badge: 'DTRAP' },
      { label: 'AgentDojo Benchmark', href: '/research#benchmarks' },
      { label: 'Adversarial Corpus', href: '/research#attacks' },
    ],
  },
  {
    title: 'Company',
    icon: BookOpen,
    links: [
      { label: SUPPORT_EMAIL, href: SUPPORT_MAILTO },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Security Bug Bounty', href: '/security' },
      { label: 'System Status', href: 'https://status.mastyf.ai', external: true },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative border-t border-white/[0.08] bg-[#03060f] overflow-hidden" id="contact">
      {/* Subtle ambient glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-gradient-to-t from-amber-500/5 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Pre-footer CTA Banner */}
        <div className="relative py-16 border-b border-white/[0.06]">
          <div className="relative rounded-3xl bg-gradient-to-r from-[#0d1528] via-[#080d1a] to-[#0a1220] border border-white/[0.1] p-8 sm:p-12 overflow-hidden">
            {/* Glow orbs */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/8 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-cyan-500/6 rounded-full blur-[80px] pointer-events-none" />

            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-mono font-semibold uppercase tracking-wider mb-4">
                  Start Free
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
                  Discover what your AI agent{' '}
                  <span className="text-amber-400">can actually do.</span>
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Free exposure scan for Claude Code, Cursor, and MCP clusters. No credentials required. Results in under 30 seconds.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-3 lg:items-start xl:items-center">
                <Link
                  href="#check-agent"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-black bg-amber-400 hover:bg-amber-300 transition-colors shadow-[0_0_24px_rgba(245,158,11,0.3)] hover:shadow-[0_0_36px_rgba(245,158,11,0.45)]"
                >
                  <span>Run Free Agent Scan</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-slate-200 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] transition-colors"
                >
                  <span>View Pricing</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main footer body */}
        <div className="py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Brand column */}
            <div className="lg:col-span-3">
              <Link href="/" className="inline-block mb-5">
                <span className="font-bold text-2xl tracking-tight text-white">
                  mastyf<span className="text-amber-400">.ai</span>
                </span>
              </Link>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                <strong className="text-white font-semibold">Secure the moment AI takes action.</strong>{' '}
                Runtime authorization, execution perimeter qualification, and cryptographic evidence for autonomous agents.
              </p>

              {/* Status indicator */}
              <div className="flex items-center gap-2 mb-6">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>All Systems Operational</span>
                </div>
              </div>

              {/* Social links */}
              <div className="flex items-center gap-2">
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.14] text-slate-400 hover:text-white transition-all"
                  aria-label="GitHub"
                >
                  <GithubIcon />
                </a>
                <a
                  href="https://x.com/mastyf_ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.14] text-slate-400 hover:text-white transition-all"
                  aria-label="X / Twitter"
                >
                  <XIcon />
                </a>
                <a
                  href={SUPPORT_MAILTO}
                  className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.14] text-slate-400 hover:text-white transition-all"
                  aria-label="Email"
                >
                  <Mail className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Navigation columns */}
            <div className="lg:col-span-9">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-8">
                {NAV_COLUMNS.map((col) => {
                  const Icon = col.icon;
                  return (
                    <div key={col.title}>
                      <div className="flex items-center gap-1.5 mb-4">
                        <Icon className="w-3.5 h-3.5 text-slate-500" />
                        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                          {col.title}
                        </h4>
                      </div>
                      <ul className="space-y-2.5">
                        {col.links.map((link) => (
                          <li key={link.label}>
                            {'external' in link && link.external ? (
                              <a
                                href={link.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors"
                              >
                                <span>{link.label}</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </a>
                            ) : (
                              <Link
                                href={link.href}
                                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors group"
                              >
                                <span>{link.label}</span>
                                {'badge' in link && link.badge && (
                                  <span className="text-[8px] font-mono font-bold tracking-wider px-1 py-0.5 rounded bg-amber-400/10 text-amber-400/70 border border-amber-400/15 group-hover:text-amber-400 transition-colors">
                                    {link.badge}
                                  </span>
                                )}
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Legal strip */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 border-t border-white/[0.05] text-xs text-slate-600 font-mono">
          <div className="flex items-center gap-4">
            <span>&copy; {new Date().getFullYear()} Mastyf.ai Inc. All rights reserved.</span>
            <span className="hidden sm:inline text-slate-700">·</span>
            <span className="hidden sm:inline font-mono text-[10px] text-slate-700 bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.04]">v2.4.0</span>
          </div>
          <div className="text-center sm:text-right text-[11px] text-slate-700 max-w-xs">
            Security claims scoped to documented deployments and verification conditions.
          </div>
        </div>
      </div>
    </footer>
  );
}
