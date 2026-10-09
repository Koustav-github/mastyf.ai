'use client';

import { useEffect, useRef } from 'react';

const INTERACTIVE =
  'a, button, [role="button"], summary, label, select, input[type="range"], [data-cursor="interactive"]';
const TEXT_ENTRY =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="submit"]):not([type="button"]), textarea, [contenteditable="true"]';
const RING_EASE = 0.28;
const MAGNET_PULL = 0.35;
const MAGNET_MAX_PX = 2;

/**
 * A small dot that tracks the pointer exactly, plus a thin ring that eases
 * behind it, grows over interactive elements and is pulled toward elements
 * marked `data-magnetic`. Mouse only: touch devices and reduced-motion users
 * keep the native cursor.
 */
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!finePointer || reducedMotion || !dot || !ring) return;

    const root = document.documentElement;
    root.classList.add('has-custom-cursor');

    let x = -100;
    let y = -100;
    let ringX = -100;
    let ringY = -100;
    let visible = false;
    let magnet: HTMLElement | null = null;
    let frame = 0;

    const releaseMagnet = () => {
      if (magnet) magnet.style.translate = '';
      magnet = null;
    };

    const updateTarget = (target: Element | null) => {
      const overText = Boolean(target?.closest(TEXT_ENTRY));
      const overInteractive = Boolean(target?.closest(INTERACTIVE));
      ring.dataset.state = overText ? 'text' : overInteractive ? 'interactive' : '';
      dot.dataset.state = overText ? 'text' : '';

      const nextMagnet = (target?.closest('[data-magnetic]') as HTMLElement | null) ?? null;
      if (nextMagnet !== magnet) {
        releaseMagnet();
        magnet = nextMagnet;
      }
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      x = event.clientX;
      y = event.clientY;
      if (!visible) {
        visible = true;
        ringX = x;
        ringY = y;
        root.classList.add('cursor-visible');
      }
      updateTarget(event.target as Element | null);
    };

    const hide = () => {
      visible = false;
      root.classList.remove('cursor-visible');
      releaseMagnet();
    };
    const press = () => ring.classList.add('is-pressed');
    const release = () => ring.classList.remove('is-pressed');

    const tick = () => {
      let targetX = x;
      let targetY = y;
      if (magnet) {
        const box = magnet.getBoundingClientRect();
        const centerX = box.left + box.width / 2;
        const centerY = box.top + box.height / 2;
        targetX = x + (centerX - x) * MAGNET_PULL;
        targetY = y + (centerY - y) * MAGNET_PULL;
        const nudgeX = Math.max(-MAGNET_MAX_PX, Math.min(MAGNET_MAX_PX, (x - centerX) * 0.08));
        const nudgeY = Math.max(-MAGNET_MAX_PX, Math.min(MAGNET_MAX_PX, (y - centerY) * 0.12));
        magnet.style.translate = `${nudgeX.toFixed(2)}px ${nudgeY.toFixed(2)}px`;
      }
      ringX += (targetX - ringX) * RING_EASE;
      ringY += (targetY - ringY) * RING_EASE;
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', press);
    window.addEventListener('pointerup', release);
    window.addEventListener('blur', hide);
    root.addEventListener('mouseleave', hide);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', press);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('blur', hide);
      root.removeEventListener('mouseleave', hide);
      releaseMagnet();
      root.classList.remove('has-custom-cursor', 'cursor-visible');
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="cursor-ring" aria-hidden="true">
        <span className="cursor-ring__shape" />
      </div>
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
    </>
  );
}
