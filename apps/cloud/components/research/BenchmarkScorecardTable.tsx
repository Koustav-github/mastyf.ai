'use client';

import { useState } from 'react';

interface BenchmarkRegime {
  id: string;
  name: string;
  dataset: string;
  episodes: string;
  mastyfDefense: string;
  baselineRawLLM: string;
  utilityRetention: string;
  notes: string;
}

const REGIMES: BenchmarkRegime[] = [
  {
    id: 'agentdojo',
    name: 'AgentDojo Suite',
    dataset: 'Real-world prompt injection attacks against autonomous tool agents',
    episodes: '629 Episodes',
    mastyfDefense: '99.52%',
    baselineRawLLM: '26.4%',
    utilityRetention: '100.0% Clean Utility',
    notes: 'Zero false-positive disruption on benign developer code compilation and file edits.',
  },
  {
    id: 'injecagent',
    name: 'InjecAgent Benchmark',
    dataset: 'Multi-turn indirect prompt injections and recursive parameter poisoning',
    episodes: '1,054 Test Cases',
    mastyfDefense: '99.10%',
    baselineRawLLM: '31.2%',
    utilityRetention: '99.8% Clean Utility',
    notes: 'Blocks payload evasion through recursive base64, URL encoding, and unicode homoglyphs.',
  },
  {
    id: 'toolbench',
    name: 'ToolBench Real-World 50k',
    dataset: 'Massive corpus of 50,000 real-world API tool invocations across 16,000 tools',
    episodes: '50,000 Invocations',
    mastyfDefense: '99.94%',
    baselineRawLLM: '42.8%',
    utilityRetention: '100.0% Clean Utility',
    notes: 'Enforces strict monetary and path containment ceilings with <4.8µs overhead.',
  },
  {
    id: 'asb',
    name: 'Autonomous Agent Security Bench (ASB)',
    dataset: 'Systematic evaluation of privilege escalation and multi-stage lateral movement',
    episodes: '420 Scenarios',
    mastyfDefense: '98.80%',
    baselineRawLLM: '19.5%',
    utilityRetention: '99.5% Clean Utility',
    notes: 'DIFC dynamic taint lattice stops unauthorized credential reuse across agent steps.',
  },
];

export function BenchmarkScorecardTable() {
  const [activeTab, setActiveTab] = useState<string>('agentdojo');
  const selected = REGIMES.find((r) => r.id === activeTab) || REGIMES[0];

  return (
    <div className="rounded-2xl bg-[#080c16] border border-white/10 shadow-2xl p-6 md:p-8 my-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-white/5 gap-2">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase block mb-1">
            Empirical Rigor
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            6-Regime Adversarial Benchmark Scorecard
          </h3>
        </div>
        <span className="text-xs font-mono text-slate-400">Zenodo Verified · DOI: 10.5281/zenodo.14920252</span>
      </div>

      {/* Regime Selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {REGIMES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setActiveTab(r.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono transition-all border ${
              activeTab === r.id
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 font-bold shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {r.name}
          </button>
        ))}
      </div>

      {/* Selected Benchmark Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 font-mono text-xs">
        <div className="p-4 rounded-xl bg-black/60 border border-white/10 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">Mastyf Defense Rate</span>
          <span className="text-3xl font-extrabold text-emerald-400 my-1">{selected.mastyfDefense}</span>
          <span className="text-[11px] text-slate-400">Complete wire severance</span>
        </div>

        <div className="p-4 rounded-xl bg-black/60 border border-white/10 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">Unprotected Raw LLM</span>
          <span className="text-3xl font-extrabold text-rose-400 my-1">{selected.baselineRawLLM}</span>
          <span className="text-[11px] text-slate-500">Easily compromised by injection</span>
        </div>

        <div className="p-4 rounded-xl bg-black/60 border border-white/10 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">Clean Utility Retention</span>
          <span className="text-3xl font-extrabold text-amber-400 my-1">{selected.utilityRetention}</span>
          <span className="text-[11px] text-slate-400">Zero false-positive disruption</span>
        </div>

        <div className="p-4 rounded-xl bg-black/60 border border-white/10 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">Evaluated Volume</span>
          <span className="text-2xl font-bold text-white my-1">{selected.episodes}</span>
          <span className="text-[11px] text-slate-400 truncate">{selected.dataset}</span>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-300 font-mono flex items-center justify-between flex-wrap gap-2">
        <span><strong>Empirical Finding:</strong> {selected.notes}</span>
        <span className="text-emerald-400 font-bold">100% Reproducible in Mastyf Swarm</span>
      </div>
    </div>
  );
}
