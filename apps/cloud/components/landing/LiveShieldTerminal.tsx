'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type Mode = 'strict' | 'balanced' | 'audit';
type Verdict = 'BLOCKED' | 'ALLOWED' | 'ESCALATE';

interface LogEntry {
  id: number;
  ts: string;
  verdict: Verdict;
  tool: string;
  gate: string;
  latency: string;
  client: string;
  taint?: boolean;
}

const BASE_EVENTS: Omit<LogEntry, 'id' | 'ts'>[] = [
  { verdict: 'BLOCKED',  tool: 'filesystem.read_file',  gate: 'CBAC:PathContainment',  latency: '1.8µs', client: 'claude-desktop', taint: false },
  { verdict: 'ALLOWED',  tool: 'weather.get_forecast',   gate: 'PASS:AllGates',         latency: '2.1µs', client: 'cursor-ai' },
  { verdict: 'BLOCKED',  tool: 'network.http_post',      gate: 'DIFC:TaintSink',        latency: '2.4µs', client: 'windsurf', taint: true },
  { verdict: 'ALLOWED',  tool: 'git.diff',               gate: 'PASS:AllGates',         latency: '1.9µs', client: 'cursor-ai' },
  { verdict: 'BLOCKED',  tool: 'shell.exec',             gate: 'CBAC:PrivilegeExceed',  latency: '0.6µs', client: 'claude-desktop' },
  { verdict: 'ALLOWED',  tool: 'docs.search',            gate: 'PASS:AllGates',         latency: '2.3µs', client: 'langchain' },
  { verdict: 'ESCALATE', tool: 'db.query',               gate: 'GUARD:SemanticAmbig',   latency: '1.5ms', client: 'cursor-ai' },
  { verdict: 'BLOCKED',  tool: 'stripe.charge',          gate: 'CBAC:MonetaryClamp',    latency: '0.9µs', client: 'openai-swarm', taint: false },
  { verdict: 'ALLOWED',  tool: 'github.list_prs',        gate: 'PASS:AllGates',         latency: '1.7µs', client: 'windsurf' },
  { verdict: 'BLOCKED',  tool: 'env.read_secrets',       gate: 'Schema:PathTraversal',  latency: '0.6µs', client: 'langchain', taint: true },
];

let globalId = BASE_EVENTS.length;

function getTs() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0').slice(0, 2)}`;
}

function nextEvent(mode: Mode): LogEntry {
  const pool = mode === 'audit'
    ? BASE_EVENTS.filter(e => e.verdict !== 'BLOCKED')
    : mode === 'strict'
    ? BASE_EVENTS
    : BASE_EVENTS.filter(e => e.tool !== 'git.diff'); // balanced skips some

  const base = pool[Math.floor(Math.random() * pool.length)];
  return { ...base, id: ++globalId, ts: getTs() };
}

const VERDICT_STYLE: Record<Verdict, string> = {
  BLOCKED:  'terminal-verdict-blocked',
  ALLOWED:  'terminal-verdict-allowed',
  ESCALATE: 'terminal-verdict-escalate',
};

const VERDICT_GLYPH: Record<Verdict, string> = {
  BLOCKED:  '⛔',
  ALLOWED:  '●',
  ESCALATE: '⚡',
};

const MODE_LABELS: Record<Mode, string> = {
  strict:   'Zero-Trust',
  balanced: 'Balanced',
  audit:    'Audit Only',
};

const MODE_COLORS: Record<Mode, string> = {
  strict:   '#ef4444',
  balanced: '#f59e0b',
  audit:    '#22d3ee',
};

