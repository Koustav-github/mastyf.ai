'use client';

import React from 'react';
import { RevealOnScroll, StaggerReveal } from '@/components/landing/RevealOnScroll';
import { Shield, CheckCircle2, ArrowRight, Lock, Eye } from 'lucide-react';
import Link from 'next/link';

const STEPS = [
  {
    step: '01',
    icon: Eye,
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10 border-cyan-400/25',
    glow: 'shadow-[0_0_30px_rgba(6,182,212,0.15)]',
    title: 'Your AI Agent Proposes an Action',
    description:
      'An autonomous agent decides it needs to read a file, call an API, execute a command, or spend compute.',
    detail: 'The agent sends a JSON-RPC tool call to its MCP server or stdio transport.',
    code: '{ "method": "tools/call", "params": { "name": "bash_exec",\n  "args": { "cmd": "rm -rf /tmp/*" } } }',
    codeLabel: 'Intercepted before dispatch',
  },
  {
    step: '02',
    icon: Shield,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10 border-amber-400/25',
    glow: 'shadow-[0_0_30px_rgba(245,158,11,0.15)]',
    title: 'Mastyf Evaluates in < 50µs',
    description:
      'Every tool call passes through the 4-gate perimeter: Schema validation, CBAC invariants, DIFC taint flow, and neural boundary check.',
    detail: 'No LLM calls for Gates 1-3. Pure deterministic logic. Fail-closed by default.',
    code: 'GATE 1 ✓ GATE 2 ✓ GATE 3 ✓ GATE 4 → BLOCK\n→ No capability contract permits bash_exec',
    codeLabel: 'Mastyf evaluation trace',
  },
  {
    step: '03',
    icon: Lock,
    color: 'text-rose-400',
    bg: 'bg-rose-400/10 border-rose-400/25',
    glow: 'shadow-[0_0_30px_rgba(244,63,94,0.15)]',
    title: 'Prohibited Actions Are Severed',
    description:
      'The tool call is dropped before it reaches your infrastructure. A cryptographically signed evidence receipt is written to the immutable audit ledger.',
    detail: 'Ed25519-signed receipt: timestamp, agent fingerprint, payload hash, blocking gate.',
    code: '{ "verdict": "BLOCK", "evidence": "sha256:4a7e91...",\n  "latency_us": 29, "downstream_bytes": 0 }',
    codeLabel: 'Immutable audit receipt',
  },
  {
    step: '04',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10 border-emerald-400/25',
    glow: 'shadow-[0_0_30px_rgba(16,185,129,0.15)]',
    title: 'Authorized Actions Execute Cleanly',
    description:
      'Actions that pass all 4 gates are dispatched to your tools. No added latency. No change to your agent code.',
    detail: 'Mastyf runs as a transparent sidecar or reverse proxy. Zero agent modifications.',
    code: '{ "verdict": "ALLOW", "dispatched": true,\n  "latency_us": 58, "invocations": 1 }',
    codeLabel: 'Clean execution dispatch',
  },
];

export function HowItWorksSection() {
  return (
    <section className="relative py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" id="how-it-works">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-cyan-500/8 via-amber-500/8 to-emerald-500/8 blur-[120px] pointer-events-none rounded-full" />

      <RevealOnScroll className="text-center max-w-3xl mx-auto mb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 text-xs font-mono font-semibold uppercase tracking-wider mb-4">
          How Mastyf Works
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-5 leading-tight">
          Four gates. Sub-microsecond.{' '}
          <span className="bg-gradient-to-r from-cyan-300 via-amber-300 to-emerald-300 bg-clip-text text-transparent">
            Zero compromise.
          </span>
        </h2>
        <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
          From tool call proposal to enforced verdict — before a single byte reaches your infrastructure.
        </p>
      </RevealOnScroll>

      <div className="relative">
        <div className="absolute left-[27px] sm:left-[39px] top-8 bottom-8 w-px bg-gradient-to-b from-cyan-500/30 via-amber-500/20 to-emerald-500/30 hidden sm:block" />

        <div className="space-y-10">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <RevealOnScroll key={step.step} delay={i * 120} direction="up">
                <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 group">
                  <div className="lg:col-span-1 flex items-start justify-start lg:justify-center">
                    <div className={`relative z-10 w-10 h-10 sm:w-14 sm:h-14 rounded-2xl ${step.bg} border flex items-center justify-center ${step.glow} transition-all duration-300 group-hover:scale-110 shrink-0`}>
                      <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${step.color}`} />
                      <span className={`absolute -top-2 -right-2 text-[9px] font-mono font-bold ${step.color} bg-[#050508] border border-white/10 px-1.5 py-0.5 rounded-full`}>
                        {step.step}
                      </span>
                    </div>
                  </div>

                  <div className="lg:col-span-5 pl-2 sm:pl-0">
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-2 group-hover:text-amber-100 transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed mb-3">
                      {step.description}
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {step.detail}
                    </p>
                  </div>

                  <div className="lg:col-span-6">
                    <div className="rounded-2xl bg-[#050911] border border-white/[0.07] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.5)] group-hover:border-white/[0.14] transition-colors">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.07] bg-black/20">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${step.color.replace('text-', 'bg-')}`} />
                          <span className="text-[11px] font-mono text-slate-500">{step.codeLabel}</span>
                        </div>
                        <span className={`text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded ${step.bg} ${step.color} border`}>
                          {step.step}/04
                        </span>
                      </div>
                      <pre className="p-4 text-[11px] font-mono text-slate-300 leading-relaxed whitespace-pre-wrap break-all">
                        {step.code}
                      </pre>
                    </div>
                  </div>
                </div>
              </RevealOnScroll>
            );
          })}
        </div>
      </div>

      <RevealOnScroll delay={400} className="text-center mt-20">
        <p className="text-sm text-slate-400 mb-6">
          Zero agent code changes. Transparent sidecar deployment. Instant verification.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="#check-agent"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-black bg-amber-400 hover:bg-amber-300 transition-colors shadow-[0_0_24px_rgba(245,158,11,0.3)]"
          >
            <span>Try It Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/developers"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-slate-200 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] transition-colors"
          >
            <span>Read Architecture Docs</span>
          </Link>
        </div>
      </RevealOnScroll>
    </section>
  );
}
