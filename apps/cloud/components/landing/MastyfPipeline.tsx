'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { AGENTS, PIPELINE_EVENTS, TOOLS, type PipelineEvent } from './simulation';

type Orientation = 'h' | 'v';
type Outcome = 'allow' | 'block' | 'unchecked' | 'unsafe' | 'system';

type Geometry = {
  w: number;
  h: number;
  lanes: number[];
  agentAt: number;
  start: number;
  gateIn: number;
  gateMid: number;
  gateOut: number;
  end: number;
  toolAt: number;
  nodeW: number;
  nodeH: number;
  gateSpan: [number, number];
};

// Coordinates are (flow, lane): flow runs agent -> tool, lanes are the three rows.
const GEOMETRY: Record<Orientation, Geometry> = {
  h: { w: 640, h: 300, lanes: [70, 150, 230], agentAt: 70, start: 122, gateIn: 252, gateMid: 320, gateOut: 388, end: 518, toolAt: 570, nodeW: 104, nodeH: 34, gateSpan: [26, 274] },
  v: { w: 340, h: 350, lanes: [60, 170, 280], agentAt: 30, start: 47, gateIn: 126, gateMid: 175, gateOut: 224, end: 303, toolAt: 320, nodeW: 92, nodeH: 34, gateSpan: [12, 328] },
};

const T_IN = 650;
const T_SCAN = 300;
const T_CROSS = 260;
const T_OUT = 620;
const DECIDE_AT = T_IN + T_SCAN;
const ARRIVE_AT = DECIDE_AT + T_CROSS + T_OUT;
const BURST = 460;
const SPAWN_EVERY = 1050;
const LOG_SIZE = 4;

type Packet = {
  id: number;
  ev: PipelineEvent;
  born: number;
  decided: boolean;
  blocked: boolean;
  arrived: boolean;
};

type LogEntry = {
  id: number;
  time: string;
  outcome: Outcome;
  agent?: string;
  call: string;
  detail?: string;
};

const OUTCOME_LABEL: Record<Outcome, { tone: string; mark: string; label: string }> = {
  allow: { tone: 'allow', mark: '●', label: 'Allow' },
  block: { tone: 'block', mark: '×', label: 'Block' },
  unchecked: { tone: 'idle', mark: '○', label: 'Unchecked' },
  unsafe: { tone: 'critical', mark: '×', label: 'Executed' },
  system: { tone: 'idle', mark: '–', label: 'System' },
};

const ease = (t: number) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function clockTime() {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
}

function flash(el: Element | null | undefined, cls: string, ms = 520) {
  if (!el) return;
  el.classList.remove(cls);
  // Force a reflow so the class re-applies when the same node flashes twice in a row.
  void (el as SVGGraphicsElement).getBoundingClientRect();
  el.classList.add(cls);
  window.setTimeout(() => el.classList.remove(cls), ms);
}

