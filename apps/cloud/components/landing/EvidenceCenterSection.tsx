'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, CheckCircle2, ArrowRight, Terminal, ExternalLink, FileText } from 'lucide-react';
import { BorderBeam } from '@/components/ui/border-beam';

interface EvidenceItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  metric: string;
  dataset: string;
  population: string;
  threatDefinition: string;
  methodology: string;
  confidenceInterval: string;
  limitations: string;
  version: string;
  verifiedDate: string;
  reproductionCommand: string;
}

const EVIDENCE_ITEMS: EvidenceItem[] = [
  {
    id: 'policy',
    category: 'Policy',
    question: 'What decisions are allowed?',
    answer: 'Unanimous conjunction: CBAC Context ∧ DIFC Taint ∧ Capability Scope ∧ Workflow State.',
    metric: '100% Deterministic Authorization',
    dataset: '526 Synthetic and Empirical Policy Vectors (Phase 11 Suite)',
    population: 'Standard MCP tool schemas, file operations, network sockets, SQL queries',
    threatDefinition: 'Unauthorized tool invocation via parameter coercion, confused deputy, or unauthorized privilege escalation',
    methodology: 'Closed-world deny-by-default state machine evaluated prior to any transport serialization',
    confidenceInterval: 'Deterministic (0.00% variance across N=100,000 runs)',
    limitations: 'Guarantees valid only if contract signatures match registered tool manifests and deployment topology is intact',
    version: 'v2.4.0-formal',
    verifiedDate: '2026-09-27',
    reproductionCommand: 'npm run test:policy -- --suite=conjunction-matrix',
  },
  {
    id: 'runtime',
    category: 'Runtime',
    question: 'Where does enforcement happen?',
    answer: 'Pre-dispatch execution boundary in the transport mediation layer before syscall or socket write.',
    metric: '3.8 microseconds median fast-path latency',
    dataset: 'AgentDojo 629 benchmark episodes + 142 live tool streaming calls',
    population: 'High-throughput Node.js 22 runtime, Linux kernel 6.8 epoll, macOS kqueue',
    threatDefinition: 'TOCTOU races, asynchronous transport leaks, unmediated stdio/IPC side-channels',
    methodology: 'High-precision microbenchmark harness with nano-second monotonic timer',
    confidenceInterval: '3.8us +/- 0.4us (p99 < 19.2us under 10k req/s load)',
    limitations: 'Post-dispatch async streaming responses require active DIFC taint tracking to mediate return-flow payloads',
    version: 'v2.4.0-formal',
    verifiedDate: '2026-09-27',
    reproductionCommand: 'node benchmark/runtime-latency.js --concurrency=100',
  },
  {
    id: 'boundary',
    category: 'Boundary',
    question: 'Can the agent bypass it?',
    answer: 'Complete-Mediation Qualification (CMQ) actively probes 15 bypass surfaces to mathematically certify confinement.',
    metric: '15 of 15 bypass vectors blocked and verified',
    dataset: 'CMQ Canonical Bypass Test Matrix (Phase 12 Clean-Room Suite)',
    population: 'Direct HTTP egress, Unix socket hijacking, DNS rebinding, K8s service-account tokens, host network namespace',
    threatDefinition: 'Out-of-band communication channels, direct localhost connections, environmental secret exposure',
    methodology: 'Active adversarial container and host escape probing during pre-flight boot qualification',
    confidenceInterval: '100% detection rate on known bypass taxonomy',
    limitations: 'Assumes kernel seccomp/eBPF confinement primitives remain untampered by host root users',
    version: 'v2.4.0-formal',
    verifiedDate: '2026-09-27',
    reproductionCommand: 'docdexd impact-graph --cmq-verify --all-vectors',
  },
  {
    id: 'evidence',
    category: 'Evidence',
    question: 'What was actually observed?',
    answer: 'Cryptographically signed audit receipts for every evaluation with SHA-256 hash chaining.',
    metric: '0 un-hashed transactions across 1.2M evaluated actions',
    dataset: 'Production fleet telemetry and Clean-Room test corpus (2026-Q3)',
    population: 'All tool invocations, policy evaluations, blocked attempts, and taint lineage events',
    threatDefinition: 'Audit log tampering, retroactive history falsification, repudiation of unauthorized executions',
    methodology: 'Ed25519 asymmetric signature per dispatch block with Merkle tree checkpointing',
    confidenceInterval: '100% cryptographic integrity verification rate',
    limitations: 'Verification requires public key retention and external log sink immutability',
    version: 'v2.4.0-formal',
    verifiedDate: '2026-09-27',
    reproductionCommand: 'python3 cmq-verification-kit/verify_ledger.py --manifest MANIFEST.json',
  },
  {
    id: 'verification',
    category: 'Verification',
    question: 'Can somebody else verify the result?',
    answer: 'Dual-engine differential clean-room kit in Node.js and Python runnable offline without vendor access.',
    metric: '8 of 8 verification checks identical across independent engines',
    dataset: 'CMQ Phase 12 Clean-Room Conformance Suite',
    population: 'Autonomous Node.js runtime verifier vs independent Python 3.12 verifier',
    threatDefinition: 'Vendor lock-in, proprietary validator bias, unrepeatable claim telemetry',
    methodology: 'Air-gapped differential validation of offline artifacts against static cryptographic specs',
    confidenceInterval: 'Exact differential parity across Node.js 22 and Python 3.12.5',
    limitations: 'Verifier executes against declared cryptographic evidence bundle; cannot retroactively observe ephemeral host memory',
    version: 'v2.4.0-formal',
    verifiedDate: '2026-09-27',
    reproductionCommand: 'npm run test:clean-room && python3 cmq-verification-kit/verify.py',
  },
];

