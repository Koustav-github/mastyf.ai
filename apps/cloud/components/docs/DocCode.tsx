'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/** A command or code sample with a copy button. `label` names it for screen readers. */
export function DocCode({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="codeblock doc-code">
      <pre className="envblock" aria-label={label}>
        {code}
      </pre>
      <button type="button" className="btn btn-sm codeblock__copy" onClick={copy}>
        {copied ? (
          <Check size={13} strokeWidth={2} aria-hidden="true" />
        ) : (
          <Copy size={13} strokeWidth={1.75} aria-hidden="true" />
        )}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
