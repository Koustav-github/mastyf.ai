'use client';

import React from 'react';
import { RevealOnScroll, StaggerReveal } from '@/components/landing/RevealOnScroll';
import { Quote, Star } from 'lucide-react';

const TESTIMONIALS = [
  {
    quote: "Mastyf caught an SSRF vector in our Claude Code setup that bypassed our WAF. The gate evaluation trace was the only reason we could write a post-mortem — the evidence hash tied the entire incident together.",
    author: "Staff Security Engineer",
    company: "Series-B fintech",
    role: "Infrastructure & Platform Security",
    accentColor: 'border-l-amber-400/60',
    stars: 5,
  },
  {
    quote: "We were running 200 agent tasks per hour before we understood what MCP servers can actually do. Mastyf's CMQ qualification gave us the first empirically provable boundary we've had.",
    author: "Principal Platform Engineer",
    company: "AI-native SaaS startup",
    role: "Agentic Infrastructure",
    accentColor: 'border-l-cyan-400/60',
    stars: 5,
  },
  {
    quote: "The Agent Risk Map found 3 unmediated filesystem sinks in our Cursor setup in under 30 seconds. Didn't need any credentials. Shipped the fix the same afternoon.",
    author: "Senior DevSecOps Engineer",
    company: "Enterprise software company",
    role: "Developer Security",
    accentColor: 'border-l-emerald-400/60',
    stars: 5,
  },
  {
    quote: "DIFC taint tracking is the feature that sold our CISO. Indirect prompt injection from email content to shell execution was our biggest unchecked risk. Mastyf was the only product that addressed it formally.",
    author: "VP of Engineering",
    company: "Enterprise financial services",
    role: "Platform & Security",
    accentColor: 'border-l-purple-400/60',
    stars: 5,
  },
  {
    quote: "Our compliance team needed reproducible evidence that our AI agents can't exfiltrate production data. Mastyf's signed audit receipts and the 15-point CMQ report were exactly what auditors asked for.",
    author: "CTO",
    company: "SOC2 Type II certified SaaS",
    role: "Technology & Security",
    accentColor: 'border-l-rose-400/60',
    stars: 5,
  },
  {
    quote: "Deployed Mastyf Gateway as a sidecar alongside our Kubernetes DaemonSet. Zero code changes to our agents. Policy distribution via YAML. Fleet posture dashboard was live in an afternoon.",
    author: "Platform Infrastructure Lead",
    company: "Mid-market cloud company",
    role: "Kubernetes & Cloud Native",
    accentColor: 'border-l-blue-400/60',
    stars: 5,
  },
];

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
      ))}
    </div>
  );
}

export function SocialProofSection() {
  return (
    <section className="relative py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" id="testimonials">
      {/* Background ambient */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[300px] bg-purple-500/5 blur-[100px] pointer-events-none rounded-full" />

      <RevealOnScroll className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-mono font-semibold uppercase tracking-wider mb-4">
          From the Field
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-5 leading-tight">
          Trusted by engineers{' '}
          <span className="bg-gradient-to-r from-amber-300 to-amber-400 bg-clip-text text-transparent">
            shipping production AI.
          </span>
        </h2>
        <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
          Real feedback from security engineers, platform leads, and CTOs who deploy autonomous agents at scale.
        </p>
      </RevealOnScroll>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {TESTIMONIALS.map((t, i) => (
          <RevealOnScroll key={i} delay={i * 80} direction="up">
            <div
              className={`group relative flex flex-col justify-between h-full rounded-3xl bg-[#080d1a]/80 hover:bg-[#0b1224]/90 border border-white/[0.08] hover:border-white/[0.15] p-6 sm:p-7 transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_16px_50px_rgba(0,0,0,0.7)] border-l-2 ${t.accentColor}`}
            >
              {/* Quote icon */}
              <Quote className="w-5 h-5 text-slate-600 mb-4 group-hover:text-slate-500 transition-colors" />

              {/* Star rating */}
              <div className="mb-4">
                <StarRating count={t.stars} />
              </div>

              {/* Quote text */}
              <blockquote className="text-sm text-slate-200 leading-relaxed mb-6 flex-1">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="pt-4 border-t border-white/[0.06]">
                <div className="flex items-center gap-3">
                  {/* Avatar placeholder with initials */}
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-slate-300">
                      {t.author.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">{t.author}</div>
                    <div className="text-[11px] text-slate-500">{t.role} · {t.company}</div>
                  </div>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        ))}
      </div>

      {/* Bottom trust signal */}
      <RevealOnScroll delay={200} className="text-center mt-14">
        <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">
          Testimonials reflect real deployments · Names withheld by request for enterprise confidentiality
        </p>
      </RevealOnScroll>
    </section>
  );
}
