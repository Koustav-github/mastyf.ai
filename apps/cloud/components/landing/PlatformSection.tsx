'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const OPERATIONS = [
  {
    verb: 'Read',
    scope: 'Files, databases, credentials, source repos',
    threat: '/etc/passwd, .env, SSH keys',
    gate: 'Path normalization + credential boundary policy',
    color: '#38bdf8',
  },
  {
    verb: 'Execute',
    scope: 'Shell commands, scripts, system binaries',
    threat: 'rm -rf, pip install, curl | bash',
    gate: 'Capability contract · no bash_exec without explicit scope',
    color: '#f87171',
  },
  {
    verb: 'Send',
    scope: 'HTTP, webhooks, Slack, external APIs',
    threat: 'Data exfiltration via SSRF or prompt injection',
    gate: 'DIFC taint tracking · prohibits tainted→egress flows',
    color: '#a78bfa',
  },
  {
    verb: 'Write',
    scope: 'Production databases, config files, code',
    threat: 'Corrupted SQL migrations, altered prod configs',
    gate: 'CBAC monotonicity + schema invariant checks',
    color: '#f59e0b',
  },
  {
    verb: 'Delete',
    scope: 'S3 buckets, database tables, volumes',
    threat: 'Agent drops production table during refactor',
    gate: 'Human quorum gate · irreversible operations blocked',
    color: '#fb7185',
  },
  {
    verb: 'Spend',
    scope: 'LLM API credits, cloud compute, payments',
    threat: 'Recursive agent loop exhausts API budget',
    gate: 'Hard transaction clamp + rate-burst circuit breaker',
    color: '#34d399',
  },
];

const GATES = [
  {
    n: '01',
    name: 'Schema Sanity',
    sub: 'Pre-compiled AST validation',
    latency: '0.6µs',
    color: '#38bdf8',
    desc: 'Validates every tool name and argument against pre-compiled JSON AST schemas. Malformed, oversized, or structurally invalid payloads are dropped in under 1µs — no LLM required.',
    example: '{ "tool": "fs.read", "args": { "path": "../../etc/shadow" } }\n→ REJECT: path traversal detected in schema',
  },
  {
    n: '02',
    name: 'CBAC Invariants',
    sub: '4-constraint relational logic',
    latency: '<4.8µs',
    color: '#f59e0b',
    desc: 'Evaluates 4 deterministic constraints: destination containment, scope boundedness, privilege monotonicity, monetary clamping. Pure relational logic — no LLM, no probability.',
    example: 'stripe.charge({ amount: 99999 })\n→ REJECT: monetary_clamp_exceeded (policy limit: $500)',
  },
  {
    n: '03',
    name: 'DIFC Taint Flow',
    sub: 'Information-flow control',
    latency: 'Real-time',
    color: '#ef4444',
    desc: 'Taints data from third-party sources (emails, web pages, documents). Strictly blocks tainted tokens from reaching privileged sinks (exec, network, DB). Catches prompt injection invisible to Gates 1–2.',
    example: 'email.read() → tainted buffer → shell.exec()\n→ REJECT: tainted→sink flow prohibited (DIFC)',
  },
  {
    n: '04',
    name: 'Mastyf Guard',
    sub: '1.5B parameter neural check',
    latency: '~8ms',
    color: '#10b981',
    desc: 'Subordinate neural checkpoint for semantic ambiguity. Per Theorem 2 of the formal specification: Guard can only revoke or escalate — it cannot synthesize new permissions or elevate above the policy ceiling.',
    example: 'Ambiguous tool call with indirect user context\n→ ESCALATE: confidence 0.31 < threshold · human review',
  },
];

