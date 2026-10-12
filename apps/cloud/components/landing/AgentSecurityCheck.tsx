'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShieldAlert, Terminal, Copy, Check, AlertTriangle, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { BorderBeam } from '@/components/ui/border-beam';
import { AnimatedNumber } from '@/components/ui/animated-number';

interface EnvironmentPreset {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  toolsDetected: number;
  highImpactCapabilities: number;
  unrestrictedDestinations: number;
  credentialPaths: number;
  unmanagedExecutionPolicies: number;
  auditFindings: string[];
  recommendations: string[];
}

const PRESETS: EnvironmentPreset[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    subtitle: 'Anthropic CLI & Terminal Agent',
    category: 'DEVELOPER WORKSPACE',
    toolsDetected: 17,
    highImpactCapabilities: 3,
    unrestrictedDestinations: 2,
    credentialPaths: 1,
    unmanagedExecutionPolicies: 4,
    auditFindings: [
      'Direct host shell execution without command argument sandboxing',
      'Unrestricted filesystem write permissions spanning parent directories',
      'Direct HTTP egress route capable of reaching loopback and private subnets',
      'Environment secrets ($AWS_SECRET_ACCESS_KEY, $GITHUB_TOKEN) exposed to sub-processes',
    ],
    recommendations: [
      'Runtime authorization for all terminal and filesystem dispatches',
      'Destination confinement barring loopback and cloud metadata ranges',
      'Data-flow controls to prevent secret values entering tool arguments',
      'Boundary qualification to verify no host-level bypass paths exist',
    ],
  },
  {
    id: 'cursor',
    name: 'Cursor Composer',
    subtitle: 'IDE Multi-File Code Generation Agent',
    category: 'IDE EMBEDDED AGENT',
    toolsDetected: 12,
    highImpactCapabilities: 2,
    unrestrictedDestinations: 1,
    credentialPaths: 2,
    unmanagedExecutionPolicies: 3,
    auditFindings: [
      'Background terminal processes inherit entire developer environment',
      'SSH keys and gpg signing configurations accessible via relative paths',
      'No cryptographic ledger recording automated code modifications',
    ],
    recommendations: [
      'Context-based access control (CBAC) on file modification tools',
      'Process environment isolation removing ambient credentials',
      'Local execution boundary verifying tool invocations in <4 us',
    ],
  },
  {
    id: 'mcp-cluster',
    name: 'Production MCP Cluster',
    subtitle: 'Filesystem, PostgreSQL, GitHub & Internal Tool Servers',
    category: 'TOOL PROTOCOL CLUSTER',
    toolsDetected: 26,
    highImpactCapabilities: 5,
    unrestrictedDestinations: 3,
    credentialPaths: 3,
    unmanagedExecutionPolicies: 7,
    auditFindings: [
      'Database mutation queries execute without transaction validation',
      'GitHub pull request merges lack human quorum policy enforcement',
      'Multiple MCP server transports communicate over unauthenticated stdio/IPC',
    ],
    recommendations: [
      'Centralized external authorization for all MCP tools/call dispatches',
      'Dynamic information-flow control (DIFC) preventing tainted data egress',
      'CMQ qualification of all containerized tool server sidecars',
    ],
  },
  {
    id: 'production-agent',
    name: 'Production Cloud Agent',
    subtitle: 'Autonomous Customer Service & SRE Agent',
    category: 'AUTONOMOUS FLEET',
    toolsDetected: 19,
    highImpactCapabilities: 4,
    unrestrictedDestinations: 2,
    credentialPaths: 1,
    unmanagedExecutionPolicies: 5,
    auditFindings: [
      'Agent state machine triggers third-party webhooks with customer PII',
      'Cloud CLI tools can execute configuration updates on production clusters',
      'No external boundary verifying whether agent can bypass gateway via hostNetwork',
    ],
    recommendations: [
      'Strict execution policy matching least-privilege role specifications',
      'Automated CMQ boundary test suite probing container egress vectors',
      'Cryptographic tamper-evident audit receipts for external compliance',
    ],
  },
  {
    id: 'custom',
    name: 'Custom Agent Stack',
    subtitle: 'LangGraph, AutoGen, CrewAI, or Python/TS Stack',
    category: 'CUSTOM ORCHESTRATION',
    toolsDetected: 14,
    highImpactCapabilities: 3,
    unrestrictedDestinations: 2,
    credentialPaths: 2,
    unmanagedExecutionPolicies: 4,
    auditFindings: [
      'Tool dispatcher executes functions directly in Node.js/Python event loop',
      'Unchecked string interpolation permits SQL and command injection',
      'Missing execution certainty semantics under network timeout conditions',
    ],
    recommendations: [
      'Wrap dispatch loop in Mastyf fast-path proxy adapter',
      'Enforce monotonic state invariants on all critical workflows',
      'Audit package trust scores before loading third-party tool packages',
    ],
  },
];

