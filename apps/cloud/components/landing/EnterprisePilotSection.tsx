'use client';

import React from 'react';
import Link from 'next/link';

const ENTERPRISE_CONCERNS = [
  {
    title: 'Identity',
    question: 'Who is the agent acting for?',
    desc: 'Binds every tool execution request to an authenticated human principal, machine role, and cryptographically verified task session.',
    badge: 'Dual-Domain Binding',
  },
  {
    title: 'Authorization',
    question: 'What can it actually execute?',
    desc: 'Enforces external policy over tool calls before execution. Prevents parameter coercion, unauthorized SQL writes, and privilege escalation.',
    badge: 'Pre-Dispatch Policy',
  },
  {
    title: 'Isolation',
    question: 'Can it bypass the security boundary?',
    desc: 'CMQ mathematical qualification tests whether the container or runtime host has alternate network paths or direct socket routes around the gateway.',
    badge: 'CMQ Boundary Assurance',
  },
  {
    title: 'Evidence',
    question: 'Can security teams prove what happened?',
    desc: 'Generates immutable cryptographic receipts for every approved, blocked, or tainted execution, verifiable by external auditors.',
    badge: 'Cryptographic Ledger',
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
    desc: 'Place Mastyf in the dispatch path in monitor mode to capture baseline agent behavior with 0 disruption.',
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
    <section className="enterprise-pilot-section" id="enterprise">
      <div className="section-container">
        {/* Enterprise Pillars */}
        <div className="section-header">
          <div className="section-tag">Enterprise Governance &amp; Scale</div>
          <h2 className="section-title">
            Put AI agents into production <br />
            without giving them the keys.
          </h2>
          <p className="section-subtitle">
            Autonomous agents read internal documentation, execute code, query production stores, and interact with APIs.
            Mastyf provides the hardened execution perimeter enterprise security teams require.
          </p>
        </div>

        <div className="enterprise-concerns-grid">
          {ENTERPRISE_CONCERNS.map((c) => (
            <div key={c.title} className="concern-card">
              <div className="concern-badge">{c.badge}</div>
              <h3 className="concern-title">{c.title}</h3>
              <div className="concern-question">{c.question}</div>
              <p className="concern-desc">{c.desc}</p>
            </div>
          ))}
        </div>

        {/* Deployment Options Bar */}
        <div className="deployment-topology-strip">
          <div className="topology-title">Supported Enterprise Topologies:</div>
          <div className="topology-tags">
            <span className="topology-tag">Self-Hosted Kubernetes DaemonSet</span>
            <span className="topology-tag">Local Sidecar Proxy</span>
            <span className="topology-tag">Air-Gapped Private VPC</span>
            <span className="topology-tag">Multi-Tenant Cloud Control Plane</span>
            <span className="topology-tag">SOC2 / ISO 27001 Cryptographic Audit Sink</span>
          </div>
        </div>

        {/* 30-Day Pilot Box */}
        <div className="pilot-showcase-box">
          <div className="pilot-box-header">
            <div>
              <span className="pilot-eyebrow">Production Admission Program</span>
              <h3 className="pilot-h3">30-Day Agent Security Pilot</h3>
              <p className="pilot-p">
                A structured, low-friction engagement to validate execution security in your specific infrastructure before fleet deployment.
              </p>
            </div>
            <div className="pilot-progression">
              <span className="progression-node active">Pilot</span>
              <span className="progression-arrow">-&gt;</span>
              <span className="progression-node">Production</span>
              <span className="progression-arrow">-&gt;</span>
              <span className="progression-node">Fleet</span>
            </div>
          </div>

          <div className="pilot-steps-grid">
            {PILOT_STEPS.map((s) => (
              <div key={s.step} className="pilot-step-card">
                <div className="step-num">{s.step}</div>
                <div className="step-title">{s.title}</div>
                <p className="step-desc">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="pilot-box-footer">
            <div className="pilot-guarantee-note">
              <strong>Fixed Scope:</strong> Includes pre-flight CMQ qualification, customized policy blueprints, and an independent audit evidence package.
            </div>
            <div className="pilot-cta-actions">
              <Link href="#check-agent" className="btn-dominant-hero">
                Check Your Agent -&gt;
              </Link>
              <Link href="/contact" className="btn-secondary-hero">
                Book an Agent Security Pilot -&gt;
              </Link>
              <Link href="/pricing" className="hero-research-link">
                View Pricing &amp; License Tiers
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