export function LiveShieldTerminal() {
  const [mode, setMode] = useState<Mode>('strict');
  const [log, setLog] = useState<LogEntry[]>(() =>
    BASE_EVENTS.slice(0, 6).map((e, i) => ({ ...e, id: i, ts: getTs() }))
  );
  const [blockCount, setBlockCount] = useState(1247);
  const [allowCount, setAllowCount] = useState(8291);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const entry = nextEvent(mode);
      if (entry.verdict === 'BLOCKED') setBlockCount(c => c + 1);
      if (entry.verdict === 'ALLOWED') setAllowCount(c => c + 1);
      setLog(prev => [entry, ...prev.slice(0, 11)]);
    }, 1800);
    return () => clearInterval(interval);
  }, [mode]);

  return (
    <section className="terminal-section" id="shield-demo" aria-label="Mastyf Shield Live Terminal">
      {/* Left: editorial context */}
      <div className="terminal-context">
        <div className="terminal-context-eyebrow">
          <span className="circuit-eyebrow-line" aria-hidden="true" />
          <span>Desktop Appliance</span>
        </div>
        <h2 className="terminal-context-h2">
          Mastyf Shield —<br />
          <em>running on your machine.</em>
        </h2>
        <p className="terminal-context-lead">
          A tamper-proof sidecar process intercepts every MCP tool invocation.
          No cloud. No latency tax. Full local enforcement at the kernel transport layer.
        </p>

        {/* Mode selector */}
        <div className="terminal-mode-group" role="group" aria-label="Policy mode">
          <span className="terminal-mode-label">Policy Mode</span>
          <div className="terminal-modes">
            {(['strict', 'balanced', 'audit'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`terminal-mode-btn${mode === m ? ' is-active' : ''}`}
                style={mode === m ? { '--mode-color': MODE_COLORS[m] } as React.CSSProperties : undefined}
              >
                <span
                  className="terminal-mode-dot"
                  style={{ background: mode === m ? MODE_COLORS[m] : undefined }}
                />
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="terminal-stats">
          <div className="terminal-stat">
            <span className="terminal-stat-num terminal-stat-blocked">{blockCount.toLocaleString()}</span>
            <span className="terminal-stat-lbl">threats blocked today</span>
          </div>
          <div className="terminal-stat">
            <span className="terminal-stat-num terminal-stat-allowed">{allowCount.toLocaleString()}</span>
            <span className="terminal-stat-lbl">calls passed</span>
          </div>
          <div className="terminal-stat">
            <span className="terminal-stat-num terminal-stat-latency">1.9µs</span>
            <span className="terminal-stat-lbl">avg fast-path latency</span>
          </div>
        </div>

        <Link href="/download" className="terminal-download-cta">
          Download Mastyf Shield →
        </Link>
      </div>

      {/* Right: the actual terminal */}
      <div className="terminal-window">
        {/* Terminal chrome */}
        <div className="terminal-chrome">
          <div className="terminal-chrome-dots">
            <span className="tc-dot tc-close" />
            <span className="tc-dot tc-min" />
            <span className="tc-dot tc-max" />
          </div>
          <div className="terminal-chrome-title">
            mastyf-shield — {MODE_LABELS[mode].toLowerCase()} — port 4000
          </div>
          <div className="terminal-chrome-status">
            <span className="terminal-live-dot" />
            ACTIVE
          </div>
        </div>

        {/* Terminal prompt line */}
        <div className="terminal-prompt-line">
          <span className="terminal-ps1">mastyf@shield</span>
          <span className="terminal-ps2">:~$</span>
          <span className="terminal-cmd">
            {' '}intercept --mode={mode} --port=4000 --clients=all
          </span>
        </div>

        {/* Output header */}
        <div className="terminal-output-header">
          <span className="terminal-output-col terminal-col-ts">TIMESTAMP</span>
          <span className="terminal-output-col terminal-col-verdict">VERDICT</span>
          <span className="terminal-output-col terminal-col-tool">TOOL</span>
          <span className="terminal-output-col terminal-col-gate">GATE</span>
          <span className="terminal-output-col terminal-col-lat">LATENCY</span>
        </div>

        {/* Live log */}
        <div className="terminal-log" ref={logRef} aria-live="polite" aria-label="Live intercept log">
          {log.map((entry, idx) => (
            <div
              key={entry.id}
              className={`terminal-log-row ${VERDICT_STYLE[entry.verdict]}${idx === 0 ? ' terminal-log-row-new' : ''}`}
            >
              <span className="terminal-col-ts terminal-ts">{entry.ts}</span>
              <span className="terminal-col-verdict">
                <span className="terminal-verdict-glyph">{VERDICT_GLYPH[entry.verdict]}</span>
                <span className="terminal-verdict-text">{entry.verdict}</span>
              </span>
              <span className="terminal-col-tool terminal-tool">
                {entry.tool}
                {entry.taint && <span className="terminal-taint-badge" title="DIFC taint detected">⚠ TAINTED</span>}
              </span>
              <span className="terminal-col-gate terminal-gate">{entry.gate}</span>
              <span className="terminal-col-lat terminal-lat">{entry.latency}</span>
            </div>
          ))}
        </div>

        {/* Terminal prompt (bottom, blinking cursor) */}
        <div className="terminal-bottom-prompt">
          <span className="terminal-ps1">mastyf@shield</span>
          <span className="terminal-ps2">:~$</span>
          <span className="terminal-cursor" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
