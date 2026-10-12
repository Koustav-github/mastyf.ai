'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Shield, 
  Workflow, 
  Layers, 
  Cpu, 
  Terminal, 
  FileCheck, 
  ArrowRight, 
  Lock, 
  Eye, 
  CheckCircle2, 
  Sparkles,
  Network,
  Database,
  Radio,
  Sliders
} from 'lucide-react';

const PIPELINE_GATES = [
  {
    step: 'Gate 01',
    name: 'Structural Relational Invariants',
    latency: '17.3 µs (P50)',
    focus: 'Deterministic Syntax & Typing',
    description: 'Evaluates four typed relational invariants (Destination Deviation, Scope Expansion, Privilege Overgrant, Secondary Side-Effects) on CPU without neural inference.',
    axiom: 'Astruct Containment',
    checks: [
      'Strict schema & JSON payload syntax validation',
      'Path containment (rejects /etc/passwd, .env, .. traversal)',
      'Monetary clamping & aggregate multi-slot offset bounds',
      'Destination FQDN allowlist & metadata SSRF containment'
    ]
  },
  {
    step: 'Gate 02',
    name: 'Capability-Based Access Control (CBAC)',
    latency: '< 4.8 µs',
    focus: 'Cryptographic Authorization',
    description: 'Every tool invocation must be accompanied by a valid, unexpired HMAC-signed capability token bound to the specific agent session and permitted parameter envelope.',
    axiom: 'Theorem 1: Complete Mediation',
    checks: [
      'HMAC-SHA256 capability token verification',
      'Session-bound capability envelope match',
      'Replay attack deterrence via monotonic nonces',
      'Fail-closed wire isolation (0 backend bytes on non-ALLOW)'
    ]
  },
  {
    step: 'Gate 03',
    name: 'Dynamic Information Flow Control (DIFC)',
    latency: '< 12 µs',
    focus: 'Cross-Tool Taint Tracking',
    description: 'Tracks data taint labels as information moves across tool outputs. Prevents an agent that ingested untrusted external documents from writing to sensitive internal storage.',
    axiom: 'Theorem 2: Non-Bypassability',
    checks: [
      'Explicit multi-tool taint propagation tracking',
      'Cross-tool exfiltration channel severance',
      'Declassification authorization validation',
      'Stateful Finite State Machine (FSM) sequence enforcement'
    ]
  },
  {
    step: 'Gate 04',
    name: 'Neural Semantic Auditor (Mastyf Guard 1.5B)',
    latency: '267.7 ms (CPU)',
    focus: 'Subordinate Semantic Ambiguity',
    description: 'When structural checks detect ambiguity, the frozen V6 boundary-sharpened model audits the tool invocation against intent context. Governed by Afinal ⊆ Astruct.',
    axiom: 'Afinal = Astruct ∩ Asemantic',
    checks: [
      'In-scope relational parameter poisoning detection',
      'Indirect prompt injection semantic boundary review',
      'Revocation authority only (cannot synthesize permission)',
      'Zero false positive guarantee on verified benign enterprise ops'
    ]
  }
];

