'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, ShieldAlert, Cpu, ArrowRight, CheckCircle2, XCircle, Terminal, Lock, Activity, Sparkles } from 'lucide-react';
import { BorderBeam } from '@/components/ui/border-beam';
import { AnimatedNumber } from '@/components/ui/animated-number';

interface DecisionScenario {
  id: string;
  name: string;
  category: string;
  agentRequest: string;
  proposedAction: string;
  target: string;
  gates: {
    contract: boolean;
    capability: boolean;
    workflow: boolean;
    destination: boolean;
  };
  verdict: 'BLOCK' | 'ALLOW';
  verdictReason: string;
  executionMetrics: {
    downstreamPayloadBytes: number;
    downstreamInvocations: number;
    latencyUs: number;
    evidenceHash: string;
  };
}

const SCENARIOS: DecisionScenario[] = [
  {
    id: 'traversal',
    name: 'Path Traversal',
    category: 'CREDENTIAL LEAK PREVENTION',
    agentRequest: 'Read /etc/passwd to resolve system user accounts',
    proposedAction: 'resources/read',
    target: 'file:///etc/passwd',
    gates: {
      contract: true,
      capability: true,
      workflow: true,
      destination: false,
    },
    verdict: 'BLOCK',
    verdictReason: 'Destination prohibited: matches sensitive system credential boundary (/etc/passwd)',
    executionMetrics: {
      downstreamPayloadBytes: 0,
      downstreamInvocations: 0,
      latencyUs: 42,
      evidenceHash: 'sha256:8f4c21...d09e',
    },
  },
  {
    id: 'db_query',
    name: 'Authorized SQL Query',
    category: 'CUSTOMER DATABASE WORKFLOW',
    agentRequest: 'Lookup invoice status for customer_id #8921',
    proposedAction: 'tools/call (sql_query)',
    target: 'postgres:///billing/invoices?id=8921',
    gates: {
      contract: true,
      capability: true,
      workflow: true,
      destination: true,
    },
    verdict: 'ALLOW',
    verdictReason: 'All structural authorities satisfied (CBAC and Workflow and Capability and Destination)',
    executionMetrics: {
      downstreamPayloadBytes: 148,
      downstreamInvocations: 1,
      latencyUs: 58,
      evidenceHash: 'sha256:c39a01...7f11',
    },
  },
  {
    id: 'ssrf',
    name: 'Hex-Encoded SSRF',
    category: 'CLOUD METADATA EXFILTRATION',
    agentRequest: 'Fetch instance configuration from alternate hex IP',
    proposedAction: 'resources/read',
    target: 'http://0x7f000001:8080/metadata',
    gates: {
      contract: true,
      capability: false,
      workflow: true,
      destination: false,
    },
    verdict: 'BLOCK',
    verdictReason: 'Address normalization decoded 0x7f000001 to 127.0.0.1; loopback SSRF blocked pre-dispatch',
    executionMetrics: {
      downstreamPayloadBytes: 0,
      downstreamInvocations: 0,
      latencyUs: 36,
      evidenceHash: 'sha256:10e5bc...aa38',
    },
  },
  {
    id: 'priv_exec',
    name: 'Shell Injection',
    category: 'UNBOUNDED CODE EXECUTION',
    agentRequest: 'Execute background cleanup script in host shell',
    proposedAction: 'tools/call (bash_exec)',
    target: 'system:///bin/bash -c "rm -rf /tmp/*"',
    gates: {
      contract: false,
      capability: false,
      workflow: true,
      destination: false,
    },
    verdict: 'BLOCK',
    verdictReason: 'No registered capability contract permits unconstrained shell invocation',
    executionMetrics: {
      downstreamPayloadBytes: 0,
      downstreamInvocations: 0,
      latencyUs: 29,
      evidenceHash: 'sha256:4a7e91...5b20',
    },
  },
];

