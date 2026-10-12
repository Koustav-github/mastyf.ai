'use client';

import React, { useEffect, useRef, useState, ReactNode } from 'react';

interface RevealOnScrollProps {
  children: ReactNode;
  className?: string;
  delay?: number; // ms delay before animation starts
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  once?: boolean;
  threshold?: number;
  mode?: string;
}

/**
 * RevealOnScroll — wraps children and animates them into view using IntersectionObserver.
 * Supports directional entrance, stagger delay, and repeat/once modes.
 */
export function RevealOnScroll({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  once = true,
  threshold = 0.1,
}: RevealOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once, threshold]);

  const transforms: Record<string, string> = {
    up: 'translateY(24px)',
    down: 'translateY(-24px)',
    left: 'translateX(24px)',
    right: 'translateX(-24px)',
    none: 'none',
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translate(0,0)' : transforms[direction],
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}

/**
 * StaggerReveal — wraps children and reveals each child with a staggered delay.
 */
export function StaggerReveal({
  children,
  className = '',
  staggerMs = 80,
  baseDelay = 0,
  direction = 'up',
  threshold = 0.08,
}: {
  children: ReactNode;
  className?: string;
  staggerMs?: number;
  baseDelay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  threshold?: number;
}) {
  const items = React.Children.toArray(children);
  return (
    <div className={className}>
      {items.map((child, i) => (
        <RevealOnScroll
          key={i}
          delay={baseDelay + i * staggerMs}
          direction={direction}
          threshold={threshold}
        >
          {child}
        </RevealOnScroll>
      ))}
    </div>
  );
}
