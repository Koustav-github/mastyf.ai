'use client';

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';

const URL_KEY = 'mastyf-ai-url';
const DEFAULT_URL = 'http://localhost:4000';

function isValidGuardianUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'null') return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** One-time SSO redirect into a self-hosted proxy's own dashboard. */
export function LaunchDashboard() {
  const [mastyfAiUrl, setMastyfAiUrl] = useState(DEFAULT_URL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Restore the last URL after mounting, so the server and first client render agree.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(URL_KEY);
      if (saved) setMastyfAiUrl(saved);
    } catch {
      /* storage unavailable: keep the default */
    }
  }, []);

  const onLaunch = async () => {
    setError('');
    if (!isValidGuardianUrl(mastyfAiUrl)) {
      setError('Enter a valid http:// or https:// proxy URL.');
      return;
    }
    setLoading(true);
    try {
      const normalized = mastyfAiUrl.trim();
      try {
        localStorage.setItem(URL_KEY, normalized);
      } catch {
        /* not remembered; the launch still works */
      }
      const res = await fetch('/api/dashboard/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mastyfAiUrl: normalized }),
      });
      const data = (await res.json()) as { redirectUrl?: string; error?: string };
      const redirectUrl = data.redirectUrl?.trim();
      if (!res.ok || !redirectUrl || !isValidGuardianUrl(redirectUrl)) {
        throw new Error(data.error ?? 'Launch failed');
      }
      window.location.href = redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Launch failed');
      setLoading(false);
    }
  };

  return (
    <section className="panel" aria-labelledby="launch">
      <div className="panel__head">
        <h2 id="launch" className="panel__title">
          Open a proxy&rsquo;s live dashboard
        </h2>
      </div>
      <div className="panel__body">
        <p className="panel__text">
          Signs you straight into the operations dashboard on your proxy host. That host needs the variables above, with{' '}
          <code>MASTYF_AI_CLOUD_JWT_SECRET</code> matching this cloud&rsquo;s <code>AUTH_SECRET</code>.
        </p>
        <div className="btn-row" style={{ alignItems: 'flex-end' }}>
          <label className="field" style={{ flex: '1 1 280px' }}>
            <span>Proxy URL</span>
            <input
              className="input"
              type="url"
              value={mastyfAiUrl}
              onChange={(e) => setMastyfAiUrl(e.target.value)}
              placeholder={DEFAULT_URL}
            />
          </label>
          <button type="button" className="btn btn-primary" onClick={() => void onLaunch()} disabled={loading}>
            <ExternalLink size={14} strokeWidth={2} aria-hidden="true" />
            {loading ? 'Redirecting…' : 'Open dashboard'}
          </button>
        </div>
        {error ? (
          <p className="notice notice--error" role="alert" style={{ marginTop: 'var(--s-4)' }}>
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