export function HeroExecutionBoundary() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('traversal');
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  const activeScenario = SCENARIOS.find((s) => s.id === selectedScenarioId) || SCENARIOS[0];

  useEffect(() => {
    setActiveStep(0);
    setIsEvaluating(true);

    const t1 = setTimeout(() => setActiveStep(1), 180);
    const t2 = setTimeout(() => setActiveStep(2), 360);
    const t3 = setTimeout(() => setActiveStep(3), 540);
    const t4 = setTimeout(() => setActiveStep(4), 720);
    const t5 = setTimeout(() => setIsEvaluating(false), 900);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [selectedScenarioId]);

  return (
    <section className="relative pt-28 sm:pt-36 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
      {/* Background glow highlights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-amber-500/15 via-indigo-500/10 to-transparent blur-[120px] pointer-events-none rounded-full" />

      {/* Hero Narrative Block */}
      <div className="text-center max-w-4xl mx-auto mb-14 sm:mb-18">
        {/* Eyebrow Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-400/10 via-amber-400/15 to-transparent border border-amber-400/30 shadow-[0_0_20px_rgba(245,158,11,0.12)] mb-6">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs font-mono font-semibold tracking-wider text-amber-300 uppercase">
            Agent Execution Security
          </span>
          <span className="text-[10px] font-mono text-slate-400 border-l border-white/10 pl-2">
            Deterministic Wire Severance
          </span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08] sm:leading-[1.05] mb-6">
          Your AI can propose. <br />
          <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-200 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(245,158,11,0.3)]">
            Mastyf decides what executes.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed mb-8 font-normal">
          An externally enforced security layer between autonomous AI agents and tools that can
          read databases, modify files, call APIs, or spend money.
        </p>

        {/* CTA Group */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-5">
          <Link
            href="#check-agent"
            className="group relative inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-semibold tracking-tight text-[#050508] bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-[length:200%_auto] hover:bg-[position:right_center] transition-all duration-300 shadow-[0_0_28px_rgba(245,158,11,0.35)] hover:shadow-[0_0_36px_rgba(245,158,11,0.55)] border border-amber-200"
          >
            <span>Check Your Agent</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="#deploy"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-slate-200 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.12] hover:border-white/[0.2] backdrop-blur-md transition-all"
          >
            <Terminal className="w-4 h-4 text-amber-400" />
            <span>Developer Quickstart</span>
          </Link>

          <Link
            href="/research"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            <span>Read Research Paper</span>
            <span className="text-xs text-amber-400 font-mono">DTRAP</span>
          </Link>
        </div>

        {/* Guarantee subtext */}
        <p className="text-xs text-slate-400 font-mono">
          Free vulnerability and exposure scan · Zero credentials needed · Runs in under 30 seconds
        </p>
      </div>

      {/* Live Interactive Decision Engine Console */}
      <div className="relative max-w-4xl mx-auto">
        <div className="relative rounded-3xl bg-[#080d1a]/95 backdrop-blur-2xl border border-white/[0.12] shadow-[0_30px_90px_rgba(0,0,0,0.85)] overflow-hidden">
          {/* Magic UI Border Beam */}
          <BorderBeam size={280} duration={8} borderWidth={1.5} colorFrom="#f59e0b" colorTo="#06b6d4" />

          {/* Console Top Toolbar */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-black/40 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${isEvaluating ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 shadow-[0_0_10px_#10b981]'}`} />
              <span className="font-mono text-xs font-bold text-white tracking-wider">MASTYF DECISION CORE</span>
              <span className="font-mono text-[10px] font-semibold text-amber-400/90 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                PRE-DISPATCH v2.4
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Latency:</span>
              <span className="font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                {isEvaluating ? 'Evaluating...' : <><AnimatedNumber value={activeScenario.executionMetrics.latencyUs} /> µs</>}
              </span>
            </div>
          </div>

          {/* Scenario Selection Tabs */}
          <div className="p-3 bg-black/20 border-b border-white/[0.06] overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              {SCENARIOS.map((sc) => {
                const isSelected = selectedScenarioId === sc.id;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setSelectedScenarioId(sc.id)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-white/[0.1] text-white border border-white/[0.15] shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-400' : 'bg-slate-600'}`} />
                    <span>{sc.name}</span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        sc.verdict === 'BLOCK'
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {sc.verdict}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Evaluation Stage Body */}
          <div className="p-5 sm:p-6 space-y-4">
            {/* Step 1: Agent Proposal */}
            <div className="rounded-2xl bg-black/40 border border-white/[0.08] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-amber-400" />
                  Agent Tool Proposal
                </span>
                <span className="text-[10px] font-mono text-amber-400/80 bg-amber-400/5 px-2 py-0.5 rounded border border-amber-400/15">
                  {activeScenario.category}
                </span>
              </div>
              <div className="font-mono text-xs space-y-1 bg-[#05070e] p-3 rounded-xl border border-white/[0.04]">
                <div>
                  <span className="text-amber-400 font-semibold">action:</span>{' '}
                  <span className="text-slate-200">{activeScenario.proposedAction}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">target:</span>{' '}
                  <span className="text-cyan-300">{activeScenario.target}</span>
                </div>
                <div className="text-slate-400 text-[11px] pt-1">
                  # {activeScenario.agentRequest}
                </div>
              </div>
            </div>

            {/* Step 2: 4-Gate Structural Evaluation */}
            <div className="rounded-2xl bg-black/40 border border-white/[0.08] p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Mastyf 4-Gate Structural Perimeter
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  RULE: CBAC ∧ Workflow ∧ Capability ∧ Destination
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { key: 'contract', label: 'Contract', step: 1, passText: 'Deterministic Schema', failText: 'Schema Mismatch' },
                  { key: 'capability', label: 'Capability', step: 2, passText: 'Scoped Permission', failText: 'Unbounded Sink' },
                  { key: 'workflow', label: 'Workflow', step: 3, passText: 'State Monotonic', failText: 'Workflow Breach' },
                  { key: 'destination', label: 'Destination', step: 4, passText: 'Authorized CIDR', failText: 'Prohibited Boundary' },
                ].map((g) => {
                  const isChecked = activeStep >= g.step;
                  const isPassed = activeScenario.gates[g.key as keyof typeof activeScenario.gates];

                  return (
                    <div
                      key={g.key}
                      className={`p-3 rounded-xl border transition-all ${
                        !isChecked
                          ? 'bg-white/[0.02] border-white/[0.04] opacity-50'
                          : isPassed
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-rose-500/10 border-rose-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-white">{g.label}</span>
                        {isChecked ? (
                          isPassed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400" />
                          )
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-white/20 animate-pulse" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block line-clamp-1 font-mono">
                        {isChecked ? (isPassed ? g.passText : g.failText) : 'Pending...'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Verdict & Execution Guarantee */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                activeScenario.verdict === 'BLOCK'
                  ? 'bg-gradient-to-r from-rose-950/40 to-black border-rose-500/40'
                  : 'bg-gradient-to-r from-emerald-950/40 to-black border-emerald-500/40'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono text-xs font-extrabold px-3 py-1 rounded-full ${
                      activeScenario.verdict === 'BLOCK'
                        ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)]'
                        : 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                    }`}
                  >
                    VERDICT: {activeScenario.verdict}
                  </span>
                  <span className="text-xs text-slate-200 font-medium">
                    {activeScenario.verdictReason}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-xs font-mono border-t sm:border-t-0 sm:border-l border-white/10 pt-2 sm:pt-0 sm:pl-3">
                  <div>
                    <span className="text-slate-400">Bytes Sent: </span>
                    <span className={`font-bold ${activeScenario.executionMetrics.downstreamPayloadBytes === 0 ? 'text-emerald-400' : 'text-slate-200'}`}>
                      {activeScenario.executionMetrics.downstreamPayloadBytes} B
                    </span>
                  </div>
                  <div className="text-slate-500">|</div>
                  <span className="text-slate-400 text-[11px]">{activeScenario.executionMetrics.evidenceHash}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
