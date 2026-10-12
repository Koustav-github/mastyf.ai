'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import { PRICING_TIERS, CAPABILITY_MATRIX } from './stats';

export function ModernPricing() {
  const [showMatrix, setShowMatrix] = useState(false);

  return (
    <section id="pricing" className="relative py-28 px-6 bg-[#03060d] text-slate-100 border-t border-white/[0.06]">
      <div className="max-w-[1180px] mx-auto relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/[0.08] border border-amber-500/20 text-amber-400 text-xs font-mono tracking-wider uppercase mb-5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Transparent Commercial Model
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-6">
            Predictable Pricing for Agent Fleets.
          </h2>
          <p className="text-base md:text-lg text-slate-400 leading-relaxed">
            Free and open-source self-hostable core under AGPL-3.0. Commercial runtime licenses and enterprise governance when you scale.
          </p>
        </div>

        {/* 5-Tier Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-stretch mb-16">
          {PRICING_TIERS.map((tier) => {
            const isFeatured = tier.featured;
            return (
              <div
                key={tier.id}
                className={`relative rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 ${
                  isFeatured
                    ? 'bg-slate-900/90 border-2 border-amber-500 shadow-2xl shadow-amber-500/10 lg:-translate-y-2'
                    : 'bg-slate-950/70 border border-white/[0.08] hover:border-white/[0.15]'
                }`}
              >
                {isFeatured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-mono font-bold uppercase tracking-wider">
                    Most Popular
                  </div>
                )}

                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-white mb-1">{tier.name}</h3>
                    <p className="text-xs text-slate-400 leading-tight min-h-[32px]">{tier.description}</p>
                  </div>

                  <div className="mb-5 pb-4 border-b border-white/[0.06]">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-white font-mono">{tier.price}</span>
                      <span className="text-xs text-slate-400 font-mono">/{tier.billing}</span>
                    </div>
                  </div>

                  <ul className="space-y-2.5 mb-6 text-xs text-slate-300">
                    {tier.bullets.map((b, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span className="leading-tight">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <Link
                    href={tier.href}
                    target={tier.external ? '_blank' : undefined}
                    rel={tier.external ? 'noreferrer' : undefined}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      isFeatured
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                        : 'bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.08]'
                    }`}
                  >
                    <span>{tier.cta}</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Competitor Comparison Matrix Toggle */}
        <div className="text-center mb-8">
          <button
            onClick={() => setShowMatrix(!showMatrix)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-mono text-slate-300 border border-white/[0.08] transition-colors"
          >
            <span>{showMatrix ? 'Hide' : 'Show'} Full Capability Matrix vs. Competitors</span>
            <ArrowRight className={`w-3.5 h-3.5 text-amber-400 transition-transform ${showMatrix ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {/* Capability Comparison Matrix */}
        {showMatrix && (
          <div className="bg-slate-950/90 border border-white/[0.08] rounded-2xl p-6 md:p-8 overflow-x-auto shadow-2xl mb-12">
            <h4 className="text-lg font-bold text-white mb-4">Mastyf vs. Traditional Agent Security Approaches</h4>
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/[0.08] text-slate-400">
                  <th className="py-3 px-4 font-semibold">Security Architectural Dimension</th>
                  <th className="py-3 px-4 text-amber-400 font-bold">Mastyf Security Platform</th>
                  <th className="py-3 px-4">Microsoft In-App</th>
                  <th className="py-3 px-4">Noma Security</th>
                  <th className="py-3 px-4">Obsidian Security</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                {CAPABILITY_MATRIX.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-sans text-white font-medium">{row.feature}</td>
                    <td className="py-3 px-4 text-amber-400 font-bold">{row.mastyf}</td>
                    <td className="py-3 px-4 text-slate-400">{row.microsoft}</td>
                    <td className="py-3 px-4 text-slate-400">{row.noma}</td>
                    <td className="py-3 px-4 text-slate-400">{row.obsidian}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </section>
  );
}
