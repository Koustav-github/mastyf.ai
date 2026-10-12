'use client';

import React from 'react';
import Link from 'next/link';
import { RevealOnScroll } from '@/components/landing/RevealOnScroll';
import {
  FileText,
  Database,
  Terminal,
  Send,
  Trash2,
  Boxes,
  Coins,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

interface OperationalAction {
  verb: string;
  scope: string;
  threatExample: string;
  mastyfGate: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}

const OPERATIONAL_ACTIONS: OperationalAction[] = [
  {
    verb: 'Read',
    scope: 'Filesystem, memory dumps, source repos, credentials',
    threatExample: 'Agent prompted to read /etc/passwd or .env file and summarize secrets',
    mastyfGate: 'Path normalization & credential boundary policies',
    icon: FileText,
    accentColor: 'text-cyan-400',
  },
  {
    verb: 'Write',
    scope: 'Database records, local configurations, codebases, lockfiles',
    threatExample: 'Agent writes corrupt SQL migration or alters production config files',
    mastyfGate: 'CBAC contextual schema checks & monotonic constraints',
    icon: Database,
    accentColor: 'text-amber-400',
  },
  {
    verb: 'Execute',
    scope: 'Host shell commands, system binaries, sub-processes',
    threatExample: 'Agent executes arbitrary bash script to install unvetted external deps',
    mastyfGate: 'Strict capability contracts barring unmanaged command execution',
    icon: Terminal,
    accentColor: 'text-rose-400',
  },
  {
    verb: 'Send',
    scope: 'Outbound HTTP webhooks, external APIs, Slack, emails',
    threatExample: 'Indirect prompt injection commands agent to exfiltrate session data',
    mastyfGate: 'Dynamic information-flow control (DIFC) preventing egress',
    icon: Send,
    accentColor: 'text-purple-400',
  },
  {
    verb: 'Delete',
    scope: 'S3 buckets, database tables, user records, persistent volumes',
    threatExample: 'Agent drops production tables during automated refactor task',
    mastyfGate: 'Explicit human approval quorum gate for irreversible operations',
    icon: Trash2,
    accentColor: 'text-red-400',
  },
  {
    verb: 'Deploy',
    scope: 'Kubernetes pods, cloud functions, Terraform stacks',
    threatExample: 'Compromised task plan deploys container with root privileges',
    mastyfGate: 'CMQ boundary isolation & admission qualification',
    icon: Boxes,
    accentColor: 'text-indigo-400',
  },
  {
    verb: 'Spend',
    scope: 'LLM API credits, cloud infrastructure compute, payment gates',
    threatExample: 'Recursive agent loop exhausts organizational API budget or GPU nodes',
    mastyfGate: 'Hard transaction budgets & rate-burst circuit breakers',
    icon: Coins,
    accentColor: 'text-emerald-400',
  },
];

export function OperationalSystemsSection() {
  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" id="operational">
      {/* Section Header */}
      <RevealOnScroll className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-mono font-semibold uppercase tracking-wider mb-4">
          The Agent Paradigm Shift
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-5 leading-tight">
          AI can now take real actions. <br />
          <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-200 bg-clip-text text-transparent">
            Mastyf controls those actions.
          </span>
        </h2>
        <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
          When an autonomous agent connects to tools, security is no longer what it says in a chat window.
          It is what it is allowed to execute against your infrastructure.
        </p>
      </RevealOnScroll>

      {/* Modern Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 mb-14">
        {OPERATIONAL_ACTIONS.map((action, idx) => {
          const Icon = action.icon;
          const isWide = idx === 0 || idx === 6;

          return (
            <RevealOnScroll
              key={action.verb}
              delay={idx * 60}
              direction="up"
            >
            <div
              className={`group relative rounded-3xl bg-[#080d1a]/80 hover:bg-[#0b1224]/90 backdrop-blur-xl border border-white/[0.08] hover:border-amber-400/35 p-6 transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_16px_40px_rgba(245,158,11,0.12)] flex flex-col justify-between ${
                isWide ? 'md:col-span-2' : ''
              }`}
            >
              {/* Top Row: Verb & Scope */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] group-hover:border-amber-400/30 transition-colors">
                      <Icon className={`w-5 h-5 ${action.accentColor}`} />
                    </div>
                    <span className="font-mono text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                      {action.verb}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.06]">
                    OPERATION #{idx + 1}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {action.scope}
                </p>

                {/* Threat Example Box */}
                <div className="p-3 rounded-2xl bg-rose-500/[0.06] border border-rose-500/20 mb-4">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-rose-200/90 leading-snug">
                      {action.threatExample}
                    </span>
                  </div>
                </div>
              </div>

              {/* Mastyf Defense Gate */}
              <div className="pt-3 border-t border-white/[0.06]">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs font-medium text-slate-300 leading-snug">
                    <span className="text-amber-400 font-semibold">Mastyf Gate:</span> {action.mastyfGate}
                  </span>
                </div>
              </div>
            </div>
            </RevealOnScroll>
          );
        })}
      </div>

      {/* Bottom Summary Strip */}
      <div className="rounded-3xl bg-gradient-to-r from-amber-500/10 via-[#080d1a] to-cyan-500/10 border border-amber-400/25 p-6 sm:p-8 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">
            Ready to secure your AI tool execution perimeter?
          </h3>
          <p className="text-xs sm:text-sm text-slate-300">
            Scan your active agent setup in under 30 seconds with no credentials required.
          </p>
        </div>
        <Link
          href="#check-agent"
          className="shrink-0 inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-semibold text-black bg-amber-400 hover:bg-amber-300 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)]"
        >
          <span>Run Free Scan</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  );
}
