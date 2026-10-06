'use client';

import React from 'react';
import Link from 'next/link';
import { Check, ShieldCheck, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BorderBeam } from '@/components/ui/border-beam';

const TIERS = [
  {
    step: '01',
    name: 'Mastyf Check',
    tag: 'FREE ACQUISITION',
    headline: 'Discover exposure before deploying.',
    description: 'Instant automated assessment for Claude Code, Cursor, and MCP clusters. Catalogs active tools, unmediated execution sinks, and credential leakage risks.',
    features: [
      'Discovers all active MCP and system tools',
      'Detects unmediated network egress paths',
      'Flags plaintext API keys and secret exposures',
      'Generates shareable Agent Security Scorecard',
    ],
    cta: 'Run Free Check ->',
    ctaLink: '#check-agent',
    isPrimary: false,
  },
  {
    step: '02',
    name: 'Mastyf Guard',
    tag: 'RUNTIME ENFORCEMENT',
    headline: 'Sub-microsecond fail-closed mediation.',
    description: 'External proxy mediator sitting between the agent and tools. Enforces CBAC contracts, address normalization, prompt containment, and taint tracking with zero downstream leaks.',
    features: [
      'Deterministic pre-dispatch authorization gate',
      'Hex/octal IP normalization and SSRF blocklist',
      'Epoch-based subscription race termination',
      'DIGEST_ONLY zero raw payload persistence',
    ],
    cta: 'Deploy Guard ->',
    ctaLink: '#deploy',
    isPrimary: true,
  },
  {
    step: '03',
    name: 'Mastyf Verify',
    tag: 'BOUNDARY QUALIFICATION',
    headline: 'Mathematically prove complete mediation.',
    description: 'Complete-Mediation Qualification (CMQ). Executes the 15-vector escape suite, verifies container seccomp/cgroup bounds, and issues cryptographically signed Ed25519 attestations.',
    features: [
      'Probes 15 host and network bypass vectors',
      'Validates kernel eBPF drop observation evidence',
      'Dual-engine verification (Node.js vs Python)',
      'Enterprise audit evidence packages',
    ],
    cta: 'Explore CMQ Verify ->',
    ctaLink: '#cmq',
    isPrimary: false,
  },
  {
    step: '04',
    name: 'Mastyf Registry',
    tag: 'ECOSYSTEM TRUST',
    headline: 'Trust the tool before the tool call.',
    description: 'Public trust registry indexing thousands of MCP packages. Evaluates maintainer signals, version drift, permission boundaries, and attested security scores.',
    features: [
      'Public MCP package security scorecards',
      'Historical rug-pull and version drift tracking',
      'Attested capabilities and required permissions',
      'Verified publisher and developer trust badges',
    ],
    cta: 'Search Registry ->',
    ctaLink: '#registry',
    isPrimary: false,
  },
];

export function ProductTiersSection() {
  return (
    <section className="product-tiers-section" id="tiers">
      <div className="section-container">
        <div className="section-header">
          <div className="section-tag">THE MASTYF PLATFORM</div>
          <h2 className="section-title">
            One security boundary. Every agent action.
          </h2>
          <p className="section-subtitle">
            From discovering unmanaged execution paths to enforcing real-time authorization and mathematically proving complete mediation.
          </p>
        </div>

        {/* 4-Column Platform Architecture Grid */}
        <div className="tiers-grid">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`tier-card relative overflow-hidden ${tier.isPrimary ? 'featured' : ''}`}
            >
              {tier.isPrimary && (
                <BorderBeam
                  size={240}
                  duration={8}
                  borderWidth={1.5}
                  colorFrom="#f59e0b"
                  colorTo="#06b6d4"
                />
              )}

              <div className="tier-card-header">
                <div className="tier-step-row">
                  <span className="tier-step-num">{tier.step}</span>
                  <Badge
                    variant={tier.isPrimary ? 'warning' : 'secondary'}
                    className="text-[10px] tracking-wider"
                  >
                    {tier.tag}
                  </Badge>
                </div>
                <h3 className="tier-name">{tier.name}</h3>
                <p className="tier-headline">{tier.headline}</p>
              </div>

              <p className="tier-desc">{tier.description}</p>

              <ul className="tier-features-list">
                {tier.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="tier-check-icon font-mono font-bold text-amber-400">[+]</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={tier.ctaLink}
                className={`tier-cta-btn ${tier.isPrimary ? 'primary' : 'secondary'}`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
