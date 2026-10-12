'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * AnimatedNebula v2 — Enhanced with animated circuit traces
 *
 * Layers (back → front):
 *   1. Deep radial void gradient (CSS only, instant)
 *   2. Three slow-drifting nebula orbs (CSS animation)
 *   3. Animated SVG circuit traces (path stroke-dashoffset animation)
 *   4. SVG noise grain overlay
 *   5. Interactive dot grid (canvas + mouse parallax)
 *   6. Cursor spotlight that radiates from the pointer
 */
export function AnimatedNebula() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Cursor position → CSS vars for spotlight
  useEffect(() => {
    if (!mounted || reducedMotion) return;
    const onMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--nebula-cx', `${e.clientX}px`);
      document.documentElement.style.setProperty('--nebula-cy', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [mounted, reducedMotion]);

  // Dot grid canvas with mouse parallax
  useEffect(() => {
    if (!mounted || reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let mx = 0;
    let my = 0;

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
      const step = 40;
      const offX = mx * 0.02;
      const offY = my * 0.02;
      for (let x = 0; x < width + step; x += step) {
        for (let y = 0; y < height + step; y += step) {
          ctx.beginPath();
          ctx.arc((x + offX) % width, (y + offY) % height, 1.0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = Math.max(window.innerHeight * 2.5, 2000);
      draw();
    };

    const onMove = (e: MouseEvent) => {
      mx = e.clientX - window.innerWidth / 2;
      my = e.clientY - window.innerHeight / 2;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [mounted, reducedMotion]);

  return (
    <div className="nebula-root" aria-hidden="true">
      {/* Layer 1: Radial void gradient */}
      <div className="nebula-void" />

      {/* Layer 2: Drifting nebula orbs */}
      {!reducedMotion && (
        <>
          <div className="nebula-orb nebula-orb-gold" />
          <div className="nebula-orb nebula-orb-cerulean" />
          <div className="nebula-orb nebula-orb-violet" />
        </>
      )}

      {/* Layer 3: Animated SVG circuit traces */}
      {mounted && !reducedMotion && (
        <svg
          className="absolute inset-0 w-full pointer-events-none"
          style={{ height: '100vh', zIndex: 1, opacity: 0.4 }}
          viewBox="0 0 1440 800"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="circuit-grad-gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="circuit-grad-cyan" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Horizontal circuit traces */}
          <path
            d="M 0 200 L 300 200 L 320 180 L 500 180 L 520 200 L 720 200"
            stroke="url(#circuit-grad-gold)"
            strokeWidth="1"
            strokeDasharray="720"
            strokeDashoffset="720"
            style={{ animation: 'circuit-trace 3s ease-in-out 0.5s forwards' }}
          />
          <path
            d="M 720 600 L 900 600 L 920 580 L 1100 580 L 1120 600 L 1440 600"
            stroke="url(#circuit-grad-cyan)"
            strokeWidth="1"
            strokeDasharray="720"
            strokeDashoffset="720"
            style={{ animation: 'circuit-trace 3s ease-in-out 1.5s forwards' }}
          />
          {/* Vertical connectors */}
          <path
            d="M 360 0 L 360 180"
            stroke="#f59e0b"
            strokeWidth="0.8"
            strokeOpacity="0.3"
            strokeDasharray="180"
            strokeDashoffset="180"
            style={{ animation: 'circuit-trace 2s ease-in-out 1s forwards' }}
          />
          <path
            d="M 1050 600 L 1050 800"
            stroke="#06b6d4"
            strokeWidth="0.8"
            strokeOpacity="0.25"
            strokeDasharray="200"
            strokeDashoffset="200"
            style={{ animation: 'circuit-trace 2s ease-in-out 2s forwards' }}
          />
          {/* Corner node dots */}
          <circle cx="320" cy="180" r="3" fill="#f59e0b" fillOpacity="0.4" style={{ animation: 'fade-in 0.3s ease 3s forwards', opacity: 0 }} />
          <circle cx="520" cy="200" r="3" fill="#f59e0b" fillOpacity="0.4" style={{ animation: 'fade-in 0.3s ease 3.2s forwards', opacity: 0 }} />
          <circle cx="920" cy="580" r="3" fill="#06b6d4" fillOpacity="0.35" style={{ animation: 'fade-in 0.3s ease 4s forwards', opacity: 0 }} />
          <circle cx="1120" cy="600" r="3" fill="#06b6d4" fillOpacity="0.35" style={{ animation: 'fade-in 0.3s ease 4.2s forwards', opacity: 0 }} />
        </svg>
      )}

      {/* Layer 4: SVG noise grain */}
      <div className="nebula-grain" />

      {/* Layer 5: Interactive dot grid */}
      {mounted && !reducedMotion ? (
        <canvas ref={canvasRef} className="nebula-grid" />
      ) : (
        <div className="nebula-grid-static" />
      )}

      {/* Layer 6: Cursor spotlight */}
      {mounted && !reducedMotion && (
        <div className="nebula-spotlight" />
      )}
    </div>
  );
}
