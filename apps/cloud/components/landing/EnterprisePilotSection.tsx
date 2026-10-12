'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowRight, CheckCircle2, Building2, Lock, FileCheck, Layers } from 'lucide-react';
import { BorderBeam } from '@/components/ui/border-beam';

const ENTERPRISE_CONCERNS = [
  {
    title: 'Identity',
    question: 'Who is the agent acting for?',
    desc: 'Binds every tool execution request to an authenticated human principal, machine role, and cryptographically verified task session.',
    badge: 'Dual-Domain Binding',
    icon: Building2,
    accent: 'text-cyan-400',
  },
  {
    title: 'Authorization',
    question: 'What can it actually execute?',
    desc: 'Enforces external policy over tool calls before execution. Prevents parameter coercion, unauthorized SQL writes, and privilege escalation.',
    badge: 'Pre-Dispatch Policy',
    icon: Lock,
    accent: 'text-amber-400',
  },
  {
    title: 'Isolation',
    question: 'Can it bypass the security boundary?',
    desc: 'CMQ mathematical qualification tests whether the container or runtime host has alternate network paths or direct socket routes around the gateway.',
    badge: 'CMQ Boundary Assurance',
    icon: Layers,
    accent: 'text-purple-400',
  },
  {
    title: 'Evidence',
    question: 'Can security teams prove what happened?',
    desc: 'Generates immutable cryptographic receipts for every approved, blocked, or tainted execution, verifiable by external auditors.',
    badge: 'Cryptographic Ledger',
    icon: FileCheck,
    accent: 'text-emerald-400',
  },
];

const PILOT_STEPS = [
  {
    step: '01',
    title: 'Connect Environment',
    desc: 'Attach Mastyf to one production-like agent deployment (Claude Code, Cursor, MCP cluster, or custom agent).',
  },
  {
    step: '02',
    title: 'Discover Capabilities',
    desc: 'Automatically catalog tool inventory, network egress routes, file scopes, and unscoped system permissions.',
  },
  {
    step: '03',
    title: 'Insert Execution Guard',
    desc: 'Place Mastyf in the dispatch path in monitor mode to capture baseline agent behavior with zero disruption.',
  },
  {
    step: '04',
    title: 'Establish Policies',
    desc: 'Configure context-based access control (CBAC) and information-flow taint rules matching your least-privilege model.',
  },
  {
    step: '05',
    title: 'Adversarial Attack Run',
    desc: 'Execute automated CMQ bypass probes and prompt injection simulations to test the boundary under live pressure.',
  },
  {
    step: '06',
    title: 'Evidence Dossier',
    desc: 'Receive an executive evidence package with cryptographic attestation, blocked attack metrics, and deployment certificate.',
  },
];

export function EnterprisePilotSection() {
  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" id="enterprise">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-semibold uppercase tracking-wider mb-4">
          Enterprise Governance &amp; Scale
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-5 leading-tight">
          Put AI agents into production <br />
          <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-amber-300 bg-clip-text text-transparent">
            without giving them the keys.
          </span>
        </h2>
        <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
          Autonomous agents read internal documentation, execute code, query production databases, and interact with APIs.
          Mastyf provides the hardened execution perimeter enterprise security teams require.
        </p>
      </div>

      {/* 4 Enterprise Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
        {ENTERPRISE_CONCERNS.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.title}
              className="flex flex-col justify-between p-6 rounded-3xl bg-[#080d1a]/80 hover:bg-[#0b1224]/90 border border-white/[0.08] hover:border-white/[0.16] shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    <Icon className={`w-5 h-5 ${c.accent}`} />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.06]">
                    {c.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{c.title}</h3>
                <div className="text-xs text-amber-400/90 font-medium mb-2">{c.question}</div>
                <p className="text-xs text-slate-400 leading-relaxed">{c.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 30-Day Guided Pilot Roadmap */}
      <div className="relative rounded-3xl bg-[#080d1a]/95 backdrop-blur-2xl border border-white/[0.1] p-6 sm:p-10 shadow-[0_30px_90px_rgba(0,0,0,0.8)] overflow-hidden">
        <BorderBeam size={320} duration={12} borderWidth={1.5} colorFrom="#3b82f6" colorTo="#06b6d4" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08] mb-8">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold block mb-1">
              30-Day Guided Deployment
            </span>
            <h3 className="text-2xl font-bold text-white">Enterprise Proof of Concept</h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-slate-400 bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.08]">
              Kubernetes DaemonSet
            </span>
            <span className="text-xs font-mono text-slate-400 bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.08]">
              Local Sidecar Proxy
            </span>
            <span className="text-xs font-mono text-slate-400 bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.08]">
              Air-Gapped VPC
            </span>
          </div>
        </div>

        {/* 6 Step Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {PILOT_STEPS.map((step) => (
            <div
              key={step.step}
              className="p-5 rounded-2xl bg-black/40 border border-white/[0.06] flex flex-col justify-between"
            >
              <div>
                <span className="font-mono text-2xl font-black text-slate-600 block mb-2">
                  {step.step}
                </span>
                <h4 className="text-sm font-bold text-white mb-1.5">{step.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Action */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/[0.08]">
          <span className="text-xs text-slate-300">
            Deploy with white-glove engineering support and custom policy formulation.
          </span>
          <a
            href="mailto:mastyf.support@gmail.com?subject=Enterprise%20Pilot%20Inquiry"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-semibold text-black bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-300 hover:to-blue-300 transition-colors shadow-[0_0_20px_rgba(6,182,212,0.3)]"
          >
            <span>Request 30-Day Pilot</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
