'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

/**
 * Lenis smooth scrolling on desktop wheel/trackpad input only. Touch keeps
 * native scrolling, and users who prefer reduced motion get the browser default.
 */
export function SmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.16,
      wheelMultiplier: 1,
      smoothWheel: true,
      syncTouch: false,
      anchors: { offset: -88 },
    });

    window.__lenis = lenis;
    // The home intro holds the page still until it finishes.
    if (document.documentElement.dataset.intro === 'play') lenis.stop();
    return () => {
      if (window.__lenis === lenis) delete window.__lenis;
      lenis.destroy();
    };
  }, []);

  return null;
}
