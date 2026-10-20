'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { newLicenseKeyAction, type NewLicenseKeyResult } from '@/app/dashboard/license/actions';
import { LicenseKeyReveal } from './LicenseKeyReveal';

/** For a lost or leaked key, or one never seen because the webhook finished the purchase. */
export function NewLicenseKeyButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<NewLicenseKeyResult | null>(null);

  function replace() {
    if (!window.confirm('Create a new license key? Your current key stops working on every machine using it.')) return;
    startTransition(async () => {
      const next = await newLicenseKeyAction();
      setResult(next);
      if ('licenseKey' in next) router.refresh();
    });
  }

  return (
    <div className="checkout">
      <button type="button" className="btn btn-sm" onClick={replace} disabled={pending} aria-busy={pending}>
        {pending ? 'Creating…' : 'Create a new key'}
      </button>
      {result && 'error' in result ? (
        <p className="notice notice--error" role="alert">
          {result.error}
        </p>
      ) : null}
      {result && 'licenseKey' in result ? (
        <div className="notice notice--ok" role="status">
          <LicenseKeyReveal licenseKey={result.licenseKey} />
        </div>
      ) : null}
    </div>
  );
}