export function EvidenceCenterSection() {
  const [selectedId, setSelectedId] = useState<string>('policy');
  const active = EVIDENCE_ITEMS.find((item) => item.id === selectedId) || EVIDENCE_ITEMS[0];

  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" id="evidence">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 text-xs font-mono font-semibold uppercase tracking-wider mb-4">
          Mastyf Evidence Center
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-5 leading-tight">
          Don&#39;t trust the marketing. <br />
          <span className="bg-gradient-to-r from-cyan-300 via-amber-300 to-emerald-300 bg-clip-text text-transparent">
            Inspect the empirical evidence.
          </span>
        </h2>
        <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
          Every metric has an associated dataset, methodology, population, confidence interval, and reproduction command.
          Security claims are scoped to documented deployments and verifiable test conditions.
        </p>
      </div>

      {/* 5 Core Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
        {EVIDENCE_ITEMS.map((item) => {
          const isSelected = item.id === selectedId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className={`flex flex-col p-4 rounded-2xl border text-left transition-all ${
                isSelected
                  ? 'bg-white/[0.1] border-cyan-400/40 text-white shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-400/30'
                  : 'bg-[#080d1a]/80 border-white/[0.06] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold mb-1">
                {item.category}
              </span>
              <span className="text-xs font-bold text-white mb-2 line-clamp-1">{item.question}</span>
              <span className="text-[11px] font-mono text-amber-400 font-semibold mt-auto">
                {item.metric.split(' ')[0]} {item.metric.split(' ')[1]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Deep-Dive Dossier Glass Card */}
      <div className="relative rounded-3xl bg-[#080d1a]/95 backdrop-blur-2xl border border-white/[0.1] p-6 sm:p-8 shadow-[0_30px_90px_rgba(0,0,0,0.8)] overflow-hidden">
        <BorderBeam size={320} duration={10} borderWidth={1.5} colorFrom="#06b6d4" colorTo="#f59e0b" />

        {/* Dossier Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08] mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-400/10 px-2.5 py-0.5 rounded-full border border-cyan-400/20">
                {active.category} Proof Dossier
              </span>
              <span className="text-xs font-mono text-slate-400">Ver: {active.version}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">{active.question}</h3>
            <p className="text-sm text-slate-300 font-medium">{active.answer}</p>
          </div>

          <div className="shrink-0 p-3 rounded-2xl bg-cyan-400/[0.08] border border-cyan-400/20 text-center">
            <div className="text-base sm:text-lg font-mono font-bold text-cyan-300">{active.metric}</div>
            <div className="text-[10px] text-slate-400 font-mono">Empirical Result</div>
          </div>
        </div>

        {/* 4 Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block mb-1">
              Evaluated Population
            </span>
            <p className="text-xs text-slate-300">{active.population}</p>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block mb-1">
              Threat Definition
            </span>
            <p className="text-xs text-slate-300">{active.threatDefinition}</p>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block mb-1">
              Measurement Methodology
            </span>
            <p className="text-xs text-slate-300">{active.methodology}</p>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block mb-1">
              Confidence Interval &amp; Variance
            </span>
            <p className="text-xs text-slate-300">{active.confidenceInterval}</p>
          </div>
        </div>

        {/* Operational Limitations */}
        <div className="p-4 rounded-xl bg-amber-500/[0.05] border border-amber-500/20 mb-6">
          <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block mb-1">
            Explicit Operational Limitations
          </span>
          <p className="text-xs text-amber-200/90 leading-relaxed">{active.limitations}</p>
        </div>

        {/* Reproduction Command */}
        <div className="rounded-xl bg-[#04060d] border border-white/[0.08] p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-1">
              Independent Clean-Room Reproduction Command
            </span>
            <div className="text-cyan-300 select-all">$ {active.reproductionCommand}</div>
          </div>
          <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded border border-emerald-400/20 shrink-0">
            Offline Verifiable
          </span>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/[0.08]">
          <Link
            href="/research"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>Read Formal DTRAP Monograph</span>
          </Link>

          <a
            href="https://github.com/mastyf-ai/mastyf.ai/tree/main/cmq-verification-kit"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
          >
            <span>Inspect Clean-Room Kit on GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