export function MastyfPipeline() {
  const [orientation, setOrientation] = useState<Orientation>('h');
  const [enabled, setEnabled] = useState(true);
  const [paused, setPaused] = useState(false);
  const [packets, setPackets] = useState<{ id: number; unsafe: boolean }[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [counts, setCounts] = useState({ allowed: 0, blocked: 0, unsafe: 0 });

  const wrapRef = useRef<HTMLDivElement>(null);
  const gateRef = useRef<SVGGElement>(null);
  const toolRefs = useRef<(SVGGElement | null)[]>([]);
  const packetEls = useRef(new Map<number, SVGGElement>());
  const packetsRef = useRef<Packet[]>([]);
  const enabledRef = useRef(true);
  const orientationRef = useRef<Orientation>('h');
  const nextId = useRef(0);
  const nextEvent = useRef(0);
  // Simulation clock survives pause/resume so in-flight packets continue where they stopped.
  const clockRef = useRef(0);
  const lastSpawnRef = useRef(-SPAWN_EVERY);

  const g = GEOMETRY[orientation];
  const at = (flow: number, lane: number) => (orientation === 'h' ? { x: flow, y: lane } : { x: lane, y: flow });

  const pushLog = useCallback((entry: Omit<LogEntry, 'id' | 'time'>) => {
    const id = nextId.current++;
    setLog((prev) => [{ ...entry, id, time: clockTime() }, ...prev].slice(0, LOG_SIZE));
  }, []);

  const decide = useCallback(
    (ev: PipelineEvent) => {
      const agent = AGENTS[ev.agent];
      if (enabledRef.current && ev.unsafe) {
        flash(gateRef.current, 'is-blocking');
        setCounts((c) => ({ ...c, blocked: c.blocked + 1 }));
        pushLog({ outcome: 'block', agent, call: ev.call, detail: ev.rule });
        return true;
      }
      if (enabledRef.current) pushLog({ outcome: 'allow', agent, call: ev.call, detail: ev.rule });
      else if (!ev.unsafe) pushLog({ outcome: 'unchecked', agent, call: ev.call, detail: 'no policy check' });
      return false;
    },
    [pushLog]
  );

  const arrive = useCallback(
    (ev: PipelineEvent) => {
      const tool = toolRefs.current[ev.tool];
      if (ev.unsafe) {
        flash(tool, 'is-compromised', 900);
        setCounts((c) => ({ ...c, unsafe: c.unsafe + 1 }));
        pushLog({ outcome: 'unsafe', agent: AGENTS[ev.agent], call: ev.call, detail: ev.impact });
      } else {
        flash(tool, 'is-hit');
        setCounts((c) => ({ ...c, allowed: c.allowed + 1 }));
      }
    },
    [pushLog]
  );

  // Pick the vertical layout when the panel is narrow.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const next: Orientation = entry.contentRect.width < 520 ? 'v' : 'h';
      orientationRef.current = next;
      setOrientation(next);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Animation loop. Runs only while visible, focused, and not paused.
  useEffect(() => {
    if (paused) return;
    const el = wrapRef.current;
    if (!el) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let inView = false;
    let frame = 0;
    let interval = 0;
    let last = 0;

    const takeEvent = () => {
      const ev = PIPELINE_EVENTS[nextEvent.current % PIPELINE_EVENTS.length];
      nextEvent.current += 1;
      return ev;
    };

    const tick = (now: number) => {
      const dt = last ? Math.min(now - last, 50) : 16;
      last = now;
      clockRef.current += dt;
      const clock = clockRef.current;

      if (clock - lastSpawnRef.current >= SPAWN_EVERY) {
        lastSpawnRef.current = clock;
        const packet: Packet = { id: nextId.current++, ev: takeEvent(), born: clock, decided: false, blocked: false, arrived: false };
        packetsRef.current.push(packet);
        setPackets((prev) => [...prev, { id: packet.id, unsafe: packet.ev.unsafe }]);
      }

      const geo = GEOMETRY[orientationRef.current];
      const removed: number[] = [];
      for (const p of packetsRef.current) {
        const e = clock - p.born;
        const laneFrom = geo.lanes[p.ev.agent];
        const laneTo = geo.lanes[p.ev.tool];
        let flow: number;
        let lane = laneFrom;

        if (e < T_IN) flow = lerp(geo.start, geo.gateIn, ease(e / T_IN));
        else if (e < DECIDE_AT) flow = lerp(geo.gateIn, geo.gateMid, (e - T_IN) / T_SCAN);
        else if (p.blocked) flow = geo.gateMid;
        else if (e < DECIDE_AT + T_CROSS) {
          const k = ease((e - DECIDE_AT) / T_CROSS);
          flow = lerp(geo.gateMid, geo.gateOut, k);
          lane = lerp(laneFrom, laneTo, k);
        } else {
          flow = lerp(geo.gateOut, geo.end, ease((e - DECIDE_AT - T_CROSS) / T_OUT));
          lane = laneTo;
        }

        if (!p.decided && e >= DECIDE_AT) {
          p.decided = true;
          p.blocked = decide(p.ev);
          if (p.blocked) packetEls.current.get(p.id)?.classList.add('is-blocked');
        }
        if (!p.blocked && !p.arrived && e >= ARRIVE_AT) {
          p.arrived = true;
          arrive(p.ev);
        }
        if ((p.blocked && e >= DECIDE_AT + BURST) || e >= ARRIVE_AT + 60) removed.push(p.id);

        const node = packetEls.current.get(p.id);
        if (node) {
          const x = orientationRef.current === 'h' ? flow : lane;
          const y = orientationRef.current === 'h' ? lane : flow;
          node.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
        }
      }

      if (removed.length) {
        packetsRef.current = packetsRef.current.filter((p) => !removed.includes(p.id));
        setPackets((prev) => prev.filter((p) => !removed.includes(p.id)));
      }
      frame = requestAnimationFrame(tick);
    };

    // Reduced motion: decisions happen in place, without moving packets.
    const step = () => {
      const ev = takeEvent();
      if (!decide(ev)) arrive(ev);
    };

    const start = () => {
      if (!inView || document.hidden) return;
      if (reduced) {
        if (!interval) interval = window.setInterval(step, 1800);
      } else if (!frame) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      window.clearInterval(interval);
      interval = 0;
    };

    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) start();
      else stop();
    });
    io.observe(el);
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [paused, decide, arrive]);

  const toggleMastyf = () => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setEnabled(next);
    setCounts({ allowed: 0, blocked: 0, unsafe: 0 });
    setLog([]);
    pushLog({
      outcome: 'system',
      call: next ? 'Mastyf enabled. Every call is checked before it runs.' : 'Mastyf disabled. Calls go straight to the tools.',
    });
  };

  const node = (flow: number, lane: number, w: number, h: number) => {
    const c = at(flow, lane);
    return { x: c.x - w / 2, y: c.y - h / 2, width: w, height: h };
  };
  const wire = (f1: number, f2: number, lane: number) => {
    const a = at(f1, lane);
    const b = at(f2, lane);
    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
  };
  const gateBox =
    orientation === 'h'
      ? { x: g.gateIn, y: g.gateSpan[0], width: g.gateOut - g.gateIn, height: g.gateSpan[1] - g.gateSpan[0] }
      : { x: g.gateSpan[0], y: g.gateIn, width: g.gateSpan[1] - g.gateSpan[0], height: g.gateOut - g.gateIn };
  const gateLabel = orientation === 'h' ? { x: g.gateMid, y: g.gateSpan[0] + 18 } : { x: g.lanes[1], y: g.gateIn + 17 };
  const gateState = orientation === 'h' ? { x: g.gateMid, y: g.gateSpan[1] - 11 } : { x: g.lanes[1], y: g.gateOut - 9 };

  return (
    <div className="panel pipeline" ref={wrapRef}>
      <div className="panel__head pipeline__head">
        <span className="panel__title">
          Mastyf at work
          <span className="panel__meta">Simulated traffic</span>
        </span>
        <div className="pipeline__controls">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setPaused((value) => !value)}
            aria-label={paused ? 'Resume animation' : 'Pause animation'}
            data-tip={paused ? 'Resume' : 'Pause'}
          >
            {paused ? <Play size={14} strokeWidth={1.75} /> : <Pause size={14} strokeWidth={1.75} />}
          </button>
          <button type="button" role="switch" aria-checked={enabled} className="switch" onClick={toggleMastyf}>
            <span className="switch__track" aria-hidden="true">
              <span className="switch__thumb" />
            </span>
            Mastyf {enabled ? 'on' : 'off'}
          </button>
        </div>
      </div>

      <svg
        className={`flow flow--${orientation}`}
        viewBox={`0 0 ${g.w} ${g.h}`}
        role="img"
        aria-label={`Tool calls travel from AI agents through ${enabled ? 'Mastyf, which blocks unsafe calls' : 'no policy check, so unsafe calls reach the tools'}.`}
      >
        {g.lanes.map((lane) => (
          <line key={`in-${lane}`} className="flow__wire" {...wire(g.start, g.gateIn, lane)} />
        ))}
        {g.lanes.map((lane) => (
          <line key={`out-${lane}`} className="flow__wire" {...wire(g.gateOut, g.end, lane)} />
        ))}

        <g ref={gateRef} className={`flow__gate${enabled ? '' : ' is-off'}`}>
          <rect {...gateBox} rx={8} />
          {g.lanes.map((lane) => (
            <line key={`scan-${lane}`} className="flow__scan" {...wire(g.gateIn + 8, g.gateOut - 8, lane)} />
          ))}
          <text className="flow__gate-name" x={gateLabel.x} y={gateLabel.y} textAnchor="middle">
            MASTYF
          </text>
          <text className="flow__gate-state" x={gateState.x} y={gateState.y} textAnchor="middle">
            {enabled ? 'enforcing' : 'bypassed'}
          </text>
        </g>

        {AGENTS.map((name, i) => {
          const box = node(g.agentAt, g.lanes[i], g.nodeW, g.nodeH);
          return (
            <g key={name} className="flow__node">
              <rect {...box} rx={6} />
              <text x={box.x + box.width / 2} y={box.y + box.height / 2 + 4} textAnchor="middle">
                {name}
              </text>
            </g>
          );
        })}

        {TOOLS.map((name, i) => {
          const box = node(g.toolAt, g.lanes[i], g.nodeW, g.nodeH);
          return (
            <g
              key={name}
              className="flow__node flow__node--tool"
              ref={(el) => {
                toolRefs.current[i] = el;
              }}
            >
              <rect {...box} rx={6} />
              <text x={box.x + box.width / 2} y={box.y + box.height / 2 + 4} textAnchor="middle">
                {name}
              </text>
            </g>
          );
        })}

        {packets.map((p) => (
          <g
            key={p.id}
            className={`pkt ${p.unsafe ? 'pkt--unsafe' : 'pkt--safe'}`}
            transform={`translate(${at(g.start, g.lanes[0]).x} -20)`}
            ref={(el) => {
              if (el) packetEls.current.set(p.id, el);
              else packetEls.current.delete(p.id);
            }}
          >
            <circle className="pkt__ring" r={5} />
            <circle className="pkt__dot" r={4} />
          </g>
        ))}
      </svg>

      <dl className="pipeline__counts">
        <div>
          <dt>Safe calls</dt>
          <dd>{counts.allowed}</dd>
        </div>
        <div>
          <dt>Blocked</dt>
          <dd className={counts.blocked ? 'tone-allow' : undefined}>{counts.blocked}</dd>
        </div>
        <div>
          <dt>Unsafe executed</dt>
          <dd className={counts.unsafe ? 'tone-critical' : undefined}>{counts.unsafe}</dd>
        </div>
      </dl>

      <ol className="flowlog" aria-label="Recent decisions">
        {log.length === 0 ? (
          <li className="flowlog__row flowlog__row--idle">Listening for tool calls</li>
        ) : (
          log.map((entry) => {
            const o = OUTCOME_LABEL[entry.outcome];
            return (
              <li key={entry.id} className={`flowlog__row flowlog__row--${entry.outcome}`}>
                <span className="flowlog__time">{entry.time}</span>
                <span className={`status status--${o.tone}`}>
                  <span className="status__mark" aria-hidden="true">{o.mark}</span>
                  {o.label}
                </span>
                <span className="flowlog__call">
                  {entry.agent ? <span className="flowlog__agent">{entry.agent}</span> : null}
                  {entry.call}
                </span>
                {entry.detail ? <span className="flowlog__detail">{entry.detail}</span> : null}
              </li>
            );
          })
        )}
      </ol>
    </div>
  );
}
