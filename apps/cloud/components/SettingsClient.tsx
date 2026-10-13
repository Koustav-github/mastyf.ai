'use client';

import { useState } from 'react';
import { RotateCw } from 'lucide-react';
import { NPM_PRODUCT_NAME, SITE_NAME } from '@/lib/product-links';

/** API key rotation. The new key is shown once, right after rotating. */
export function SettingsClient({ activeKeys }: { activeKeys: number }) {
  const [rotating, setRotating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  const onRotate = async () => {
    if (!confirm('Rotate API key? The previous key will stop working immediately.')) return;
    setRotating(true);
    setError('');
    setNewKey(null);
    try {
      const res = await fetch('/api/v1/keys/rotate', { method: 'POST' });
      const data = (await res.json()) as { apiKey?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Rotation failed');
      setNewKey(data.apiKey ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rotation failed');
    } finally {
      setRotating(false);
    }
  };

  return (
    <section className="panel" aria-labelledby="api-keys">
      <div className="panel__head">
        <h2 id="api-keys" className="panel__title">
          API key
        </h2>
        <span className="panel__meta">{activeKeys === 1 ? '1 active key' : `${activeKeys} active keys`}</span>
      </div>
      <div className="panel__body">
        <p className="panel__text">
          Used for {SITE_NAME} Cloud <code>/api/v1/*</code> automation such as policy sync and fleet heartbeats. On a
          self-hosted {NPM_PRODUCT_NAME} proxy, set it as <code>MASTYF_AI_CLOUD_API_KEY</code>. Rotating replaces the
          current key at once, and the new one is shown only here, only once.
        </p>
        <button type="button" className="btn btn-primary" onClick={onRotate} disabled={rotating}>
          <RotateCw size={14} strokeWidth={2} aria-hidden="true" />
          {rotating ? 'Rotating…' : 'Rotate API key'}
        </button>
        {newKey ? (
          <div className="notice notice--ok" role="status" style={{ marginTop: 'var(--s-4)' }}>
            <strong>New API key. Copy it now; it won&rsquo;t be shown again.</strong>
            <pre className="envblock" style={{ marginTop: 'var(--s-2)' }}>
              {newKey}
            </pre>
          </div>
        ) : null}
        {error ? (
          <p className="notice notice--error" role="alert" style={{ marginTop: 'var(--s-4)' }}>
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
