'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

interface InterceptEvent {
  id: number;
  time: string;
  verdict: 'BLOCKED' | 'ALLOWED';
  tool: string;
  gate: string;
  latency: string;
  client: string;
}

const SEED_EVENTS: Omit<InterceptEvent, 'id'>[] = [
  { time: '', verdict: 'BLOCKED', tool: 'filesystem.read_file', gate: 'CBAC Perimeter', latency: '1.8µs', client: 'Claude Desktop' },
  { time: '', verdict: 'ALLOWED', tool: 'weather.lookup', gate: 'Policy Clear', latency: '1.9µs', client: 'Cursor AI' },
  { time: '', verdict: 'BLOCKED', tool: 'network.http_post', gate: 'DIFC Taint', latency: '2.4µs', client: 'Windsurf' },
  { time: '', verdict: 'ALLOWED', tool: 'git.diff', gate: 'Policy Clear', latency: '2.1µs', client: 'LangChain' },
];

const MODES = [
  { id: 'strict', label: 'Zero-trust' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'audit', label: 'Audit only' },
] as const;

let idCounter = SEED_EVENTS.length;

function getTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function getRandomEvent(): InterceptEvent {
  const base = SEED_EVENTS[Math.floor(Math.random() * SEED_EVENTS.length)];
  return { ...base, id: ++idCounter, time: getTime() };
}

export function ShieldAppDemo() {
  // Seed rows render without a clock time on the server; stamp them on mount to avoid a hydration mismatch.
  const [events, setEvents] = useState<InterceptEvent[]>(() =>
    SEED_EVENTS.map((e, i) => ({ ...e, id: i, time: '--:--:--' }))
  );
  const [mode, setMode] = useState<'strict' | 'balanced' | 'audit'>('strict');
  const [blockCount, setBlockCount] = useState(1247);

  useEffect(() => {
    const now = getTime();
    setEvents((prev) => prev.map((e) => (e.time === '--:--:--' ? { ...e, time: now } : e)));
  }, []);

  // Add new event every 2s
  useEffect(() => {
    const interval = setInterval(() => {
      const newEvent = getRandomEvent();
      if (newEvent.verdict === 'BLOCKED') setBlockCount((c) => c + 1);
      setEvents((prev) => [newEvent, ...prev.slice(0, 7)]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="panel app" data-reveal>
        <div className="panel__head">
          <span className="panel__title">
            <Image src="/brand/mark-64.png" alt="" width={16} height={16} className="brand-mark" />
            Mastyf Shield
          </span>
          <span className="app__clients">Claude, Cursor, Windsurf</span>
          <span className="status status--active">
            <span className="status__mark" aria-hidden="true">●</span>
            Active, port 4000
          </span>
        </div>

        <div className="app__body">
          <aside className="app__rail">
            <div className="app__group" role="group" aria-labelledby="mode-label">
              <span className="label" id="mode-label">Policy mode</span>
              <div className="modes">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="mode"
                    aria-pressed={mode === m.id}
                    onClick={() => setMode(m.id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <dl className="app__stats">
              <div>
                <dt>Threats blocked today</dt>
                <dd className="tone-block">{blockCount.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Calls allowed</dt>
                <dd>8,291</dd>
              </div>
              <div>
                <dt>Avg fast-path</dt>
                <dd>1.9µs</dd>
              </div>
            </dl>
          </aside>

          <div className="app__log">
            <div className="console__bar">
              <span className="label">Intercept log</span>
              <span className="panel__meta">avg {events[0]?.latency ?? '1.9µs'}</span>
            </div>
            <div className="table-scroll">
              <table className="data-table app__table">
                <thead>
                  <tr>
                    <th scope="col" className="app__col-time">Time</th>
                    <th scope="col">Verdict</th>
                    <th scope="col">Tool</th>
                    <th scope="col" className="app__col-gate">Gate</th>
                    <th scope="col" className="num">Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {events.slice(0, 7).map((event) => {
                    const blocked = event.verdict === 'BLOCKED';
                    return (
                      <tr key={event.id} className="app__row">
                        <td className="dim app__col-time">{event.time}</td>
                        <td>
                          <span className={`status ${blocked ? 'status--block' : 'status--allow'}`}>
                            <span className="status__mark" aria-hidden="true">{blocked ? '×' : '●'}</span>
                            {blocked ? 'Blocked' : 'Allowed'}
                          </span>
                        </td>
                        <td>
                          <code className="app__tool">{event.tool}</code>
                        </td>
                        <td className="dim app__col-gate">{event.gate}</td>
                        <td className="num">{event.latency}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="panel__foot">Demo with simulated traffic. Events and counts are generated in your browser.</div>
    </div>
  );
}
