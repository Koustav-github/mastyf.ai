'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  BarChart3, 
  Layers, 
  FileText, 
  ExternalLink, 
  Copy, 
  Check, 
  ShieldCheck, 
  Cpu, 
  Scale, 
  CheckCircle2 
} from 'lucide-react';
import { SSRN_PAPER_URL, SSRN_ABSTRACT_ID } from '@/lib/product-links';

const BENCHMARK_SUITES = [
  {
    name: 'UIUC InjecAgent Suite',
    cases: '4,216 cases',
    focus: 'Indirect Tool Parameter Injection',
    defense: '98.43%',
    utility: '90.89%',
    latency: '267.7 ms'
  },
  {
    name: 'AgentDojo (NeurIPS 2024)',
    cases: '629 episodes',
    focus: 'Multi-Turn Agent Trajectories',
    defense: '99.52%',
    utility: '100.0%',
    latency: '17.3 µs'
  },
  {
    name: 'Microsoft BIPIA Suite',
    cases: '125 cases',
    focus: 'Text & Code Prompt Injection',
    defense: '100.0%',
    utility: '99.8%',
    latency: '0.017 ms'
  },
  {
    name: 'Garak Red-Team Probes',
    cases: '300 probes',
    focus: 'Reverse Shells & Metadata SSRF',
    defense: '100.0%',
    utility: '100.0%',
    latency: '4.2 µs'
  }
];

export function BenchmarkProofSection() {
  const [copiedBibtex, setCopiedBibtex] = useState(false);

  const bibtex = `@article{das2026capability,
  title={Capability-Mediated Perimeters for Secure AI Agent Tool Execution: Compositional Authorization and Execution-Certainty Semantics Against Indirect Prompt Injection},
  author={Das, Rudraneel},
  journal={SSRN Electronic Journal},
  year={2026},
  note={Preprint under review. SSRN Abstract 7505299},
  url={https://papers.ssrn.com/sol3/papers.cfm?abstract_id=7505299}
}`;

  const copyBibtex = () => {
    navigator.clipboard.writeText(bibtex);
    setCopiedBibtex(true);
    setTimeout(() => setCopiedBibtex(false), 2000);
  };

  return (
    <section id="proofs" className="relative py-24 px-6 border-t border-b border-white/[0.06] bg-[#030509]">
      <div className="max-w-[1180px] mx-auto">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-flex items-center gap-2 text-xs font-mono font-semibold tracking-wider uppercase text-cyan-400 bg-cyan-500/[0.08] border border-cyan-500/20 px-3 py-1.5 rounded-full mb-3">
            <Scale className="w-3.5 h-3.5" />
            Empirical Validation & Preprint
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">
            Empirically Proven Across 4,040 Cases.
          </h2>
          <p className="text-sm md:text-base text-slate-400 leading-relaxed">
            Real model inference at temperature 0 across standard open-source benchmarks. Grounded in our research preprint currently under review.
          </p>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mb-12">
          
          {/* Left: Benchmark Suites Grid (7 cols) */}
          <div className="lg:col-span-7 bg-slate-950/80 rounded-2xl border border-white/[0.08] p-6 md:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  Independent Third-Party Suites
                </span>
                <span className="text-[11px] font-mono text-slate-500">Zero Synthetic Baselines</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {BENCHMARK_SUITES.map((suite, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.04]">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-xs font-bold text-white">{suite.name}</span>
                      <span className="text-[10px] font-mono text-slate-500">{suite.cases}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-3">{suite.focus}</p>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-xs font-mono">
                      <span className="text-emerald-400 font-bold">{suite.defense} Defense</span>
                      <span className="text-slate-400">{suite.utility} Utility</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Layered attribution bar */}
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
                  Layered Defense Attribution (First Block Wins · 3,113 Blocks)
                </span>
                <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden flex mb-3 border border-white/[0.06]">
                  <div style={{ width: '49.9%' }} className="bg-emerald-500 h-full" title="CBAC: 49.9%" />
                  <div style={{ width: '26.4%' }} className="bg-cyan-500 h-full" title="DIFC: 26.4%" />
                  <div style={{ width: '23.8%' }} className="bg-amber-500 h-full" title="Neural Gate: 23.8%" />
                </div>
                <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> CBAC Gate (49.9%)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-500" /> DIFC Taint (26.4%)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Neural 1.5B (23.8%)</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>Fast Path: 17.3 µs (P50)</span>
              <span>Total Cases: 4,040 Evaluated</span>
            </div>
          </div>

          {/* Right: SSRN Preprint & Research Attribution (5 cols) */}
          <div className="lg:col-span-5 bg-slate-950/80 rounded-2xl border border-white/[0.08] p-6 md:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-400" />
                  Research Preprint
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Preprint Under Review
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mb-2 leading-snug">
                Capability-Mediated Perimeters for Secure AI Agent Tool Execution
              </h3>
              <p className="text-xs text-slate-400 mb-4 font-mono">
                Author: Rudraneel Das · Mastyf AI Research Laboratory, Kolkata
              </p>

              <div className="space-y-2 mb-6 text-xs text-slate-300">
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span><strong>Theorem 1:</strong> Complete mediation guarantees zero backend bytes on non-ALLOW decisions.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span><strong>Theorem 2:</strong> Non-bypassability under DIFC session taint tracking across multi-tool chains.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span><strong>Theorem 3:</strong> Subordinate neural auditor invariant (<span className="font-mono text-amber-300">Afinal ⊆ Astruct</span>).</span>
                </div>
              </div>

              {/* BibTeX copy box */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/[0.04] mb-4">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
                  <span>SSRN Citation (BibTeX)</span>
                  <button
                    onClick={copyBibtex}
                    className="hover:text-white flex items-center gap-1 transition-colors"
                  >
                    {copiedBibtex ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedBibtex ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="text-[10px] font-mono text-slate-400 overflow-x-auto leading-relaxed max-h-24">
                  <code>{bibtex}</code>
                </pre>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.04] flex items-center justify-between">
              <Link
                href="https://papers.ssrn.com/sol3/papers.cfm?abstract_id=7505299"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-md shadow-amber-500/20"
              >
                <span>Read SSRN Preprint (Abstract #7505299)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>

              <Link
                href="https://orcid.org/0009-0009-6173-0262"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono text-slate-400 hover:text-white transition-colors"
              >
                ORCID: 0009-0009-6173-0262 ↗
              </Link>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
