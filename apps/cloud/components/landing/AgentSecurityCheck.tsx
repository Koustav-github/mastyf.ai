'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShieldAlert, Terminal, Copy, Check, AlertTriangle, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    subtitle: 'Anthropic CLI & Terminal Development Agent',
    category: 'DEVELOPER WORKSPACE AGENT',
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
    subtitle: 'IDE Multi-File Code Generation & Terminal Agent',
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
    category: 'MULTI-TRANSPORT TOOL FABRIC',
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
    subtitle: 'Autonomous Customer Service & SRE Operational Agent',
    category: 'AUTONOMOUS FLEET AGENT',
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
    subtitle: 'LangGraph, AutoGen, CrewAI, or Custom Python/TypeScript Agent',
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
    <section className="agent-check-section" id="check-agent">
      <div className="section-container">
        {/* Section Title */}
        <div className="section-header">
          <div className="section-tag">FREE AGENT SECURITY CHECK</div>
          <h2 className="section-title">
            See what your AI can actually do.
          </h2>
          <p className="section-subtitle">
            Autonomous agents connect to terminal tools, file systems, databases, and APIs.
            Choose an environment below to inspect its unmanaged capabilities and attack surface.
          </p>
        </div>

        {/* Environment Selector Strip */}
        <div className="env-selector-tabs">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPresetId(p.id)}
              className={`env-tab-button ${selectedPresetId === p.id ? 'active' : ''}`}
            >
              <div className="env-tab-category">{p.category}</div>
              <div className="env-tab-name">{p.name}</div>
            </button>
          ))}
        </div>

        {/* Audit Results Container */}
        <div className="agent-audit-dossier relative overflow-hidden">
          {/* Subtle Border Beam for high visual appeal */}
          <BorderBeam
            size={360}
            duration={12}
            borderWidth={1.5}
            colorFrom="#06b6d4"
            colorTo="#f59e0b"
          />

          {/* Header & Verification Scope Badges */}
          <div className="dossier-top-bar">
            <div className="dossier-identity">
              <span className="dossier-preset-name">{activePreset.name}</span>
              <span className="dossier-subtitle">{activePreset.subtitle}</span>
            </div>

            {/* Strict Scope Labeling to Eliminate Confusion */}
            <div className="dossier-badges-group">
              <Badge variant="warning" className="text-xs">
                SIMULATED - DEMO DATA
              </Badge>
              <Badge variant="outline" className="text-xs font-mono text-cyan-300 border-cyan-500/30 bg-cyan-500/5">
                Run Actual Scan: npx @mastyf/gateway audit
              </Badge>
            </div>
          </div>

          <div className="dossier-disclaimer-box">
            <strong>Simulation Notice:</strong> This interactive view displays the typical capability inventory
            and vulnerability profile observed in default {activePreset.name} installations. For a real, non-simulated
            scan of your actual local environment, execute the CLI audit command below.
          </div>

          {/* 5 Core Metric Cards with Animated Countups */}
          <div className="dossier-metrics-row">
            <div className="dossier-metric-card">
              <span className="metric-count">
                <AnimatedNumber value={activePreset.toolsDetected} />
              </span>
              <span className="metric-title">Tools Detected</span>
              <span className="metric-context">Available execution sinks</span>
            </div>

            <div className="dossier-metric-card metric-card-warn">
              <span className="metric-count count-warn">
                <AnimatedNumber value={activePreset.highImpactCapabilities} />
              </span>
              <span className="metric-title">High-Impact Capabilities</span>
              <span className="metric-context">Shell, write, or mutation</span>
            </div>

            <div className="dossier-metric-card metric-card-warn">
              <span className="metric-count count-warn">
                <AnimatedNumber value={activePreset.unrestrictedDestinations} />
              </span>
              <span className="metric-title">Unrestricted Destinations</span>
              <span className="metric-context">Direct network socket egress</span>
            </div>

            <div className="dossier-metric-card metric-card-warn">
              <span className="metric-count count-warn">
                <AnimatedNumber value={activePreset.credentialPaths} />
              </span>
              <span className="metric-title">Credential Exposure Paths</span>
              <span className="metric-context">Ambient environment secrets</span>
            </div>

            <div className="dossier-metric-card metric-card-danger">
              <span className="metric-count count-danger">
                <AnimatedNumber value={activePreset.unmanagedExecutionPolicies} />
              </span>
              <span className="metric-title">Lacking Execution Policy</span>
              <span className="metric-context">No runtime authorization layer</span>
            </div>
          </div>

          {/* Detailed Findings & Recommendations Two-Column Grid */}
          <div className="dossier-detail-grid">
            <div className="detail-col detail-col-findings">
              <div className="detail-col-header">
                <span className="col-status-tag tag-warning">EXPOSURE FINDINGS</span>
                <h4>Observed Risk Surfaces</h4>
              </div>
              <ul className="dossier-list findings-list">
                {activePreset.auditFindings.map((finding, idx) => (
                  <li key={idx}>
                    <span className="list-icon icon-warn">[!]</span>
                    <span className="list-text">{finding}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="detail-col detail-col-recommendations">
              <div className="detail-col-header">
                <span className="col-status-tag tag-success">MASTYF ENFORCEMENT</span>
                <h4>Recommended Controls</h4>
              </div>
              <ul className="dossier-list recommendations-list">
                {activePreset.recommendations.map((rec, idx) => (
                  <li key={idx}>
                    <span className="list-icon icon-pass">[+]</span>
                    <span className="list-text">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Action Footer */}
          <div className="dossier-action-footer">
            <div className="cli-quickrun-block">
              <span className="cli-label">Run actual audit on your local agent:</span>
              <div className="cli-command-box">
                <code>npx @mastyf/gateway audit --local</code>
                <button type="button" onClick={handleCopyCLI} className="btn-copy-command">
                  {copiedCLI ? 'Copied Command!' : 'Copy Command'}
                </button>
              </div>
            </div>

            <div className="action-buttons-group">
              <Link href="#deploy" className="btn-dominant-hero">
                Secure This Agent with Mastyf -&gt;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
