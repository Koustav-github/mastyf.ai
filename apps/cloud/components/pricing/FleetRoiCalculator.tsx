'use client';

import { useState } from 'react';

export function FleetRoiCalculator() {
  const [agentsCount, setAgentsCount] = useState(15);
  const [dailyCalls, setDailyCalls] = useState(2500);

  // Calculations
  const monthlyInvocations = agentsCount * dailyCalls * 22; // 22 working days
  const projectedIncidentsPrevented = Math.max(1, Math.round(monthlyInvocations * 0.00048)); // ~0.048% malicious/drift rate
  const auditHoursSavedQuarterly = Math.round(agentsCount * 8.5);

  return (
    <div className="rounded-2xl bg-[#080c16] border border-white/10 shadow-2xl p-6 md:p-8 my-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-white/5 gap-2">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase block mb-1">
            Fleet Governance Economics
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Interactive Fleet Sizing &amp; Prevention Calculator
          </h3>
        </div>
        <span className="text-xs font-mono text-slate-400">Based on empirical benchmark data</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Sliders Area */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-slate-300">Active Coding Agents / Engineers:</span>
              <span className="text-amber-400 font-bold text-sm">{agentsCount} Agents</span>
            </div>
            <input
              type="range"
              min="1"
              max="150"
              value={agentsCount}
              onChange={(e) => setAgentsCount(Number(e.target.value))}
              className="w-full accent-amber-500 bg-white/10 h-1.5 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>1 (Individual)</span>
              <span>50 (Team)</span>
              <span>150+ (Enterprise Fleet)</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-slate-300">Tool Calls per Agent / Day:</span>
              <span className="text-amber-400 font-bold text-sm">{dailyCalls.toLocaleString()} Calls</span>
            </div>
            <input
              type="range"
              min="200"
              max="10000"
              step="200"
              value={dailyCalls}
              onChange={(e) => setDailyCalls(Number(e.target.value))}
              className="w-full accent-amber-500 bg-white/10 h-1.5 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>200 (Light coding)</span>
              <span>5,000 (Autonomous loops)</span>
              <span>10,000+ (High throughput)</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-400 font-mono flex items-center justify-between">
            <span>Monthly Mediated Executions:</span>
            <span className="text-white font-bold">{monthlyInvocations.toLocaleString()} Tool Invocations</span>
          </div>
        </div>

        {/* Telemetry Output Cards */}
        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl bg-black/60 border border-white/10 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Total Latency Budget</span>
            <div className="my-2">
              <span className="text-2xl font-extrabold text-emerald-400 font-mono">&lt;4.8µs</span>
              <span className="text-[11px] text-slate-400 block font-mono">per tool call</span>
            </div>
            <span className="text-[10px] text-slate-500 leading-tight">Zero perceptible delay to agent reasoning loop</span>
          </div>

          <div className="p-5 rounded-xl bg-black/60 border border-white/10 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Prevented Policy Drifts</span>
            <div className="my-2">
              <span className="text-2xl font-extrabold text-amber-400 font-mono">~{projectedIncidentsPrevented}</span>
              <span className="text-[11px] text-slate-400 block font-mono">severed / mo</span>
            </div>
            <span className="text-[10px] text-slate-500 leading-tight">Path escapes &amp; unintended command executions severed</span>
          </div>

          <div className="p-5 rounded-xl bg-black/60 border border-white/10 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Audit Prep Hours Saved</span>
            <div className="my-2">
              <span className="text-2xl font-extrabold text-sky-400 font-mono">{auditHoursSavedQuarterly} hrs</span>
              <span className="text-[11px] text-slate-400 block font-mono">quarterly</span>
            </div>
            <span className="text-[10px] text-slate-500 leading-tight">Instant non-repudiable Ed25519 receipts</span>
          </div>
        </div>
      </div>
    </div>
  );
}
