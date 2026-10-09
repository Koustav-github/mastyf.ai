'use client';

import { useMemo, useState } from 'react';
import { TESTER_TOOLS, evaluateToolCall, type TesterTool, type Verdict } from './simulation';

const TOOL_ORDER: TesterTool[] = ['read', 'post', 'spawn'];

const VERDICT_VIEW: Record<Verdict, { tone: string; mark: string; label: string }> = {
  ALLOW: { tone: 'allow', mark: '●', label: 'Allowed' },
  ESCALATE: { tone: 'escalate', mark: '▲', label: 'Held for approval' },
  BLOCK: { tone: 'block', mark: '×', label: 'Blocked, 0 bytes sent' },
};

const UNCHECKED_VIEW: Record<Verdict, { tone: string; mark: string; label: string }> = {
  ALLOW: { tone: 'allow', mark: '●', label: 'Runs' },
  ESCALATE: { tone: 'warning', mark: '▲', label: 'Runs without review' },
  BLOCK: { tone: 'critical', mark: '×', label: 'Unsafe call runs' },
};

export function ToolCallTester() {
  const [tool, setTool] = useState<TesterTool>('read');
  const [arg, setArg] = useState(TESTER_TOOLS.read.presets[1]);
  const [tainted, setTainted] = useState(true);

  const spec = TESTER_TOOLS[tool];
  const decision = useMemo(() => evaluateToolCall(tool, arg, tainted), [tool, arg, tainted]);
  const guarded = VERDICT_VIEW[decision.verdict];
  const unguarded = UNCHECKED_VIEW[decision.verdict];

  const chooseTool = (next: TesterTool) => {
    setTool(next);
    const presets = TESTER_TOOLS[next].presets;
    setArg(presets[presets.length - 1]);
  };

  return (
    <div className="tester">
      <div className="tester__form">
        <div className="tester__field">
          <span className="label" id="tester-tool-label">
            Tool
          </span>
          <div className="tablist tablist--boxed" role="group" aria-labelledby="tester-tool-label">
            {TOOL_ORDER.map((t) => (
              <button key={t} type="button" className="tab" aria-pressed={tool === t} onClick={() => chooseTool(t)}>
                {TESTER_TOOLS[t].name}
              </button>
            ))}
          </div>
        </div>

        <div className="tester__field">
          <label className="label" htmlFor="tester-arg">
            {spec.arg}
          </label>
          <input
            id="tester-arg"
            type="text"
            value={arg}
            onChange={(e) => setArg(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
          />
          <div className="tester__presets" role="group" aria-label="Examples">
            {spec.presets.map((preset) => (
              <button
                key={preset}
                type="button"
                className="chip"
                aria-pressed={arg === preset}
                onClick={() => setArg(preset)}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <label className="check">
          <input type="checkbox" checked={tainted} onChange={(e) => setTainted(e.target.checked)} />
          <span>The agent already read untrusted web content in this session</span>
        </label>
      </div>

      <pre className="tester__call">
        <code>{`${spec.name}({"${spec.arg}": ${JSON.stringify(arg)}})`}</code>
      </pre>

      <div className="replay__cols">
        <div className="replay__col">
          <div className="replay__head">
            <span className="status status--idle">
              <span className="status__mark" aria-hidden="true">○</span>
              Without Mastyf
            </span>
          </div>
          <div className="tester__result">
            <span className={`status status--${unguarded.tone}`}>
              <span className="status__mark" aria-hidden="true">{unguarded.mark}</span>
              {unguarded.label}
            </span>
            <p>{decision.unchecked}</p>
          </div>
        </div>

        <div className="replay__col replay__col--guarded">
          <div className="replay__head">
            <span className="status status--active">
              <span className="status__mark" aria-hidden="true">●</span>
              With Mastyf
            </span>
          </div>
          <div className="tester__result" aria-live="polite">
            <span className={`status status--${guarded.tone}`}>
              <span className="status__mark" aria-hidden="true">{guarded.mark}</span>
              {guarded.label}
            </span>
            <dl className="kv tester__kv">
              <div>
                <dt>Rule</dt>
                <dd>
                  <code>{decision.rule}</code>
                </dd>
              </div>
              <div>
                <dt>Reason</dt>
                <dd>{decision.reason}</dd>
              </div>
              <div>
                <dt>Decided in</dt>
                <dd>{decision.latency}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <p className="tester__note">
        Illustrative policy running in your browser. In production, policies are YAML files you control.
      </p>
    </div>
  );
}
