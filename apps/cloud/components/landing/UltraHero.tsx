'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  Terminal, 
  Copy, 
  Check, 
  ShieldCheck, 
  Zap, 
  Lock, 
  Cpu, 
  FileText,
  Activity,
  Layers,
  ChevronRight
} from 'lucide-react';
import { GITHUB_REPO_URL } from '@/lib/github-links';

const LIVE_DISPATCH_EVENTS = [
  { time: '14:22:01.849', tool: 'aws_iam_assume_role', framework: 'Claude Desktop', verdict: 'BLOCKED', latency: '4.2 µs', reason: 'Unconstrained IAM privilege escalation' },
  { time: '14:22:02.102', tool: 'github_list_prs', framework: 'Cursor / AutoGen', verdict: 'ALLOWED', latency: '11.8 µs', reason: 'Matches read-only capability envelope' },
  { time: '14:22:02.438', tool: 'bash_exec (curl | sh)', framework: 'LangChain Agent', verdict: 'BLOCKED', latency: '17.3 µs', reason: 'Indirect prompt injection in untrusted doc' },
  { time: '14:22:02.915', tool: 'slack_send_message', framework: 'CrewAI Multi-Turn', verdict: 'ALLOWED', latency: '9.4 µs', reason: 'In-scope notification channel' },
  { time: '14:22:03.204', tool: 'postgres_dump_all', framework: 'Custom ReAct Loop', verdict: 'BLOCKED', latency: '267.7 ms', reason: 'Neural Auditor flagged DB mass exfiltration' },
  { time: '14:22:03.711', tool: 'filesystem_read (/etc/passwd)', framework: 'OpenAI Swarm', verdict: 'BLOCKED', latency: '3.1 µs', reason: 'Path traversal beyond root envelope' },
];

