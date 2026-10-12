'use client';

import React from 'react';
import Link from 'next/link';
import { Check, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { BorderBeam } from '@/components/ui/border-beam';
import { RevealOnScroll } from '@/components/landing/RevealOnScroll';

const TIERS = [
  {
    step: '01',
    name: 'Mastyf Check',
    tag: 'FREE DISCOVERY',
    tagColor: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    headline: 'Discover exposure before deploying.',
    description: 'Instant automated assessment for Claude Code, Cursor, and MCP clusters. Catalogs active tools, unmediated execution sinks, and credential leakage risks.',
    features: [
      'Discovers all active MCP & system tools',
      'Detects unmediated network egress paths',
      'Flags plaintext API keys & secret exposures',
      'Generates shareable Agent Security Scorecard',
    ],
    cta: 'Run Free Check',
    ctaLink: '#check-agent',
    isPrimary: false,
  },
  {
    step: '02',
    name: 'Mastyf Guard',
    tag: 'RUNTIME ENFORCEMENT',
    tagColor: 'text-amber-400 bg-amber-400/10 border-amber-400/25',
    headline: 'Sub-microsecond fail-closed mediation.',
    description: 'External proxy mediator sitting between the agent and tools. Enforces CBAC contracts, address normalization, prompt containment, and taint tracking with zero downstream leaks.',
    features: [
      'Deterministic pre-dispatch authorization gate',
      'Hex/octal IP normalization and SSRF blocklist',
      'Epoch-based subscription race termination',
      'DIGEST_ONLY zero raw payload persistence',
    ],
    cta: 'Deploy Guard',
    ctaLink: '#deploy',
    isPrimary: true,
  },
  {
    step: '03',
    name: 'Mastyf Verify',
    tag: 'BOUNDARY QUALIFICATION',
    tagColor: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    headline: 'Mathematically prove complete mediation.',
    description: 'Complete-Mediation Qualification (CMQ). Executes the 15-vector escape suite, verifies container seccomp/cgroup bounds, and issues cryptographically signed Ed25519 attestations.',
    features: [
      'Probes 15 host & network bypass vectors',
      'Validates kernel eBPF drop observation evidence',
      'Dual-engine verification (Node.js vs Python)',
      'Enterprise audit evidence packages',
    ],
    cta: 'Explore CMQ Verify',
    ctaLink: '#cmq',
    isPrimary: false,
  },
  {
    step: '04',
    name: 'Mastyf Registry',
    tag: 'ECOSYSTEM TRUST',
    tagColor: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    headline: 'Trust the tool before the tool call.',
    description: 'Public trust registry indexing thousands of MCP packages. Evaluates maintainer signals, version drift, permission boundaries, and attested security scores.',
    features: [
      'Public MCP package security scorecards',
      'Historical rug-pull & version drift tracking',
      'Attested capabilities & required permissions',
      'Verified publisher & developer trust badges',
    ],
    cta: 'Search Registry',
    ctaLink: '#registry',
    isPrimary: false,
  },
];

export function ProductTiersSection() {
  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" id="tiers">
      {/* Section Header */}
      <RevealOnScroll className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-mono font-semibold uppercase tracking-wider mb-4">
          The Mastyf Platform
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-5 leading-tight">
          One security boundary. <br />
          <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-200 bg-clip-text text-transparent">
            Every agent action.
          </span>
        </h2>
        <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
          From discovering unmanaged execution paths to enforcing real-time pre-dispatch authorization
          and mathematically proving complete mediation.
        </p>
      </RevealOnScroll>

      {/* 4-Column Platform Architecture Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {TIERS.map((tier, i) => (
          <RevealOnScroll key={tier.name} delay={i * 100} direction="up">
          <div
            key={tier.name}
            className={`relative flex flex-col justify-between rounded-3xl p-6 sm:p-7 transition-all duration-300 ${
              tier.isPrimary
                ? 'bg-[#090e1d]/95 border border-amber-400/40 shadow-[0_20px_60px_rgba(245,158,11,0.15)] ring-1 ring-amber-400/30'
                : 'bg-[#080d1a]/80 hover:bg-[#0b1224]/90 border border-white/[0.08] hover:border-white/[0.16] shadow-[0_8px_30px_rgba(0,0,0,0.5)]'
            }`}
          >
            {tier.isPrimary && (
              <BorderBeam size={220} duration={8} borderWidth={1.5} colorFrom="#f59e0b" colorTo="#06b6d4" />
            )}

            <div>
              {/* Header: Step & Tag */}
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-2xl font-black text-slate-500">
                  {tier.step}
                </span>
                <span className={`text-[9px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border ${tier.tagColor}`}>
                  {tier.tag}
                </span>
              </div>

              {/* Title & Headline */}
              <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
              <p className="text-xs text-amber-400/90 font-medium mb-3">{tier.headline}</p>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                {tier.description}
              </p>

              {/* Feature Checklist */}
              <div className="space-y-2.5 mb-8">
                {tier.features.map((feat) => (
                  <div key={feat} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-300 leading-snug">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Button */}
            <Link
              href={tier.ctaLink}
              className={`w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-full text-xs font-semibold tracking-tight transition-all duration-200 ${
                tier.isPrimary
                  ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                  : 'bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/[0.1]'
              }`}
            >
              <span>{tier.cta}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          </RevealOnScroll>
        ))}
      </div>
    </section>
  );
}