export function AgentSecurityCheck() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('claude-code');
  const [copiedCLI, setCopiedCLI] = useState<boolean>(false);

  const activePreset = PRESETS.find((p) => p.id === selectedPresetId) || PRESETS[0];

  const handleCopyCLI = () => {
    navigator.clipboard.writeText('npx @mastyf/gateway audit --local');
    setCopiedCLI(true);
    setTimeout(() => setCopiedCLI(false), 2000);
  };

  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" id="check-agent">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-mono font-semibold uppercase tracking-wider mb-4">
          Free Agent Exposure Scan
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-5 leading-tight">
          See what your AI can actually do.
        </h2>
        <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
          Autonomous agents connect to terminal tools, filesystems, databases, and APIs.
          Select an environment to inspect its unmanaged capabilities and attack surface.
        </p>
      </div>

      {/* Environment Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 justify-start lg:justify-center">
        {PRESETS.map((p) => {
          const isSelected = selectedPresetId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPresetId(p.id)}
              className={`flex flex-col px-4 py-2.5 rounded-2xl border text-left shrink-0 transition-all ${
                isSelected
                  ? 'bg-white/[0.1] border-amber-400/40 text-white shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-400/30'
                  : 'bg-[#080d1a]/80 border-white/[0.06] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <span className="text-[9px] font-mono uppercase tracking-wider text-amber-400 font-bold mb-0.5">
                {p.category}
              </span>
              <span className="text-xs font-bold text-white">{p.name}</span>
            </button>
          );
        })}
      </div>

      {/* Audit Dossier Container */}
      <div className="relative rounded-3xl bg-[#080d1a]/95 backdrop-blur-2xl border border-white/[0.1] p-6 sm:p-8 shadow-[0_30px_90px_rgba(0,0,0,0.8)] overflow-hidden">
        <BorderBeam size={320} duration={10} borderWidth={1.5} colorFrom="#f59e0b" colorTo="#06b6d4" />

        {/* Top Status Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08] mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-2xl font-bold text-white">{activePreset.name}</h3>
              <span className="text-xs font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                Exposure Profile
              </span>
            </div>
            <p className="text-xs text-slate-400">{activePreset.subtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.08]">
              Simulated Baseline Data
            </span>
          </div>
        </div>

        {/* 5 Core Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
          <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] text-center">
            <div className="text-2xl sm:text-3xl font-mono font-extrabold text-white mb-1">
              <AnimatedNumber value={activePreset.toolsDetected} />
            </div>
            <div className="text-xs font-semibold text-slate-300 mb-0.5">Tools Detected</div>
            <div className="text-[10px] text-slate-400">Execution sinks</div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/[0.08] border border-amber-500/25 text-center">
            <div className="text-2xl sm:text-3xl font-mono font-extrabold text-amber-400 mb-1">
              <AnimatedNumber value={activePreset.highImpactCapabilities} />
            </div>
            <div className="text-xs font-semibold text-amber-300 mb-0.5">High-Impact Sinks</div>
            <div className="text-[10px] text-amber-400/70">Shell, write, mutate</div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/[0.08] border border-amber-500/25 text-center">
            <div className="text-2xl sm:text-3xl font-mono font-extrabold text-amber-400 mb-1">
              <AnimatedNumber value={activePreset.unrestrictedDestinations} />
            </div>
            <div className="text-xs font-semibold text-amber-300 mb-0.5">Egress Routes</div>
            <div className="text-[10px] text-amber-400/70">Unrestricted sockets</div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-500/[0.08] border border-rose-500/25 text-center">
            <div className="text-2xl sm:text-3xl font-mono font-extrabold text-rose-400 mb-1">
              <AnimatedNumber value={activePreset.credentialPaths} />
            </div>
            <div className="text-xs font-semibold text-rose-300 mb-0.5">Secret Paths</div>
            <div className="text-[10px] text-rose-400/70">Ambient environment</div>
          </div>

          <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-rose-500/[0.08] border border-rose-500/25 text-center">
            <div className="text-2xl sm:text-3xl font-mono font-extrabold text-rose-400 mb-1">
              <AnimatedNumber value={activePreset.unmanagedExecutionPolicies} />
            </div>
            <div className="text-xs font-semibold text-rose-300 mb-0.5">Missing Policies</div>
            <div className="text-[10px] text-rose-400/70">No CBAC rules</div>
          </div>
        </div>

        {/* Two-Column Findings & Recommendations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Findings */}
          <div className="p-5 rounded-2xl bg-black/40 border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Observed Exposure Vectors
              </h4>
            </div>
            <div className="space-y-2.5">
              {activePreset.auditFindings.map((finding, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 mt-1.5" />
                  <span className="leading-relaxed">{finding}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="p-5 rounded-2xl bg-black/40 border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Mastyf Defense Remediations
              </h4>
            </div>
            <div className="space-y-2.5">
              {activePreset.recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live CLI Scan Terminal Box */}
        <div className="rounded-2xl bg-[#04060d] border border-white/[0.08] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-400/10 text-amber-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white mb-0.5">
                Scan your real machine in under 30 seconds
              </div>
              <div className="font-mono text-xs text-cyan-300 select-all">
                $ npx @mastyf/gateway audit --local
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyCLI}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/[0.12] transition-colors"
          >
            {copiedCLI ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied Command</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Command</span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
