'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Reveals any element marked `data-reveal` once it scrolls into view.
 * Content stays visible without JavaScript: the hidden starting state only
 * applies after this component adds `reveal-ready` to <html>.
 */
export function RevealManager() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('reveal-ready');

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );

    const observeAll = () => {
      document.querySelectorAll('[data-reveal]:not(.is-revealed)').forEach((el) => observer.observe(el));
    };
    observeAll();

    const mutations = new MutationObserver(observeAll);
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, [pathname]);

  return null;
}
