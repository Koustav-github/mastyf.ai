'use client';

import React from 'react';
import Link from 'next/link';

interface OperationalAction {
  verb: string;
  scope: string;
  threatExample: string;
  mastyfGate: string;
}

const OPERATIONAL_ACTIONS: OperationalAction[] = [
  {
    verb: 'Read',
    scope: 'Filesystem, memory dumps, source repos, environment credentials',
    threatExample: 'Agent prompted to read /etc/passwd or .env file and summarize user secrets',
    mastyfGate: 'Destination and path-traversal normalization with read-boundary policies',
  },
  {
    verb: 'Write',
    scope: 'Database records, local configurations, codebases, lockfiles',
    threatExample: 'Agent writes corrupt SQL migration or alters production configuration files',
    mastyfGate: 'CBAC contextual schema checks and monotonic workflow constraints',
  },
  {
    verb: 'Execute',
    scope: 'Host shell commands, system binaries, background sub-processes',
    threatExample: 'Agent executes arbitrary bash script to install unvetted external dependencies',
    mastyfGate: 'Strict capability contracts barring unmanaged command execution',
  },
  {
    verb: 'Send',
    scope: 'Outbound HTTP webhooks, external API calls, Slack messages, emails',
    threatExample: 'Indirect prompt injection commands agent to exfiltrate session data via webhook',
    mastyfGate: 'Dynamic information-flow control (DIFC) preventing tainted egress',
  },
  {
    verb: 'Delete',
    scope: 'S3 cloud buckets, database tables, user records, persistent volumes',
    threatExample: 'Agent inadvertently drops production tables during automated refactor task',
    mastyfGate: 'Explicit human approval quorum gate for irreversible destructive operations',
  },
  {
    verb: 'Deploy',
    scope: 'Kubernetes pods, cloud functions, terraform infrastructure stacks',
    threatExample: 'Compromised task plan deploys unauthorized container with root capabilities',
    mastyfGate: 'CMQ boundary isolation and cryptographic admission qualification',
  },
  {
    verb: 'Spend',
    scope: 'LLM API credits, cloud infrastructure compute, payment gateways',
    threatExample: 'Recursive agent loop exhausts organizational API balance or provisions GPU nodes',
    mastyfGate: 'Hard transaction budgets and rate-burst circuit breakers',
  },
];

export function OperationalSystemsSection() {
  return (
    <section className="operational-systems-section" id="operational">
      <div className="section-container">
        {/* Simple Human Problem First */}
        <div className="section-header">
          <div className="section-tag">THE AGENT PARADIGM SHIFT</div>
          <h2 className="section-title">
            AI can now take real actions. <br />
            <span className="gold-highlight">Mastyf controls those actions.</span>
          </h2>
          <p className="section-subtitle">
            When an AI agent is connected to tools, the security problem is no longer what it says.
            It is what it is allowed to execute.
          </p>
        </div>

        {/* 7 Operational Actions Ribbon */}
        <div className="operational-actions-grid">
          {OPERATIONAL_ACTIONS.map((action) => (
            <div key={action.verb} className="action-card">
              <div className="action-card-header">
                <span className="action-verb-name">{action.verb}</span>
                <span className="action-tag-pill">Operational Action</span>
              </div>
              <div className="action-scope-desc">{action.scope}</div>
              <div className="action-threat-box">
                <span className="threat-label">The Exposure:</span>
                <p className="threat-text">{action.threatExample}</p>
              </div>
              <div className="action-control-box">
                <span className="control-label">Mastyf Enforcement:</span>
                <p className="control-text">{action.mastyfGate}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Structural Comparison: Prompt Filter vs Execution Boundary */}
        <div className="architecture-comparison-box">
          <div className="comparison-col comparison-legacy">
            <div className="col-badge badge-legacy">Legacy AI Gateway / Prompt Filter</div>
            <h3 className="col-heading">Inspects Text Input</h3>
            <p className="col-paragraph">
              Attempts to detect attacks by reading LLM prompts and output text. Fails when indirect prompt injection
              or polyglot payloads hide inside legitimate tool responses.
            </p>
            <ul className="col-feature-list">
              <li>[-] Bypassed by token splitting and encoded payloads</li>
              <li>[-] Cannot inspect socket egress or local file handles</li>
              <li>[-] Assumes the gateway is always in the communication path</li>
              <li>[-] No mathematical proof of deployment containment</li>
            </ul>
          </div>

          <div className="comparison-col comparison-mastyf">
            <div className="col-badge badge-mastyf">Mastyf Agent Execution Security</div>
            <h3 className="col-heading">Secures the Execution Sink</h3>
            <p className="col-paragraph">
              Intercepts the actual tool invocation at the runtime transport boundary before any byte is written
              to a socket, file, database, or child process.
            </p>
            <ul className="col-feature-list">
              <li>[+] Deterministic CBAC and DIFC structural authorization</li>
              <li>[+] Sub-microsecond fast-path latency (&lt;4.8 us)</li>
              <li>[+] CMQ qualifies whether the agent container can bypass the gateway</li>
              <li>[+] Cryptographically signed audit receipts for every dispatch</li>
            </ul>
          </div>
        </div>

        {/* Mid-Page Call to Action */}
        <div className="operational-cta-banner">
          <div className="cta-banner-text">
            <h3>Does your agent have unmanaged execution sinks?</h3>
            <p>Run a free, instant capability audit on your agent environment.</p>
          </div>
          <Link href="#check-agent" className="btn-dominant-hero">
            Check Your Agent -&gt;
          </Link>
        </div>
      </div>
    </section>
  );
}
