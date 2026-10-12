'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ShieldAlert, ArrowRight, ShieldCheck, Cpu, KeyRound, FileCheck, Lock, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export interface TraceStep {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  detail: string;
  status: 'passed' | 'failed' | 'evaluating' | 'idle';
  durationMs: number;
}

interface MotionTraceProps {
  scenarioName: string;
  isAllowed: boolean;
  blockedReason?: string;
  downstreamPayloadBytes: number;
  traceSteps?: TraceStep[];
  className?: string;
}

export function MotionTrace({
  scenarioName,
  isAllowed,
  blockedReason,
  downstreamPayloadBytes,
  traceSteps,
  className,
}: MotionTraceProps) {
  const defaultSteps: TraceStep[] = [
    {
      id: 'agent',
      name: 'Agent Action',
      icon: Cpu,
      detail: scenarioName,
      status: 'passed',
      durationMs: 0.12,
    },
    {
      id: 'identity',
      name: 'Identity Proof',
      icon: KeyRound,
      detail: 'Ed25519 signature verified',
      status: 'passed',
      durationMs: 0.28,
    },
    {
      id: 'contract',
      name: 'Contract Boundary',
      icon: FileCheck,
      detail: isAllowed ? 'Schema valid & within scope' : 'Scope violation / rule tripped',
      status: isAllowed ? 'passed' : 'failed',
      durationMs: 0.35,
    },
    {
      id: 'capability',
      name: 'Capability Lease',
      icon: Lock,
      detail: isAllowed ? 'Lease token granted' : (blockedReason || 'Lease denied'),
      status: isAllowed ? 'passed' : 'failed',
      durationMs: 0.22,
    },
    {
      id: 'execution',
      name: 'Destination Action',
      icon: Activity,
      detail: isAllowed ? 'Executed with proof receipt' : 'Terminated: 0 bytes sent',
      status: isAllowed ? 'passed' : 'failed',
      durationMs: isAllowed ? 1.4 : 0.0,
    },
  ];

  const steps = traceSteps || defaultSteps;

  return (
    <div
      className={cn(
        'relative rounded-xl border border-white/10 bg-[#080d19] p-5 shadow-2xl overflow-hidden',
        className
      )}
    >
      {/* Background glow lines */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute -top-1/2 left-1/4 h-64 w-96 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="absolute -bottom-1/2 right-1/4 h-64 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
      </div>

      {/* Header bar */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-wider text-slate-400">
            Real-Time Decision Trace
          </span>
          <span className="font-mono text-[11px] text-slate-500">
            [CMQ Active Invariant]
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={isAllowed ? 'success' : 'destructive'} className="text-xs">
            {isAllowed ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 mr-1 inline" />
                VERDICT: ALLOWED
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-red-400 mr-1 inline" />
                VERDICT: BLOCKED
              </>
            )}
          </Badge>

          <span className="font-mono text-xs text-slate-400 bg-white/5 px-2.5 py-0.5 rounded border border-white/10">
            Payload Sent: <strong className={isAllowed ? 'text-emerald-400' : 'text-amber-400'}>{downstreamPayloadBytes} bytes</strong>
          </span>
        </div>
      </div>

      {/* Step pipeline grid */}
      <div className="relative mt-5 grid grid-cols-1 md:grid-cols-5 gap-3">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isFailed = step.status === 'failed';
          const isPassed = step.status === 'passed';

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.08 }}
              className={cn(
                'relative flex flex-col justify-between p-3.5 rounded-lg border transition-all duration-200',
                isFailed
                  ? 'border-red-500/40 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.12)]'
                  : isPassed
                  ? 'border-emerald-500/30 bg-emerald-950/15'
                  : 'border-white/10 bg-white/[0.02]'
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'flex items-center justify-center w-6 h-6 rounded-md border text-xs',
                        isFailed
                          ? 'border-red-500/40 bg-red-500/10 text-red-400'
                          : isPassed
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                          : 'border-slate-700 bg-slate-800 text-slate-400'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-200">{step.name}</span>
                  </div>

                  <span className="font-mono text-[10px] text-slate-500">
                    +{step.durationMs.toFixed(2)}ms
                  </span>
                </div>

                <p className="text-[11px] font-mono leading-relaxed text-slate-400">
                  {step.detail}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-500">Stage {idx + 1}/5</span>
                <span
                  className={cn(
                    'font-semibold uppercase tracking-wider',
                    isFailed ? 'text-red-400' : isPassed ? 'text-emerald-400' : 'text-slate-400'
                  )}
                >
                  {isFailed ? 'REJECTED' : isPassed ? 'VERIFIED' : 'PENDING'}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Downstream assertion bar */}
      <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">CMQ Cryptographic Guarantee:</span>
          <span className="text-slate-300">
            {isAllowed
              ? 'Execution permitted under active signed lease. Complete audit log persisted.'
              : 'Zero downstream payload bytes emitted. Zero side effects in external systems.'}
          </span>
        </div>
        <div className="text-[11px] text-slate-500">
          Latency: <span className="text-slate-300 font-semibold">{isAllowed ? '1.87ms' : '0.75ms'}</span>
        </div>
      </div>
    </div>
  );
}
