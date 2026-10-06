'use client';

import Link from 'next/link';
import { useState, useCallback, useRef } from 'react';
import { GITHUB_REPO_URL } from '@/lib/github-links';
import { HF_MODEL_URL } from '@/lib/product-links';

interface Gate {
  id: number;
  label: string;
  name: string;
  latency: string;
  catchRate: string;
  accentVar: string;
  accentHex: string;
  description: string;
  example: string;
  status: 'PASS' | 'BLOCK';
}

const GATES: Gate[] = [
  {
    id: 1,
    label: 'GATE 1',
    name: 'Schema Sanity',
    latency: '0.6µs',
    catchRate: '100%',
    accentVar: '--cerulean',
    accentHex: '#22d3ee',
    description: 'Validates tool name and argument JSON structures against pre-compiled AST schemas. Drops malformed, oversized, or structurally invalid payloads in under 1 microsecond — no LLM required.',
    example: '{ "tool": "fs.read", "args": { "path": "../../etc/shadow" } } → Schema reject: path traversal pattern',
    status: 'BLOCK',
  },
  {
    id: 2,
    label: 'GATE 2',
    name: 'CBAC Invariants',
    latency: '<4.8µs',
    catchRate: '99.6%',
    accentVar: '--wire-live',
    accentHex: '#f59e0b',
    description: 'Evaluates 4 deterministic relational constraints: destination containment, scope boundedness, privilege monotonicity, and monetary clamping. No LLM calls — pure relational logic.',
    example: 'stripe.charge({ amount: 99999 }) → CBAC reject: monetary_clamp_exceeded (limit: $500)',
    status: 'BLOCK',
  },
  {
    id: 3,
    label: 'GATE 3',
    name: 'DIFC Taint Flow',
    latency: 'Realtime',
    catchRate: '100%',
    accentVar: '--wire-sever',
    accentHex: '#ef4444',
    description: 'Taints data ingested from third-party documents, emails, or web pages. Strictly forbids tainted tokens from flowing into privileged sinks (exec, network, DB). Catches indirect injections invisible to Gates 1-2.',
    example: 'email.read() → tainted buffer → shell.exec() → DIFC reject: tainted→sink flow prohibited',
    status: 'BLOCK',
  },
  {
    id: 4,
    label: 'GATE 4',
    name: 'Mastyf Guard',
    latency: '1.5B INT4',
    catchRate: 'Revoke-only',
    accentVar: '--wire-pass',
    accentHex: '#10b981',
    description: 'Subordinate neural checkpoint. Per Theorem 2 of the formal monograph: Guard can revoke or escalate permissions, but it can never synthesize new permissions or grant capability above the policy ceiling.',
    example: 'Ambiguous tool call → Guard 1.5B evaluates semantic intent → confidence < threshold → escalate to human',
    status: 'PASS',
  },
];

const PRODUCTS = [
  {
    tag: '1. APPLIANCE & SIDECAR',
    name: 'Mastyf Shield',
    tagColor: '#22d3ee',
    desc: 'Runs as a tamper-proof sidecar on your developer workstation. Zero-cloud, zero-latency, zero-byte wire isolation.',
    href: '/download',
    cta: 'Download Shield →',
    ctaStyle: 'circuit-product-cta-primary',
    extra: <a href={HF_MODEL_URL} target="_blank" rel="noopener noreferrer" className="circuit-product-link">Gated 1.5B Weights ↗</a>,
  },
  {
    tag: '2. RUNTIME REVERSE PROXY',
    name: 'Mastyf Gateway',
    tagColor: '#f59e0b',
    desc: 'High-throughput fail-closed reverse proxy for MCP JSON-RPC, stdio, and HTTP. >330k req/s, sub-ms overhead.',
    href: '/developers',
    cta: 'Gateway Docs →',
    ctaStyle: 'circuit-product-cta-secondary',
    extra: null,
  },
  {
    tag: '3. ADVERSARIAL CI/CD',
    name: 'Mastyf Swarm',
    tagColor: '#a78bfa',
    desc: "Stress-tests your agent's execution boundary with 4,216 multi-turn InjecAgent jailbreak vectors before deployment.",
    href: '/platform#swarm',
    cta: 'Run in CI →',
    ctaStyle: 'circuit-product-cta-secondary',
    extra: null,
  },
  {
    tag: '4. MCP SUPPLY CHAIN',
    name: 'Mastyf Trust',
    tagColor: '#10b981',
    desc: 'Static AST scanner and behavioral registry for MCP servers. Certified badges, CVE severity index, permission fingerprinting.',
    href: '/trust',
    cta: 'Lookup Trust Score →',
    ctaStyle: 'circuit-product-cta-secondary',
    extra: null,
  },
  {
    tag: '5. ENTERPRISE FLEET',
    name: 'Control Plane',
    tagColor: '#3b82f6',
    desc: 'Centralized fleet governance: Ed25519 signed audit trails, YAML policy distribution, SIEM forwarding, SSO. SOC2/ISO27001-ready.',
    href: '/pricing',
    cta: 'Deploy Control Plane →',
    ctaStyle: 'circuit-product-cta-secondary',
    extra: null,
  },
];

function useSpotlight() {
  const ref = useRef<HTMLDivElement>(null);
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    el.style.setProperty('--my', `${e.clientY - rect.top}px`);
  }, []);
  return { ref, onMouseMove };
}

