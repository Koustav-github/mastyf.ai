'use client';

import { useEffect, useState } from 'react';
import { Download, Save } from 'lucide-react';
import { SITE_NAME } from '@/lib/product-links';

type ActiveRule = {
  name: string;
  action: 'pass' | 'block' | 'flag';
  enabled: boolean;
  allowCount: number;
  denyCount: number;
  patternCount: number;
  argPatternCount: number;
};

type Status = { tone: 'ok' | 'warn' | 'error'; text: string } | null;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** What a rule matches on: tool lists and/or patterns (rate-limit rules have neither). */
function matchSummary(rule: ActiveRule): string {
  const tools = (rule.allowCount ?? 0) + (rule.denyCount ?? 0);
  const patterns = (rule.patternCount ?? 0) + (rule.argPatternCount ?? 0);
  const parts = [tools ? plural(tools, 'tool') : '', patterns ? plural(patterns, 'pattern') : ''].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
}

const ACTION_STATUS: Record<ActiveRule['action'], string> = {
  block: 'status--block',
  flag: 'status--warning',
  pass: 'status--allow',
};

export function PolicyEditor({ initialYaml }: { initialYaml: string }) {
  const [yaml, setYaml] = useState(initialYaml);
  const [rules, setRules] = useState<ActiveRule[]>([]);
  const [rulesState, setRulesState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [ruleFilter, setRuleFilter] = useState('');
  const [ruleBusy, setRuleBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setYaml(initialYaml);
  }, [initialYaml]);

  const refreshRules = async () => {
    try {
      const res = await fetch('/api/v1/policy/rules');
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { rules?: ActiveRule[] };
      setRules(data.rules ?? []);
      setRulesState('ready');
    } catch {
      setRulesState('error');
    }
  };

  const refreshYaml = async () => {
    const policyRes = await fetch('/api/v1/policy', { headers: { Accept: 'text/yaml' } });
    if (policyRes.ok) setYaml(await policyRes.text());
  };

  useEffect(() => {
    void refreshRules();
  }, []);

  const onSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/v1/policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yaml }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Save failed');
      }
      setStatus({ tone: 'ok', text: 'Saved. Linked proxies pick it up on their next sync.' });
      await refreshRules();
    } catch (err) {
      setStatus({ tone: 'error', text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const onDownload = () => {
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'policy.yaml';
    a.click();
    URL.revokeObjectURL(url);
  };

  const onToggleRule = async (rule: ActiveRule) => {
    const isCritical = rule.action === 'block' && rule.patternCount + rule.argPatternCount > 0;
    if (rule.enabled && isCritical) {
      const confirmed = confirm(
        `Disable "${rule.name}"? This appears to be a protection rule and may reduce blocking coverage.`,
      );
      if (!confirmed) return;
    }
    setRuleBusy(rule.name);
    setStatus(null);
    try {
      const res = await fetch('/api/v1/policy/rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: rule.name, enabled: !rule.enabled }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Rule update failed');
      }
      const data = (await res.json().catch(() => ({}))) as { warning?: string };
      setStatus(
        data.warning
          ? { tone: 'warn', text: data.warning }
          : { tone: 'ok', text: `Rule "${rule.name}" ${rule.enabled ? 'disabled' : 'enabled'}` },
      );
      await Promise.all([refreshRules(), refreshYaml()]);
    } catch (err) {
      setStatus({ tone: 'error', text: err instanceof Error ? err.message : 'Rule update failed' });
    } finally {
      setRuleBusy(null);
    }
  };

  const onDeleteRule = async (rule: ActiveRule) => {
    if (!confirm(`Delete rule "${rule.name}" from policy YAML?`)) return;
    const isCritical = rule.action === 'block' && rule.patternCount + rule.argPatternCount > 0;
    if (isCritical) {
      const confirmed = confirm(
        `Delete "${rule.name}"? This appears to be a protection rule and may reduce blocking coverage.`,
      );
      if (!confirmed) return;
    }
    setRuleBusy(rule.name);
    setStatus(null);
    try {
      const res = await fetch('/api/v1/policy/rules', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: rule.name }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Rule delete failed');
      }
      const data = (await res.json().catch(() => ({}))) as { warning?: string };
      setStatus(data.warning ? { tone: 'warn', text: data.warning } : { tone: 'ok', text: `Rule "${rule.name}" deleted` });
      await Promise.all([refreshRules(), refreshYaml()]);
    } catch (err) {
      setStatus({ tone: 'error', text: err instanceof Error ? err.message : 'Rule delete failed' });
    } finally {
      setRuleBusy(null);
    }
  };

  const filteredRules = rules.filter((rule) => {
    const q = ruleFilter.trim().toLowerCase();
    if (!q) return true;
    return rule.name.toLowerCase().includes(q) || rule.action.toLowerCase().includes(q);
  });
  const enabled = rules.filter((r) => r.enabled).length;

  return (
    <div className="dstack">
      {status ? (
        <p className={`notice notice--${status.tone}`} role={status.tone === 'error' ? 'alert' : 'status'}>
          {status.text}
        </p>
      ) : null}

      <section className="panel" aria-labelledby="rules">
        <div className="panel__head">
          <h2 id="rules" className="panel__title">
            Rules
          </h2>
          {rulesState === 'ready' ? (
            <span className="panel__meta">
              {rules.length} total, {enabled} enabled, {rules.length - enabled} disabled
            </span>
          ) : null}
        </div>
        <div className="panel__body">
          <label className="field">
            <span className="sr-only">Filter rules</span>
            <input
              className="input"
              value={ruleFilter}
              onChange={(e) => setRuleFilter(e.target.value)}
              placeholder="Filter by name or action"
            />
          </label>
        </div>
        <div className="panel__body panel__body--flush">
          {filteredRules.length ? (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Rule</th>
                    <th scope="col" className="col-opt">
                      Action
                    </th>
                    <th scope="col" className="col-opt">
                      Status
                    </th>
                    <th scope="col" className="col-opt">
                      Matches on
                    </th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRules.map((rule) => (
                    <tr key={rule.name}>
                      <td>
                        <code>{rule.name}</code>
                        <span className="cell-sub cell-sub--sm">
                          {rule.action === 'pass' ? 'Allow' : rule.action === 'flag' ? 'Flag' : 'Block'},{' '}
                          {rule.enabled ? 'enabled' : 'disabled'}
                        </span>
                      </td>
                      <td className="col-opt">
                        <span className={`status ${ACTION_STATUS[rule.action]}`}>{rule.action}</span>
                      </td>
                      <td className="dim col-opt">{rule.enabled ? 'Enabled' : 'Disabled'}</td>
                      <td className="dim col-opt">{matchSummary(rule)}</td>
                      <td>
                        <div className="cell-actions">
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => void onToggleRule(rule)}
                            disabled={ruleBusy === rule.name}
                          >
                            {rule.enabled ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            onClick={() => void onDeleteRule(rule)}
                            disabled={ruleBusy === rule.name}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty" role={rulesState === 'error' ? 'alert' : undefined}>
              {rulesState === 'loading'
                ? 'Loading rules…'
                : rulesState === 'error'
                  ? "Couldn't load the rules. The YAML below is still the saved policy; reload to try again."
                  : rules.length
                    ? 'No rules match that filter.'
                    : 'No rules yet. Add them in the YAML below.'}
            </p>
          )}
        </div>
      </section>

      <section className="panel" aria-labelledby="yaml">
        <div className="panel__head">
          <h2 id="yaml" className="panel__title">
            Policy YAML
          </h2>
          <div className="btn-row">
            <button type="button" className="btn btn-sm" onClick={onDownload}>
              <Download size={13} strokeWidth={1.75} aria-hidden="true" />
              Download
            </button>
            <button type="button" className="btn btn-sm btn-primary" onClick={onSave} disabled={saving}>
              <Save size={13} strokeWidth={2} aria-hidden="true" />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
        <div className="panel__body">
          <p className="panel__text">
            Your tenant policy on {SITE_NAME}. Self-hosted proxies pull it from <code>/api/v1/policy</code>.
          </p>
          <label className="field">
            <span className="sr-only">Policy YAML</span>
            <textarea
              className="textarea textarea--code"
              value={yaml}
              onChange={(e) => setYaml(e.target.value)}
              spellCheck={false}
            />
          </label>
        </div>
      </section>
    </div>
  );
}
