'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/** A just-issued license key. Only its hash is stored, so this is the one time it can be shown. */
export function LicenseKeyReveal({ licenseKey }: { licenseKey: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(licenseKey);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="license-key">
      <p className="license-key__label">
        Your license key. Copy it now: it is shown only once. Paste it into Shield or{' '}
        <code>mastyf activate --license-key</code>.
      </p>
      <div className="license-key__row">
        <code className="license-key__value">{licenseKey}</code>
        <button type="button" className="btn btn-sm" onClick={copy}>
          {copied ? (
            <Check size={13} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Copy size={13} strokeWidth={1.75} aria-hidden="true" />
          )}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