interface ProductCardProps {
  product: typeof PRODUCTS[number];
}

function ProductCard({ product }: ProductCardProps) {
  const spotlight = useSpotlight();
  return (
    <div
      ref={spotlight.ref}
      onMouseMove={spotlight.onMouseMove}
      className="circuit-product-card"
    >
      <div className="circuit-product-spotlight" aria-hidden="true" />
      <span className="circuit-product-tag" style={{ color: product.tagColor }}>
        {product.tag}
      </span>
      <h3 className="circuit-product-name">{product.name}</h3>
      <p className="circuit-product-desc">{product.desc}</p>
      <div className="circuit-product-footer">
        <Link href={product.href} className={`circuit-product-cta ${product.ctaStyle}`}>
          {product.cta}
        </Link>
        {product.extra}
      </div>
    </div>
  );
}


export function ForensicCircuitDiagram() {
  const [activeGate, setActiveGate] = useState<number>(1);
  const [severing, setSevering] = useState(false);

  const handleGateClick = (id: number) => {
    setSevering(true);
    setActiveGate(id);
    setTimeout(() => setSevering(false), 600);
  };

  const gate = GATES[activeGate - 1];

  return (
    <section className="circuit-platform-section" id="platform-ecosystem">
      {/* Section header — asymmetric, not centered */}
      <div className="circuit-section-head">
        <div className="circuit-section-eyebrow">
          <span className="circuit-eyebrow-line" aria-hidden="true" />
          <span>The 5-Layer Defense Ecosystem</span>
        </div>
        <h2 className="circuit-section-h2">
          Hardware-grade security<br />
          <em>without the overhead.</em>
        </h2>
        <p className="circuit-section-lead">
          Inspired by formal capability-mediated perimeters and fail-closed reference monitors.
          From developer sidecar to enterprise fleet governance.
        </p>
      </div>

      {/* The forensic circuit diagram */}
      <div className="circuit-forensic-wrap">
        {/* Gate selector row */}
        <div className="circuit-gate-row" role="tablist" aria-label="Security gates">
          {GATES.map((g, idx) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={activeGate === g.id}
              onClick={() => handleGateClick(g.id)}
              className={`circuit-gate-node${activeGate === g.id ? ' is-active' : ''}`}
              style={{ '--gate-color': g.accentHex } as React.CSSProperties}
            >
              {/* Wire connector before (except first) */}
              {idx > 0 && (
                <div className="circuit-gate-wire">
                  <span className="circuit-wire-line" />
                  <span className="circuit-wire-arrow">▶</span>
                </div>
              )}
              <div className="circuit-gate-inner">
                <span className="circuit-gate-label" style={{ color: g.accentHex }}>{g.label}</span>
                <span className="circuit-gate-name">{g.name}</span>
                <span className="circuit-gate-lat" style={{ color: g.accentHex }}>{g.latency}</span>
                <span className={`circuit-gate-status ${g.status === 'BLOCK' ? 'is-block' : 'is-pass'}`}>
                  {g.status === 'BLOCK' ? '⛔ INTERCEPTS' : '✓ EVALUATES'}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Sever animation bar */}
        <div className={`circuit-sever-bar${severing ? ' is-severing' : ''}`} aria-hidden="true">
          <span className="circuit-sever-label">⚡ WIRE SEVERED</span>
        </div>

        {/* Active gate detail */}
        <div
          className={`circuit-gate-detail${severing ? ' circuit-gate-detail-sever' : ''}`}
          role="tabpanel"
          style={{ '--gate-color': gate.accentHex } as React.CSSProperties}
        >
          <div className="circuit-gate-detail-left">
            <div className="circuit-gate-detail-header">
              <span className="circuit-gate-detail-id" style={{ color: gate.accentHex }}>
                {gate.label}
              </span>
              <span className="circuit-gate-detail-name">{gate.name}</span>
            </div>
            <div className="circuit-gate-metrics">
              <div className="circuit-metric">
                <span className="circuit-metric-val" style={{ color: gate.accentHex }}>{gate.latency}</span>
                <span className="circuit-metric-lbl">latency overhead</span>
              </div>
              <div className="circuit-metric">
                <span className="circuit-metric-val" style={{ color: gate.accentHex }}>{gate.catchRate}</span>
                <span className="circuit-metric-lbl">catch rate</span>
              </div>
            </div>
            <p className="circuit-gate-desc">{gate.description}</p>
          </div>
          <div className="circuit-gate-detail-right">
            <div className="circuit-example-block">
              <div className="circuit-example-header">
                <span className="circuit-example-dot" />
                <span className="circuit-example-label">EXAMPLE INTERCEPT</span>
              </div>
              <pre className="circuit-example-code">{gate.example}</pre>
            </div>
          </div>
        </div>
      </div>

      {/* Product grid — 5 products, not bento template */}
      <div className="circuit-products-grid">
        {PRODUCTS.map((product) => (
          <ProductCard key={product.name} product={product} />
        ))}
      </div>

      {/* Open source band */}
      <div className="circuit-oss-band">
        <div>
          <span className="circuit-oss-label">Open Source Core · AGPL-3.0</span>
          <p className="circuit-oss-desc">
            Gateway, YAML policy engine, Swarm fixtures, and Trust directory — 100% open.
            Verify every line of security enforcement yourself.
          </p>
        </div>
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="circuit-oss-cta"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Inspect on GitHub ↗
        </a>
      </div>
    </section>
  );
}