export function UltraHero() {
  const [copiedNpx, setCopiedNpx] = useState(false);

  const copyNpx = () => {
    navigator.clipboard.writeText('npx @mastyf/cli check');
    setCopiedNpx(true);
    setTimeout(() => setCopiedNpx(false), 2000);
  };

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 px-6 overflow-hidden">
      {/* Background radial gradient glow */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[850px] h-[550px] bg-gradient-to-b from-amber-500/10 via-cyan-500/[0.04] to-transparent blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-[1180px] mx-auto relative z-10">
        
        {/* Top Badges Strip */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <Link
            href="#model-explorer"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/[0.08] hover:bg-amber-500/[0.15] border border-amber-500/25 text-amber-300 text-xs font-mono transition-all group"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Mastyf Guard 1.5B (Frozen V6 Baseline)</span>
            <ChevronRight className="w-3 h-3 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <Link
            href="https://papers.ssrn.com/sol3/papers.cfm?abstract_id=7505299"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 text-xs font-mono transition-all"
          >
            <FileText className="w-3 h-3 text-cyan-400" />
            <span>SSRN Preprint Abstract #7505299 ↗</span>
          </Link>
        </div>

        {/* Hero Main Headline */}
        <div className="text-center max-w-4xl mx-auto mb-8">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.08] mb-6">
            The model is not <br className="hidden sm:inline" />
            the <span className="bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500 bg-clip-text text-transparent">security boundary.</span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-slate-300 font-light leading-relaxed max-w-3xl mx-auto">
            The agent proposes. <strong className="font-semibold text-white">Mastyf authorizes.</strong> Infrastructure executes.
          </p>
          <p className="text-sm sm:text-base text-slate-400 mt-4 max-w-2xl mx-auto leading-relaxed">
            Deterministic microsecond capability mediation (<span className="text-amber-400 font-mono">17.3 µs</span>) paired with an evidence-conditioned neural semantic fallback. Non-ALLOW decisions result in <strong className="text-white">strictly 0 backend bytes transmitted.</strong>
          </p>
        </div>

        {/* Hero Interactive Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <Link
            href="#model-explorer"
            className="px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all duration-200 shadow-xl shadow-amber-500/20 hover:shadow-amber-500/30 hover:scale-[1.02] flex items-center gap-2"
          >
            <Cpu className="w-4 h-4" />
            <span>Explore Interactive Model & Stats</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <button
            onClick={copyNpx}
            className="px-5 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-white/[0.1] text-slate-200 font-mono text-xs sm:text-sm transition-all flex items-center gap-3 group shadow-lg"
            title="Copy command to clipboard"
          >
            <Terminal className="w-4 h-4 text-amber-400" />
            <span>npx @mastyf/cli check</span>
            <span className="p-1 rounded bg-white/[0.06] group-hover:bg-white/[0.1] transition-colors">
              {copiedNpx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            </span>
          </button>

          <Link
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="px-5 py-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 font-medium text-sm transition-all flex items-center gap-2"
          >
            <span>GitHub Repository</span>
            <span className="text-xs font-mono text-slate-500">AGPL-3.0</span>
          </Link>
        </div>

        {/* 4 Quantitative Research Metrics Pill Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-2xl bg-slate-950/70 backdrop-blur-xl border border-white/[0.08] shadow-2xl mb-14">
          <div className="p-3 text-center sm:text-left border-r border-white/[0.04] last:border-0">
            <span className="text-xs text-slate-400 font-mono block mb-1">Fast-Path Latency</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">17.3 µs</div>
            <span className="text-[11px] text-slate-500 block mt-0.5">P50 on commodity CPU</span>
          </div>

          <div className="p-3 text-center sm:text-left border-r border-white/[0.04] last:border-0">
            <span className="text-xs text-slate-400 font-mono block mb-1">InjecAgent Defense</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">98.43%</div>
            <span className="text-[11px] text-slate-500 block mt-0.5">4,216 test cases (V6)</span>
          </div>

          <div className="p-3 text-center sm:text-left border-r border-white/[0.04] last:border-0">
            <span className="text-xs text-slate-400 font-mono block mb-1">Benign False Alarm Rate</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-cyan-400 font-mono">0.00%</div>
            <span className="text-[11px] text-slate-500 block mt-0.5">2,000 clean enterprise ops</span>
          </div>

          <div className="p-3 text-center sm:text-left">
            <span className="text-xs text-slate-400 font-mono block mb-1">Backend Transmission</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">0 Bytes</div>
            <span className="text-[11px] text-slate-500 block mt-0.5">Fail-closed non-ALLOW</span>
          </div>
        </div>

        {/* Live Dispatch Stream Terminal Card */}
        <div className="rounded-2xl bg-slate-950/90 border border-white/[0.1] overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900/80 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-xs font-mono text-slate-300 font-medium">mastyf-gateway-telemetry :: live execution boundary</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] font-mono text-emerald-400 font-medium">STREAMING</span>
            </div>
          </div>

          <div className="p-4 md:p-6 overflow-x-auto font-mono text-xs space-y-3 max-h-72">
            {LIVE_DISPATCH_EVENTS.map((evt, idx) => (
              <div 
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-900/40 hover:bg-slate-900/80 border border-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 text-[11px]">{evt.time}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    evt.verdict === 'BLOCKED' 
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {evt.verdict}
                  </span>
                  <span className="text-white font-medium">{evt.tool}</span>
                  <span className="text-slate-500 text-[11px] hidden md:inline">({evt.framework})</span>
                </div>

                <div className="flex items-center gap-4 text-[11px]">
                  <span className="text-slate-400">{evt.reason}</span>
                  <span className="text-amber-400/90 font-semibold">{evt.latency}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="px-5 py-3 bg-slate-900/60 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Enforcing Complete Mediation (Theorems 1 & 2)</span>
            <span className="text-emerald-400">0 Memory Leaks · Wire Severance Verified</span>
          </div>
        </div>

      </div>
    </section>
  );
}
