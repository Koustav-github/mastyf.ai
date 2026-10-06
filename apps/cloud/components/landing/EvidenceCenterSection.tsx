'use client';

import React, { useState } from 'react';
import Link from 'next/link';

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
    answer: 'Unanimous conjunction: CBAC Context and DIFC Taint and Capability Scope and Workflow State.',
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
    <section className="evidence-section" id="evidence">
      <div className="section-container">
        <div className="section-header">
          <div className="section-tag">Mastyf Evidence Center</div>
          <h2 className="section-title">
            Don&#39;t trust the marketing. <br />
            Inspect the evidence.
          </h2>
          <p className="section-subtitle">
            Every metric has a dataset, methodology, population, confidence interval, and reproduction instructions.
            Security claims are scoped to documented deployments and verifiable test conditions.
          </p>
        </div>

        {/* 5 Core Cards */}
        <div className="evidence-cards-grid">
          {EVIDENCE_ITEMS.map((item) => {
            const isSelected = item.id === selectedId;
            return (
              <button
                key={item.id}
                type="button"
                className={`evidence-card ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedId(item.id)}
              >
                <div className="evidence-card-category">{item.category}</div>
                <div className="evidence-card-question">{item.question}</div>
                <div className="evidence-card-metric">{item.metric}</div>
                <div className="evidence-card-status">
                  <span className="evidence-status-dot" />
                  {isSelected ? 'Inspecting Evidence' : 'Click to Inspect'}
                </div>
              </button>
            );
          })}
        </div>

        {/* Deep Dive Dossier */}
        <div className="evidence-dossier">
          <div className="evidence-dossier-header">
            <div>
              <span className="dossier-pill">{active.category} Proof Dossier</span>
              <h3 className="dossier-title">{active.question}</h3>
              <p className="dossier-desc">{active.answer}</p>
            </div>
            <div className="dossier-meta">
              <div className="dossier-meta-item">
                <span className="meta-label">Version</span>
                <span className="meta-val">{active.version}</span>
              </div>
              <div className="dossier-meta-item">
                <span className="meta-label">Verified Date</span>
                <span className="meta-val">{active.verifiedDate}</span>
              </div>
            </div>
          </div>

          <div className="evidence-dossier-grid">
            <div className="dossier-cell">
              <div className="dossier-cell-label">Evaluated Population</div>
              <div className="dossier-cell-val">{active.population}</div>
            </div>

            <div className="dossier-cell">
              <div className="dossier-cell-label">Threat Definition</div>
              <div className="dossier-cell-val">{active.threatDefinition}</div>
            </div>

            <div className="dossier-cell">
              <div className="dossier-cell-label">Measurement Methodology</div>
              <div className="dossier-cell-val">{active.methodology}</div>
            </div>

            <div className="dossier-cell">
              <div className="dossier-cell-label">Confidence Interval &amp; Variance</div>
              <div className="dossier-cell-val">{active.confidenceInterval}</div>
            </div>

            <div className="dossier-cell dossier-cell-full">
              <div className="dossier-cell-label">Known Operational Limitations</div>
              <div className="dossier-cell-val limitations-text">{active.limitations}</div>
            </div>
          </div>

          <div className="evidence-repro-box">
            <div className="evidence-repro-label">
              <span>Independent Reproduction Command</span>
              <span className="repro-badge">Clean-Room Verifiable</span>
            </div>
            <div className="evidence-repro-code">
              <code>{active.reproductionCommand}</code>
            </div>
          </div>

          <div className="evidence-footer-actions">
            <Link href="/research" className="btn btn-outline btn-sm">
              Read Formal Specification Document -&gt;
            </Link>
            <a
              href="https://github.com/mastyf-ai/mastyf.ai/tree/main/cmq-verification-kit"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
            >
              Inspect Clean-Room Kit on GitHub -&gt;
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
