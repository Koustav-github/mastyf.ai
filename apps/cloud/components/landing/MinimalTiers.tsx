'use client';

import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';

const TIERS = [
  {
    step: '01',
    name: 'Check',
    tag: 'Free · 30 seconds',
    headline: 'Discover your exposure surface.',
    desc: 'Catalog every active MCP tool, detect unmediated execution sinks, flag credential leaks. No credentials needed.',
    features: [
      'All active MCP & system tools cataloged',
      'Unmediated network egress paths detected',
      'Plaintext credentials flagged',
      'Agent Security Scorecard generated',
    ],
    cta: 'Run free check',
    href: '#scanner',
    featured: false,
  },
  {
    step: '02',
    name: 'Guard',
    tag: 'Runtime · sub-50µs',
    headline: 'Enforce pre-dispatch authorization.',
    desc: 'External proxy mediator between agent and tools. 4-gate evaluation, fail-closed, zero agent code changes required.',
    features: [
      'Deterministic 4-gate perimeter enforcement',
      'Hex/octal IP normalization & SSRF blocklist',
      'CBAC monetary clamping & rate limiting',
      'Ed25519-signed immutable audit receipts',
    ],
    cta: 'Deploy Guard',
    href: '#deploy',
    featured: true,
  },
  {
    step: '03',
    name: 'Verify',
    tag: 'Qualification · CMQ',
    headline: 'Mathematically prove complete mediation.',
    desc: 'CMQ 15-vector escape suite. Verify container seccomp bounds. Issue cryptographically signed Ed25519 attestations.',
    features: [
      '15 host & network bypass vectors probed',
      'Kernel eBPF drop observation evidence',
      'Dual-engine verification (Node + Python)',
      'Enterprise audit evidence packages',
    ],
    cta: 'Explore CMQ',
    href: '#cmq',
    featured: false,
  },
];

export function MinimalTiers() {
  return (
    <section className="py-24 px-6 border-t border-white/[0.05]">
      <div className="max-w-[1120px] mx-auto">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 text-[11px] font-mono font-semibold tracking-[0.08em] uppercase text-slate-500 border border-white/[0.07] px-3 py-1.5 rounded-md mb-4">
            The platform
          </span>
          <h2 className="text-[clamp(28px,3.5vw,44px)] font-bold tracking-[-0.03em] leading-[1.12] text-white mb-4">
            One boundary. Every action.
          </h2>
          <p className="text-[15px] text-slate-500 max-w-[420px] mx-auto leading-relaxed">
            From discovering exposure to enforcing real-time authorization and proving complete mediation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col p-6 rounded-xl border transition-all ${
                tier.featured
                  ? 'border-amber-400/25 bg-[#0d0f00]/50 shadow-[0_0_40px_rgba(245,158,11,0.06)]'
                  : 'border-white/[0.07] bg-[#07090f]'
              }`}
            >
              {tier.featured && (
                <div className="absolute top-4 right-4 text-[10px] font-mono font-bold tracking-[0.08em] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded">
                  CORE
                </div>
              )}

              <div className="mb-6">
                <div className="text-[11px] font-mono text-slate-600 mb-1">Step {tier.step}</div>
                <div className="text-[11px] font-mono text-slate-500 mb-3">{tier.tag}</div>
                <div className="text-[22px] font-bold text-white tracking-[-0.02em] mb-1">
                  Mastyf {tier.name}
                </div>
                <div className={`text-[12px] font-medium mb-3 ${tier.featured ? 'text-amber-400/80' : 'text-slate-500'}`}>
                  {tier.headline}
                </div>
                <p className="text-[13px] text-slate-500 leading-relaxed">{tier.desc}</p>
              </div>

              <div className="flex flex-col gap-2 mb-8 flex-1">
                {tier.features.map((f) => (
                  <div key={f} className="flex items-start gap-2.5">
                    <Check className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${tier.featured ? 'text-amber-400' : 'text-emerald-500'}`} />
                    <span className="text-[12px] text-slate-400 leading-snug">{f}</span>
                  </div>
                ))}
              </div>

              <Link
                href={tier.href}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold transition-all ${
                  tier.featured
                    ? 'bg-amber-400 text-[#0a0600] hover:bg-amber-300 hover:-translate-y-px hover:shadow-[0_4px_20px_rgba(245,158,11,0.3)]'
                    : 'bg-white/[0.05] text-slate-300 border border-white/[0.09] hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {tier.cta}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-[13px] text-slate-500 hover:text-white transition-colors"
          >
            View all plans and pricing
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