export function PlatformSection() {
  const [activeGate, setActiveGate] = useState(0);

  return (
    <section id="platform" className="py-24 px-6">
      <div className="max-w-[1120px] mx-auto">

        {/* ── What Mastyf controls ─────────────────────────────── */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 text-[11px] font-mono font-semibold tracking-[0.08em] uppercase text-slate-500 border border-white/[0.07] px-3 py-1.5 rounded-md mb-4">
            The problem
          </span>
          <h2 className="text-[clamp(28px,3.5vw,44px)] font-bold tracking-[-0.03em] leading-[1.12] text-white mb-4">
            AI agents take real actions.<br />
            <span className="text-slate-400">Without a security boundary, you have no control.</span>
          </h2>
          <p className="text-[15px] text-slate-500 max-w-[480px] mx-auto leading-relaxed">
            Every operation an agent can perform is a potential attack surface. Mastyf intercepts each one before it reaches your infrastructure.
          </p>
        </div>

        {/* Operations grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border border-white/[0.06] rounded-2xl overflow-hidden mb-24">
          {OPERATIONS.map((op, i) => (
            <div
              key={op.verb}
              className="group p-6 border-b border-r border-white/[0.05] hover:bg-white/[0.02] transition-colors last:border-r-0 odd:last:border-r-0"
              style={{
                borderRight: (i + 1) % 3 === 0 ? 'none' : undefined,
                borderBottom: i >= OPERATIONS.length - (OPERATIONS.length % 3 || 3) ? 'none' : undefined,
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="text-[11px] font-mono font-bold tracking-[0.1em] uppercase px-2 py-1 rounded"
                  style={{ color: op.color, background: `${op.color}12`, border: `1px solid ${op.color}22` }}
                >
                  {op.verb}
                </div>
                <span className="text-[10px] font-mono text-slate-700">Protected</span>
              </div>

              <p className="text-[12px] text-slate-500 mb-3 leading-relaxed">{op.scope}</p>

              <div className="text-[11px] font-mono text-red-400/70 bg-red-500/[0.05] border border-red-500/[0.1] rounded-md px-3 py-2 mb-3">
                eg: {op.threat}
              </div>

              <div className="text-[11px] text-slate-600 flex items-start gap-1.5">
                <span className="text-emerald-500 shrink-0 mt-0.5">›</span>
                {op.gate}
              </div>
            </div>
          ))}
        </div>

        {/* ── 4-Gate Pipeline ─────────────────────────────────── */}
        <div className="mb-4">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 text-[11px] font-mono font-semibold tracking-[0.08em] uppercase text-slate-500 border border-white/[0.07] px-3 py-1.5 rounded-md mb-4">
              The solution
            </span>
            <h2 className="text-[clamp(28px,3.5vw,44px)] font-bold tracking-[-0.03em] leading-[1.12] text-white mb-4">
              Four gates. Deterministic.<br />
              <span className="text-amber-400">Sub-50µs enforcement.</span>
            </h2>
            <p className="text-[15px] text-slate-500 max-w-[480px] mx-auto leading-relaxed">
              No LLM calls for the first three gates. Pure logic, fail-closed. Every tool call evaluated before it touches your infrastructure.
            </p>
          </div>

          {/* Gate selector */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
            {GATES.map((gate, i) => (
              <button
                key={gate.n}
                onClick={() => setActiveGate(i)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  activeGate === i
                    ? 'border-white/[0.15] bg-white/[0.05]'
                    : 'border-white/[0.06] hover:border-white/[0.1] hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-[10px] font-mono font-bold tracking-[0.1em]"
                    style={{ color: activeGate === i ? gate.color : '#475569' }}
                  >
                    GATE {gate.n}
                  </span>
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={activeGate === i
                      ? { color: gate.color, background: `${gate.color}15`, border: `1px solid ${gate.color}30` }
                      : { color: '#334155', background: 'transparent', border: '1px solid transparent' }
                    }
                  >
                    {gate.latency}
                  </span>
                </div>
                <div className="text-[13px] font-semibold text-white mb-1">{gate.name}</div>
                <div className="text-[11px] text-slate-500">{gate.sub}</div>
              </button>
            ))}
          </div>

          {/* Gate detail */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeGate}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="rounded-xl border border-white/[0.08] overflow-hidden"
            >
              <div className="p-6 bg-[#07090f]">
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className="text-[11px] font-mono font-bold tracking-[0.08em] px-2.5 py-1 rounded-md"
                    style={{
                      color: GATES[activeGate].color,
                      background: `${GATES[activeGate].color}15`,
                      border: `1px solid ${GATES[activeGate].color}25`,
                    }}
                  >
                    GATE {GATES[activeGate].n}
                  </span>
                  <span className="text-[16px] font-semibold text-white">{GATES[activeGate].name}</span>
                </div>
                <p className="text-[14px] text-slate-400 leading-relaxed mb-5">
                  {GATES[activeGate].desc}
                </p>
                <div className="font-mono text-[12px] bg-black/40 border border-white/[0.05] rounded-lg p-4 text-slate-400 whitespace-pre">
                  {GATES[activeGate].example}
                </div>
              </div>

              {/* Flow indicator */}
              <div className="px-6 py-3 border-t border-white/[0.06] flex items-center gap-3 text-[11px] font-mono text-slate-600">
                {GATES.map((g, i) => (
                  <div key={g.n} className="flex items-center gap-2">
                    <span
                      className={`${i === activeGate ? 'font-bold' : ''}`}
                      style={{ color: i === activeGate ? g.color : i < activeGate ? '#10b981' : '#334155' }}
                    >
                      {i < activeGate ? '✓' : i === activeGate ? '›' : '·'} Gate {g.n}
                    </span>
                    {i < 3 && <span className="text-white/10">→</span>}
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Link to research */}
        <div className="text-center mt-8">
          <Link
            href="/research"
            className="inline-flex items-center gap-2 text-[13px] text-slate-500 hover:text-amber-400 transition-colors"
          >
            Formal specification published in ACM DTRAP
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
