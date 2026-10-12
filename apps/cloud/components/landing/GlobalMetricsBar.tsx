'use client';

import { useEffect, useState } from 'react';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { Activity, Shield, Cpu, Zap } from 'lucide-react';

interface Metric {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  suffix: string;
  prefix?: string;
  decimals?: number;
  color: string;
  glow: string;
  live?: boolean; // increments randomly to simulate real-time
}

const METRICS: Metric[] = [
  {
    icon: Shield,
    label: 'Threats Blocked Today',
    value: 2847193,
    suffix: '',
    color: 'text-amber-400',
    glow: 'shadow-[0_0_12px_rgba(245,158,11,0.25)]',
    live: true,
  },
  {
    icon: Cpu,
    label: 'Agents Enrolled',
    value: 14829,
    suffix: '+',
    color: 'text-cyan-400',
    glow: 'shadow-[0_0_12px_rgba(6,182,212,0.2)]',
    live: true,
  },
  {
    icon: Activity,
    label: 'Avg Gate Latency',
    value: 42,
    suffix: 'µs',
    color: 'text-emerald-400',
    glow: 'shadow-[0_0_12px_rgba(16,185,129,0.2)]',
    live: false,
  },
  {
    icon: Zap,
    label: 'Requests/Second Peak',
    value: 330,
    suffix: 'k',
    color: 'text-purple-400',
    glow: 'shadow-[0_0_12px_rgba(168,85,247,0.2)]',
    live: false,
  },
];

export function GlobalMetricsBar() {
  // Simulate live-updating metrics
  const [liveOffsets, setLiveOffsets] = useState<number[]>([0, 0, 0, 0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveOffsets((prev) =>
        prev.map((v, i) => {
          if (!METRICS[i].live) return v;
          return v + Math.floor(Math.random() * 12 + 1);
        })
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative py-0" aria-label="Live platform metrics">
      <div className="relative overflow-hidden border-y border-white/[0.06] bg-[#060a14]/80 backdrop-blur-xl">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-cyan-500/5 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/[0.06]">
            {METRICS.map((metric, i) => {
              const Icon = metric.icon;
              return (
                <div
                  key={metric.label}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 sm:px-6 py-5"
                >
                  <div className={`p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] ${metric.glow} shrink-0`}>
                    <Icon className={`w-4 h-4 ${metric.color}`} />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${metric.color}`}>
                      <AnimatedCounter
                        target={metric.value + liveOffsets[i]}
                        duration={1600}
                        suffix={metric.suffix}
                        prefix={metric.prefix}
                        decimals={metric.decimals ?? 0}
                      />
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-0.5 flex items-center gap-1.5">
                      {metric.live && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      )}
                      {metric.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
