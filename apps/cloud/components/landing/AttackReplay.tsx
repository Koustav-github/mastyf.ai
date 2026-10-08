'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { REPLAY_SCENARIOS, type ReplayLine } from './simulation';

const STEP_MS = 720;

const PREFIX: Record<ReplayLine['kind'], string> = {
  user: 'user',
  tool: 'tool',
  note: '▲',
  call: 'agent',
  allow: 'mastyf',
  block: 'mastyf',
  ok: '●',
  bad: '×',
};

function ReplayColumn({
  title,
  guarded,
  lines,
  shown,
  done,
  outcome,
  safe,
}: {
  title: string;
  guarded: boolean;
  lines: ReplayLine[];
  shown: number;
  done: boolean;
  outcome: string;
  safe: boolean;
}) {
  const visible = lines.slice(0, shown);
  return (
    <div className={`replay__col${guarded ? ' replay__col--guarded' : ''}`}>
      <div className="replay__head">
        <span className={`status ${guarded ? 'status--active' : 'status--idle'}`}>
          <span className="status__mark" aria-hidden="true">{guarded ? '●' : '○'}</span>
          {title}
        </span>
      </div>
      <ol className="replay__log">
        {visible.length === 0 ? <li className="replay__line replay__line--idle">Press Run to replay this task.</li> : null}
        {visible.map((line, i) => (
          <li key={i} className={`replay__line replay__line--${line.kind}`}>
            <span className="replay__prefix">{PREFIX[line.kind]}</span>
            <span className="replay__text">{line.text}</span>
          </li>
        ))}
      </ol>
      <div className={`replay__outcome${done ? ' is-done' : ''}`} aria-live="polite">
        {done ? (
          <span className={`status ${safe ? 'status--allow' : 'status--critical'}`}>
            <span className="status__mark" aria-hidden="true">{safe ? '●' : '×'}</span>
            {outcome}
          </span>
        ) : (
          <span className="dim">Waiting</span>
        )}
      </div>
    </div>
  );
}

export function AttackReplay() {
  const [scenarioId, setScenarioId] = useState(REPLAY_SCENARIOS[0].id);
  const [shown, setShown] = useState(0);
  const [running, setRunning] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const autoplayed = useRef(false);

  const scenario = REPLAY_SCENARIOS.find((s) => s.id === scenarioId) ?? REPLAY_SCENARIOS[0];
  const withoutLines = [...scenario.steps, ...scenario.without.lines];
  const withLines = [...scenario.steps, ...scenario.with.lines];
  const total = Math.max(withoutLines.length, withLines.length);
  const done = shown >= total;

  const run = useCallback(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRunning(false);
      setShown(Number.MAX_SAFE_INTEGER);
      return;
    }
    setShown(0);
    setRunning(true);
  }, []);

  useEffect(() => {
    if (!running) return;
    if (shown >= total) {
      setRunning(false);
      return;
    }
    const timer = window.setTimeout(() => setShown((n) => n + 1), shown === 0 ? 250 : STEP_MS);
    return () => window.clearTimeout(timer);
  }, [running, shown, total]);

  // Play the first scenario once when it scrolls into view.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !autoplayed.current) {
          autoplayed.current = true;
          run();
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [run]);

  const choose = (id: string) => {
    autoplayed.current = true;
    setScenarioId(id);
    run();
  };

  return (
    <div className="replay" ref={rootRef}>
      <div className="replay__bar">
        <div className="tablist tablist--boxed" role="group" aria-label="Agent task">
          {REPLAY_SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="tab"
              aria-pressed={s.id === scenarioId}
              onClick={() => choose(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-sm" onClick={run} disabled={running}>
          {done && shown > 0 ? (
            <RotateCcw size={13} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Play size={13} strokeWidth={1.75} aria-hidden="true" />
          )}
          {running ? 'Running' : done && shown > 0 ? 'Replay' : 'Run'}
        </button>
      </div>

      <div className="replay__cols">
        <ReplayColumn
          title="Without Mastyf"
          guarded={false}
          lines={withoutLines}
          shown={shown}
          done={shown >= withoutLines.length}
          outcome={scenario.without.outcome}
          safe={scenario.without.safe}
        />
        <ReplayColumn
          title="With Mastyf"
          guarded
          lines={withLines}
          shown={shown}
          done={shown >= withLines.length}
          outcome={scenario.with.outcome}
          safe
        />
      </div>
    </div>
  );
}
