'use client';

import { useState } from 'react';
import { Check, Quote } from 'lucide-react';
import { PAPER_BIBTEX } from '@/lib/product-links';

/** Copies the paper's BibTeX entry. */
export function CiteButton() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PAPER_BIBTEX);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button type="button" className="btn" onClick={copy}>
      {copied ? (
        <Check size={14} strokeWidth={2} aria-hidden="true" />
      ) : (
        <Quote size={14} strokeWidth={1.75} aria-hidden="true" />
      )}
      <span aria-live="polite">{copied ? 'BibTeX copied' : 'Copy BibTeX'}</span>
    </button>
  );
}