const PLATFORM_COMPONENTS = [
  {
    id: 'shield',
    name: 'Mastyf Shield',
    badge: 'Desktop & Edge Appliance',
    tagline: 'Fail-closed execution appliance for local agents',
    icon: Shield,
    color: 'emerald',
    description: 'Packaged macOS & Linux desktop application that secures local developer assistants (Claude Desktop, Cursor, Windsurf) by placing a hardware-grade reference monitor directly on the MCP transport wire.',
    bullets: [
      'One-click installer for macOS (Apple Silicon / Intel) & Linux',
      'Automatic IDE config patching and wire interception',
      'Instant wire severance when policy violation is detected',
      'Ed25519 signed local execution audit trail'
    ]
  },
  {
    id: 'gateway',
    name: 'Mastyf Gateway',
    badge: 'Runtime Proxy',
    tagline: 'High-throughput execution security proxy',
    icon: Network,
    color: 'amber',
    description: 'The core server-side reverse proxy. Runs as a high-throughput Kubernetes sidecar, Docker container, or bare metal binary processing >330,000 req/s with microsecond CBAC capability verification.',
    bullets: [
      'Microsecond deterministic capability authorization (<4.8µs)',
      'Sub-millisecond fast-path throughput (>330k req/s)',
      'Fail-closed wire isolation on non-ALLOW (0 backend bytes)',
      'Open-source AGPL-3.0 self-hostable core'
    ]
  },
  {
    id: 'swarm',
    name: 'Mastyf Swarm',
    badge: 'Continuous Adversarial CI/CD',
    tagline: 'Automated red-teaming & continuous regression gates',
    icon: Radio,
    color: 'cyan',
    description: 'The adversarial testing suite. Automatically executes hundreds of evasion probes, multi-turn prompt injections, and mutation fixtures in CI/CD before any policy or agent changes reach production.',
    bullets: [
      'Continuous CI/CD automated red-teaming runner',
      '228-fixture regression corpus evaluated on every pull request',
      'Threat Lab human-in-the-loop attack mutation review',
      'Closed-loop feedback from runtime alerts into test fixtures'
    ]
  },
  {
    id: 'trust',
    name: 'Mastyf Trust',
    badge: 'MCP Supply-Chain Intelligence',
    tagline: 'Static risk and permission scanner for MCP servers',
    icon: Database,
    color: 'purple',
    description: 'The software supply-chain registry for Model Context Protocol servers. Evaluates npm packages, Docker images, and manifests for known CVEs, malicious author updates, and ambient permission surfaces.',
    bullets: [
      'Instant 0–100 static trust scoring for any MCP package',
      'Ambient permission blast radius & dependency mapping',
      'Automated CVE alerts and maintainer cadence tracking',
      'Embeddable dynamic status badges for package READMEs'
    ]
  },
  {
    id: 'control-plane',
    name: 'Mastyf Control Plane',
    badge: 'Enterprise Fleet Governance',
    tagline: 'Centralized fleet management and compliance evidence',
    icon: Sliders,
    color: 'rose',
    description: 'Central management console for enterprise agent fleets. Distribute policies across multi-cluster environments, maintain tamper-evident cryptographic execution receipts, and generate OWASP & NIST compliance packets.',
    bullets: [
      'Multi-cluster fleet policy distribution and live sync',
      'Tamper-evident Ed25519 verifiable execution receipts',
      'Automated compliance evidence generation (OWASP Agentic Top 10)',
      'Enterprise SSO, granular RBAC, and SIEM telemetry streaming'
    ]
  }
];

