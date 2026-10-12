'use client';

import { useEffect, useRef } from 'react';

const TECH_LOGOS = [
  { name: 'Claude / Anthropic', abbr: 'CLAUDE' },
  { name: 'OpenAI', abbr: 'OPENAI' },
  { name: 'Cursor', abbr: 'CURSOR' },
  { name: 'GitHub Copilot', abbr: 'COPILOT' },
  { name: 'Kubernetes', abbr: 'K8S' },
  { name: 'AWS', abbr: 'AWS' },
  { name: 'Google Cloud', abbr: 'GCP' },
  { name: 'Docker', abbr: 'DOCKER' },
  { name: 'Vercel', abbr: 'VERCEL' },
  { name: 'Cloudflare', abbr: 'CF' },
  { name: 'Stripe', abbr: 'STRIPE' },
  { name: 'Datadog', abbr: 'DDOG' },
];

const COMPANY_USERS = [
  'Series-A fintech teams',
  'SOC2-compliant SaaS',
  'ML platform engineers',
  'DevSecOps teams',
  'AI-native startups',
  'Enterprise security teams',
  'AI coding shops',
  'Cloud infra teams',
];

function LogoChip({ name, abbr }: { name: string; abbr: string }) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.07] hover:border-white/[0.15] hover:bg-white/[0.07] transition-all shrink-0 group cursor-default"
      title={name}
    >
      <span className="text-[11px] font-mono font-bold tracking-widest text-slate-400 group-hover:text-white transition-colors">
        {abbr}
      </span>
    </div>
  );
}

export function TrustLogosMarquee() {
  const track1Ref = useRef<HTMLDivElement>(null);
  const track2Ref = useRef<HTMLDivElement>(null);

  return (
    <section className="relative py-14 overflow-hidden" aria-label="Technology integrations">
      {/* Edge fades */}
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#03060f] to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#03060f] to-transparent z-10 pointer-events-none" />

      <div className="text-center mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-slate-500">
          Securing agent execution across your entire stack
        </p>
      </div>

      {/* Row 1: Tech integrations */}
      <div className="flex gap-3 mb-3 animate-marquee-slow whitespace-nowrap w-max">
        {[...TECH_LOGOS, ...TECH_LOGOS].map((logo, i) => (
          <LogoChip key={`${logo.abbr}-${i}`} name={logo.name} abbr={logo.abbr} />
        ))}
      </div>

      {/* Row 2: User types (reverse direction) */}
      <div className="flex gap-3 animate-marquee-slow-reverse whitespace-nowrap w-max">
        {[...COMPANY_USERS, ...COMPANY_USERS].map((user, i) => (
          <div
            key={`${user}-${i}`}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400/[0.06] border border-amber-400/[0.12] shrink-0"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400/70" />
            <span className="text-[11px] font-medium text-amber-200/70 whitespace-nowrap">
              {user}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
