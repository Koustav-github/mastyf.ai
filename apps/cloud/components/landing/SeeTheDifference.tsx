'use client';

import { useState } from 'react';
import { History, SquareTerminal } from 'lucide-react';
import { AttackReplay } from './AttackReplay';
import { ToolCallTester } from './ToolCallTester';

type View = 'replay' | 'tester';

const VIEWS: { id: View; label: string; icon: typeof History }[] = [
  { id: 'replay', label: 'Replay an attack', icon: History },
  { id: 'tester', label: 'Test a tool call', icon: SquareTerminal },
];

export function SeeTheDifference() {
  const [view, setView] = useState<View>('replay');

  return (
    <section className="section" id="difference" aria-labelledby="difference-title">
      <header className="sec-head sec-head--split">
        <div>
          <p className="eyebrow">Live demo — simulated</p>
          <h2 id="difference-title">See what changes with Mastyf</h2>
        </div>
        <p>Run the same agent task with and without Mastyf, or write your own tool call and watch the decision.</p>
      </header>

      <div className="panel difference" data-reveal>
        <div className="panel__head">
          <div className="tablist" role="tablist" aria-label="Demo">
            {VIEWS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`difference-tab-${id}`}
                aria-selected={view === id}
                aria-controls="difference-panel"
                className="tab"
                onClick={() => setView(id)}
              >
                <Icon size={13} strokeWidth={1.75} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
          <span className="panel__meta">Simulated</span>
        </div>
        <div role="tabpanel" id="difference-panel" aria-labelledby={`difference-tab-${view}`}>
          {view === 'replay' ? <AttackReplay /> : <ToolCallTester />}
        </div>
      </div>
    </section>
  );
}
