'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LEGACY_DOC_ANCHORS } from './topics';

/** /docs used to be one page; send old links like /docs#plans to the page that now holds that section. */
export function LegacyDocsRedirect() {
  const router = useRouter();

  useEffect(() => {
    const target = LEGACY_DOC_ANCHORS[window.location.hash.slice(1)];
    if (target) router.replace(target);
  }, [router]);

  return null;
}