export function ModernPlatformArchitecture() {
  const [activeGate, setActiveGate] = useState<number>(0);
  const selectedGate = PIPELINE_GATES[activeGate];

  return (
    <section id="architecture" className="relative py-28 px-6 bg-[#03050a] text-slate-100">
      <div className="max-w-[1180px] mx-auto relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/[0.08] border border-cyan-500/20 text-cyan-400 text-xs font-mono tracking-wider uppercase mb-5">
            <Workflow className="w-3.5 h-3.5" />
            Execution Boundary Architecture
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-6">
            The 4-Gate Defense Pipeline.
          </h2>
          <p className="text-base md:text-lg text-slate-400 leading-relaxed">
            Every proposed agent tool call is mediated through a multi-stage validation pipeline. 
            Deterministic certainty is handled at microsecond speed; semantic ambiguity triggers subordinate neural verification.
          </p>
        </div>

        {/* 4-Gate Interactive Pipeline Viewer */}
        <div className="bg-slate-950/80 border border-white/[0.08] rounded-2xl p-6 md:p-8 mb-24 shadow-2xl backdrop-blur-xl">
          
          {/* Step Selector Bars */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {PIPELINE_GATES.map((gate, idx) => {
              const isActive = idx === activeGate;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveGate(idx)}
                  className={`p-4 rounded-xl text-left border transition-all duration-200 ${
                    isActive
                      ? 'bg-amber-500/[0.08] border-amber-500/30 shadow-lg'
                      : 'bg-slate-900/40 border-white/[0.04] hover:bg-white/[0.02] hover:border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1.5">
                    <span>{gate.step}</span>
                    <span className={`font-semibold ${isActive ? 'text-amber-400' : 'text-slate-500'}`}>{gate.latency}</span>
                  </div>
                  <div className={`text-sm font-bold tracking-tight leading-snug ${isActive ? 'text-white' : 'text-slate-300'}`}>
                    {gate.name}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Gate Expanded Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-900/50 rounded-xl p-6 md:p-8 border border-white/[0.04]">
            
            <div className="lg:col-span-7">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-mono px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                  {selectedGate.step} :: {selectedGate.focus}
                </span>
                <span className="text-xs font-mono text-cyan-300">
                  {selectedGate.axiom}
                </span>
              </div>

              <h3 className="text-xl md:text-2xl font-bold text-white mb-4">
                {selectedGate.name}
              </h3>

              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                {selectedGate.description}
              </p>

              <div className="space-y-2.5">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                  Enforced Runtime Invariants:
                </span>
                {selectedGate.checks.map((check, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{check}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Flow Graphic */}
            <div className="lg:col-span-5 bg-slate-950/80 border border-white/[0.06] rounded-xl p-6 font-mono text-xs text-slate-300">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-4 border-b border-white/[0.06] pb-2">
                Execution Flow State Machine
              </div>

              <div className="space-y-4">
                <div className="p-2.5 rounded bg-slate-900/80 border border-white/[0.04] flex items-center justify-between">
                  <span className="text-slate-400">Agent Proposal</span>
                  <span className="text-amber-400 font-semibold">ToolCall(args)</span>
                </div>

                <div className="text-center text-slate-600 text-sm">↓</div>

                <div className="p-3 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                  <div>
                    <span className="text-amber-300 font-bold block">{selectedGate.name}</span>
                    <span className="text-[10px] text-slate-400">{selectedGate.latency}</span>
                  </div>
                  <Lock className="w-4 h-4 text-amber-400" />
                </div>

                <div className="text-center text-slate-600 text-sm">↓</div>

                <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                  <div className="p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400">
                    <span className="font-bold block">NON-ALLOW</span>
                    <span>0 Backend Bytes</span>
                  </div>
                  <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    <span className="font-bold block">ALLOW</span>
                    <span>Dispatch Verified</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Section 2: The 5 Product Subsystems */}
        <div>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-mono uppercase tracking-wider text-amber-400 mb-2 block">
              Integrated Product Family
            </span>
            <h3 className="text-2xl md:text-4xl font-bold text-white mb-4">
              Complete Protection From Local IDE to Enterprise Cloud.
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Every component is built specifically to enforce the execution boundary across every tier of your AI agent stack.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PLATFORM_COMPONENTS.map((comp) => {
              const IconComp = comp.icon;
              return (
                <div 
                  key={comp.id}
                  className="bg-slate-950/70 border border-white/[0.08] hover:border-amber-500/30 rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between hover:shadow-2xl hover:shadow-amber-500/5 group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-slate-400 border border-white/[0.06]">
                        {comp.badge}
                      </span>
                    </div>

                    <h4 className="text-xl font-bold text-white mb-1 tracking-tight">{comp.name}</h4>
                    <p className="text-xs text-amber-400/90 font-mono mb-4">{comp.tagline}</p>
                    <p className="text-xs text-slate-300 leading-relaxed mb-6">{comp.description}</p>

                    <div className="space-y-2 mb-6">
                      {comp.bullets.map((b, i) => (
                        <div key={i} className="flex items-start gap-2 text-[11px] text-slate-400">
                          <span className="text-amber-400 font-bold">•</span>
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/[0.04]">
                    <Link
                      href={comp.id === 'shield' ? '/#scanner' : comp.id === 'gateway' ? '/developers' : '/pilot'}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors group-hover:translate-x-1"
                    >
                      <span>Explore {comp.name}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
