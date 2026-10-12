'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, Terminal } from 'lucide-react';

// Real-looking threat blocks that scroll in the ticker
const TICKER_EVENTS = [
  { type: 'BLOCK', verb: 'bash_exec', reason: 'no capability contract', ms: 29 },
  { type: 'ALLOW', verb: 'sql_query', reason: 'CBAC pass · destination authorized', ms: 58 },
  { type: 'BLOCK', verb: 'resources/read', reason: 'path traversal /etc/passwd', ms: 42 },
  { type: 'BLOCK', verb: 'http_fetch', reason: 'SSRF — decoded 0x7f000001', ms: 36 },
  { type: 'ALLOW', verb: 'github_api', reason: 'scoped token · workflow pass', ms: 61 },
  { type: 'BLOCK', verb: 'stripe_charge', reason: 'monetary_clamp: $99,999 > $500 limit', ms: 31 },
  { type: 'BLOCK', verb: 's3.delete_object', reason: 'irreversible · human quorum required', ms: 44 },
  { type: 'ALLOW', verb: 'tools/call (summarize)', reason: 'read-only · no egress', ms: 52 },
  { type: 'BLOCK', verb: 'shell.exec', reason: 'tainted buffer from email.read()', ms: 27 },
  { type: 'ALLOW', verb: 'invoice.lookup', reason: 'billing scope · destination match', ms: 66 },
];

export function MinimalHero() {
  const [tickerItems, setTickerItems] = useState([...TICKER_EVENTS, ...TICKER_EVENTS]);
  const [count, setCount] = useState(2847193);

  // Simulate live counter
  useEffect(() => {
    const interval = setInterval(() => {
      setCount((c) => c + Math.floor(Math.random() * 8 + 2));
    }, 1400);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-[100svh] flex flex-col items-center justify-center pt-24 pb-16 px-6">
      {/* Amber glow behind hero */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-[600px] h-[400px] bg-amber-400/[0.04] rounded-full blur-[120px] pointer-events-none" />

      {/* Eyebrow */}
      <div className="flex items-center gap-2 mb-8">
        <span className="inline-flex items-center gap-2 text-[11px] font-mono font-semibold tracking-[0.08em] uppercase text-amber-400 bg-amber-400/[0.08] border border-amber-400/[0.14] px-3 py-1.5 rounded-md">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Agent Execution Security
        </span>
        <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-slate-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {count.toLocaleString()} threats blocked
        </span>
      </div>

      {/* Headline */}
      <h1 className="text-center font-extrabold tracking-[-0.04em] leading-[1.03] text-white max-w-[860px] mb-6"
        style={{ fontSize: 'clamp(40px, 6vw, 78px)' }}>
        Your AI proposes.{' '}
        <span className="text-amber-400">Mastyf decides</span>
        {' '}what executes.
      </h1>

      {/* Sub */}
      <p className="text-center text-[16px] sm:text-[18px] text-slate-400 max-w-[500px] mb-10 leading-[1.65] font-[400]">
        An externally enforced security layer between autonomous AI agents and tools that read databases, execute commands, and call APIs.
      </p>

      {/* CTAs */}
      <div className="flex items-center gap-3 flex-wrap justify-center mb-16">
        <Link
          href="#scanner"
          className="flex items-center gap-2 text-[14px] font-semibold text-[#0a0600] bg-amber-400 hover:bg-amber-300 px-5 py-2.5 rounded-lg transition-all hover:-translate-y-px hover:shadow-[0_4px_24px_rgba(245,158,11,0.35)]"
        >
          Check your agent free
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="#platform"
          className="flex items-center gap-2 text-[14px] font-medium text-slate-400 hover:text-white bg-transparent hover:bg-white/[0.05] border border-white/[0.09] hover:border-white/[0.16] px-5 py-2.5 rounded-lg transition-all"
        >
          How it works
        </Link>
        <Link
          href="/research"
          className="hidden sm:flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-300 px-3 py-2.5 transition-colors"
        >
          Read the paper <span className="font-mono text-amber-500/80 text-[10px]">DTRAP</span>
        </Link>
      </div>

      {/* Live event ticker */}
      <div className="w-full max-w-[880px] rounded-xl border border-white/[0.07] bg-[#07090f] overflow-hidden">
        {/* Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono font-semibold tracking-wider text-slate-400 uppercase">
              Mastyf · Live Dispatch Feed
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-600">Pre-dispatch enforcement · v2.4</span>
        </div>

        {/* Scrolling ticker */}
        <div className="overflow-hidden py-3">
          <div className="flex gap-10 w-max animate-[ticker-scroll_28s_linear_infinite]">
            {tickerItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 font-mono text-[11px] whitespace-nowrap">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                  item.type === 'BLOCK'
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {item.type}
                </span>
                <span className="text-slate-300">{item.verb}</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-500 hidden sm:inline">{item.reason}</span>
                <span className="text-amber-500/70">{item.ms}µs</span>
              </div>
            ))}
          </div>
        </div>

        {/* npx command strip */}
        <div className="border-t border-white/[0.06] px-4 py-2.5 flex items-center justify-between gap-4 bg-black/20">
          <div className="flex items-center gap-2 font-mono text-[12px] overflow-hidden">
            <span className="text-amber-400 shrink-0">$</span>
            <span className="text-slate-400 truncate">npx @mastyf/gateway --agent claude-code --protect</span>
          </div>
          <span className="text-[10px] font-mono text-slate-600 shrink-0">zero code changes</span>
        </div>
      </div>
    </section>
  );
}
