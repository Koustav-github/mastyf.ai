'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, ShieldCheck, ShieldAlert, Cpu, ArrowRight, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BorderBeam } from '@/components/ui/border-beam';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { TextReveal } from '@/components/ui/text-reveal';
import { MotionTrace } from '@/components/ui/motion-trace';

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
    name: 'Path Traversal Attempt',
    category: 'SENSITIVE SYSTEM ACCESS',
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
    name: 'Authorized Read Query',
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
    name: 'Encoded Metadata SSRF',
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
    name: 'Unmanaged Shell Injection',
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
  const [showTraceVisualizer, setShowTraceVisualizer] = useState<boolean>(false);

  const activeScenario = SCENARIOS.find((s) => s.id === selectedScenarioId) || SCENARIOS[0];

  useEffect(() => {
    setActiveStep(0);
    setIsEvaluating(true);

    const t1 = setTimeout(() => setActiveStep(1), 220);
    const t2 = setTimeout(() => setActiveStep(2), 440);
    const t3 = setTimeout(() => setActiveStep(3), 660);
    const t4 = setTimeout(() => setActiveStep(4), 880);
    const t5 = setTimeout(() => setIsEvaluating(false), 1050);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [selectedScenarioId]);

  return (
    <section className="hero-exec-section">
      <div className="hero-exec-container">
        {/* Editorial Eyebrow & Brand */}
        <div className="hero-exec-header">
          <div className="hero-eyebrow-badge">
            <span className="eyebrow-dot" />
            <span>AGENT EXECUTION SECURITY</span>
          </div>

          <h1 className="hero-h1">
            <TextReveal
              text="Your AI can propose."
              highlightWords={['propose.']}
              highlightClass="text-slate-300 font-extrabold"
            />
            <br />
            <em>
              <TextReveal
                text="Mastyf decides what executes."
                delay={0.3}
                highlightWords={['executes.']}
                highlightClass="text-amber-400 font-extrabold not-italic"
              />
            </em>
          </h1>

          <p className="hero-subheadline">
            Put a hardened security boundary between autonomous agents and the tools that can read data,
            change systems, call APIs or spend money.
          </p>

          {/* Primary Dominant Conversion Action */}
          <div className="hero-cta-group">
            <Link href="#check-agent" className="btn-dominant-hero">
              <span className="btn-dominant-text">Check Your Agent</span>
              <span className="btn-dominant-arrow">-&gt;</span>
            </Link>

            <Link href="#deploy" className="btn-secondary-hero">
              Deploy Mastyf
            </Link>

            <Link href="/research" className="hero-research-link">
              Read the Research Paper
            </Link>
          </div>

          <div className="hero-frictionless-note">
            Free exposure scan. No credentials required. Runs in under 30 seconds.
          </div>
        </div>

        {/* Live Decision Engine Showcase */}
        <div className="engine-showcase-wrapper relative">
          <div className="engine-window relative overflow-hidden">
            {/* React Bits Border Beam */}
            <BorderBeam
              size={320}
              duration={10}
              borderWidth={1.5}
              colorFrom="#f59e0b"
              colorTo="#06b6d4"
            />

            {/* Top Toolbar */}
            <div className="engine-toolbar">
              <div className="engine-toolbar-left">
                <span className={`engine-live-pulse ${isEvaluating ? 'evaluating' : 'ready'}`} />
                <span className="engine-name">MASTYF DECISION ENGINE</span>
                <span className="engine-version-pill">RUNTIME GATEWAY v2.4</span>
              </div>
              <div className="engine-toolbar-right">
                <span className="latency-label">Pre-Dispatch Latency:</span>
                <span className="latency-val font-mono">
                  {isEvaluating ? (
                    'Evaluating...'
                  ) : (
                    <>
                      <AnimatedNumber value={activeScenario.executionMetrics.latencyUs} /> us
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Scenario Tabs */}
            <div className="engine-tabs-bar">
              {SCENARIOS.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setSelectedScenarioId(sc.id)}
                  className={`engine-tab-button ${selectedScenarioId === sc.id ? 'active' : ''}`}
                >
                  <span className="tab-indicator-dot" />
                  <span className="tab-title-text">{sc.name}</span>
                  <span className={`tab-verdict-tag ${sc.verdict.toLowerCase()}`}>
                    {sc.verdict}
                  </span>
                </button>
              ))}
            </div>

            {/* Engine Internal Evaluation Stage */}
            <div className="engine-stage-content">
              {/* Agent Ingress Box */}
              <div className="stage-card agent-ingress-card">
                <div className="card-top-label">
                  <span className="label-actor">AI AGENT ACTION PROPOSAL</span>
                  <span className="label-threat-cat">{activeScenario.category}</span>
                </div>
                <div className="card-code-block">
                  <div className="code-line">
                    <span className="syntax-keyword">propose:</span> {activeScenario.proposedAction}
                  </div>
                  <div className="code-line">
                    <span className="syntax-dim">target:</span> <span className="syntax-string">{activeScenario.target}</span>
                  </div>
                  <div className="code-comment">
                    # &quot;{activeScenario.agentRequest}&quot;
                  </div>
                </div>
              </div>

              {/* Connecting Flow Indicator */}
              <div className="stage-connector">
                <div className="connector-stem" />
                <div className="connector-chevron">v</div>
              </div>

              {/* Mastyf External Gate Checks */}
              <div className="stage-card mastyf-evaluation-card">
                <div className="card-top-label">
                  <span className="label-evaluator">MASTYF STRUCTURAL EVALUATION</span>
                  <span className="label-invariant">RULE: CBAC and Workflow and Capability and Destination</span>
                </div>

                <div className="structural-gates-grid">
                  <div className={`gate-cell ${activeStep >= 1 ? (activeScenario.gates.contract ? 'gate-pass' : 'gate-fail') : 'gate-idle'}`}>
                    <span className="gate-state-icon">{activeScenario.gates.contract ? '[+]' : '[x]'}</span>
                    <div className="gate-texts">
                      <span className="gate-label">Contract</span>
                      <span className="gate-subtext">{activeScenario.gates.contract ? 'Deterministic Match' : 'Unregistered Schema'}</span>
                    </div>
                  </div>

                  <div className={`gate-cell ${activeStep >= 2 ? (activeScenario.gates.capability ? 'gate-pass' : 'gate-fail') : 'gate-idle'}`}>
                    <span className="gate-state-icon">{activeScenario.gates.capability ? '[+]' : '[x]'}</span>
                    <div className="gate-texts">
                      <span className="gate-label">Capability</span>
                      <span className="gate-subtext">{activeScenario.gates.capability ? 'Scoped Permission' : 'Unbounded Sink'}</span>
                    </div>
                  </div>

                  <div className={`gate-cell ${activeStep >= 3 ? (activeScenario.gates.workflow ? 'gate-pass' : 'gate-fail') : 'gate-idle'}`}>
                    <span className="gate-state-icon">{activeScenario.gates.workflow ? '[+]' : '[x]'}</span>
                    <div className="gate-texts">
                      <span className="gate-label">Workflow</span>
                      <span className="gate-subtext">{activeScenario.gates.workflow ? 'State Monotonic' : 'Workflow Violation'}</span>
                    </div>
                  </div>

                  <div className={`gate-cell ${activeStep >= 4 ? (activeScenario.gates.destination ? 'gate-pass' : 'gate-fail') : 'gate-idle'}`}>
                    <span className="gate-state-icon">{activeScenario.gates.destination ? '[+]' : '[x]'}</span>
                    <div className="gate-texts">
                      <span className="gate-label">Destination</span>
                      <span className="gate-subtext">{activeScenario.gates.destination ? 'Authorized CIDR' : 'Prohibited Boundary'}</span>
                    </div>
                  </div>
                </div>

                {/* Verdict Banner */}
                <div className={`verdict-ribbon ${activeScenario.verdict.toLowerCase()}`}>
                  <div className="verdict-banner-left">
                    <span className="verdict-badge-pill">{activeScenario.verdict}</span>
                    <span className="verdict-reason-text">{activeScenario.verdictReason}</span>
                  </div>
                </div>

                {/* Downstream Execution Guarantee Strip (Precisely Scoped) */}
                <div className="execution-guarantee-strip">
                  <div className="guarantee-item">
                    <span className="guarantee-label">Downstream Payload Bytes Sent by Mastyf:</span>
                    <span className={`guarantee-val ${activeScenario.executionMetrics.downstreamPayloadBytes === 0 ? 'zero-val' : ''}`}>
                      <AnimatedNumber value={activeScenario.executionMetrics.downstreamPayloadBytes} /> bytes
                    </span>
                  </div>

                  <div className="guarantee-item">
                    <span className="guarantee-label">Downstream Execution Invocations:</span>
                    <span className="guarantee-val">
                      {activeScenario.executionMetrics.downstreamInvocations === 0
                        ? '0 downstream execution invocations'
                        : '1 authorized execution'}
                    </span>
                  </div>

                  <div className="guarantee-item">
                    <span className="guarantee-label">Cryptographic Evidence Receipt:</span>
                    <span className="guarantee-val monospace-val">
                      {activeScenario.executionMetrics.evidenceHash}
                    </span>
                  </div>
                </div>

                {/* Motion-Primitives Trace Visualizer Expand Button */}
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowTraceVisualizer(!showTraceVisualizer)}
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    <span>{showTraceVisualizer ? 'Hide Execution Trace' : 'Inspect Real-Time Execution Trace'}</span>
                    {showTraceVisualizer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <Badge variant="outline" className="text-[11px] text-slate-400 border-white/10">
                    Deterministic Interception
                  </Badge>
                </div>

                {/* Expandable Motion Trace */}
                <AnimatePresence>
                  {showTraceVisualizer && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-3 overflow-hidden"
                    >
                      <MotionTrace
                        scenarioName={activeScenario.name}
                        isAllowed={activeScenario.verdict === 'ALLOW'}
                        blockedReason={activeScenario.verdictReason}
                        downstreamPayloadBytes={activeScenario.executionMetrics.downstreamPayloadBytes}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Inter-Section Conversion Strip */}
            <div className="engine-inter-cta-bar">
              <span className="inter-cta-text">
                See what unmanaged capabilities and egress paths your agent exposes today.
              </span>
              <Link href="#check-agent" className="inter-cta-btn">
                Check Your Agent Now -&gt;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
