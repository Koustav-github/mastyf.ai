'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, ShieldCheck, ArrowRight, CheckCircle2, PackageCheck } from 'lucide-react';
import { BorderBeam } from '@/components/ui/border-beam';
import { AnimatedNumber } from '@/components/ui/animated-number';

interface RegistryPackage {
  id: string;
  name: string;
  publisher: string;
  trustScore: number;
  toolInventory: number;
  capabilities: number;
  riskFindings: number;
  dependencies: number;
  latestAssessment: string;
  summary: string;
  verifiedStatus: 'MASTYF SCANNED' | 'CMQ QUALIFIED';
}

const REGISTRY_PACKAGES: RegistryPackage[] = [
  {
    id: 'github',
    name: '@modelcontextprotocol/server-github',
    publisher: 'Anthropic / ModelContextProtocol',
    trustScore: 94,
    toolInventory: 12,
    capabilities: 8,
    riskFindings: 1,
    dependencies: 24,
    latestAssessment: 'September 2026',
    summary: 'Repository inspection, issue tracker, pull request creation and merge operations.',
    verifiedStatus: 'MASTYF SCANNED',
  },
  {
    id: 'playwright',
    name: '@playwright/mcp',
    publisher: 'Microsoft / Community',
    trustScore: 88,
    toolInventory: 9,
    capabilities: 6,
    riskFindings: 2,
    dependencies: 41,
    latestAssessment: 'September 2026',
    summary: 'Headless browser automation, page navigation, DOM interaction, screenshot capture.',
    verifiedStatus: 'MASTYF SCANNED',
  },
  {
    id: 'postgres',
    name: '@modelcontextprotocol/server-postgres',
    publisher: 'ModelContextProtocol',
    trustScore: 91,
    toolInventory: 6,
    capabilities: 4,
    riskFindings: 1,
    dependencies: 18,
    latestAssessment: 'September 2026',
    summary: 'Direct PostgreSQL database query execution, schema inspection, transaction management.',
    verifiedStatus: 'CMQ QUALIFIED',
  },
  {
    id: 'filesystem',
    name: '@modelcontextprotocol/server-filesystem',
    publisher: 'ModelContextProtocol',
    trustScore: 96,
    toolInventory: 14,
    capabilities: 7,
    riskFindings: 0,
    dependencies: 12,
    latestAssessment: 'September 2026',
    summary: 'Local file read, directory traversal, write operations, and metadata querying.',
    verifiedStatus: 'CMQ QUALIFIED',
  },
];

export function RegistryPreviewSection() {
  const [searchQuery, setSearchQuery] = useState<string>('@modelcontextprotocol/server-github');
  const [selectedPkgId, setSelectedPkgId] = useState<string>('github');

  const filtered = REGISTRY_PACKAGES.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activePkg =
    filtered.find((p) => p.id === selectedPkgId) ||
    filtered[0] ||
    REGISTRY_PACKAGES[0];

  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" id="registry">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-semibold uppercase tracking-wider mb-4">
          Public MCP Trust Registry
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-5 leading-tight">
          Before you connect an AI tool, check it.
        </h2>
        <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
          Every MCP package and tool server receives automated static analysis, permission scoping,
          dependency tracking, and runtime behavioral assessment.
        </p>
      </div>

      {/* Interactive Search Bar */}
      <div className="max-w-3xl mx-auto mb-10">
        <div className="relative flex items-center rounded-2xl bg-[#080d1a]/90 border border-white/[0.12] p-2 shadow-[0_12px_36px_rgba(0,0,0,0.6)]">
          <Search className="w-5 h-5 text-amber-400 ml-3 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search MCP package name (e.g. @modelcontextprotocol/server-github)"
            className="w-full bg-transparent px-3 py-2 text-sm text-white placeholder-slate-500 font-mono outline-none"
          />
          <span className="hidden sm:inline-block font-mono text-[10px] text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20 shrink-0">
            Instant Lookup
          </span>
        </div>

        {/* Quick Chips */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 text-xs font-mono">
          <span className="text-slate-400 shrink-0">Popular:</span>
          {REGISTRY_PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              type="button"
              onClick={() => {
                setSearchQuery(pkg.name);
                setSelectedPkgId(pkg.id);
              }}
              className={`px-2.5 py-1 rounded-full border shrink-0 transition-colors ${
                activePkg.id === pkg.id
                  ? 'bg-amber-400/10 border-amber-400/40 text-amber-300'
                  : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-slate-200'
              }`}
            >
              {pkg.id}
            </button>
          ))}
        </div>
      </div>

      {/* Active Package Profile Showcase */}
      <div className="relative max-w-4xl mx-auto rounded-3xl bg-[#080d1a]/95 backdrop-blur-2xl border border-white/[0.1] p-6 sm:p-8 shadow-[0_30px_90px_rgba(0,0,0,0.8)] overflow-hidden">
        <BorderBeam size={280} duration={9} borderWidth={1.5} colorFrom="#f59e0b" colorTo="#10b981" />

        {/* Header Strip: Package Name & Trust Score */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-white/[0.08] mb-6">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block mb-1">
              MASTYF TRUST PROFILE
            </span>
            <h3 className="text-lg sm:text-2xl font-mono font-bold text-white break-all mb-1">
              {activePkg.name}
            </h3>
            <p className="text-xs text-slate-400">Published by {activePkg.publisher}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-center p-3 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/25 min-w-[110px]">
              <div className="text-3xl font-mono font-black text-emerald-400">
                <AnimatedNumber value={activePkg.trustScore} />
                <span className="text-xs text-emerald-500/80">/100</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-300 font-semibold uppercase tracking-wider">
                Trust Score
              </span>
            </div>
          </div>
        </div>

        {/* 5 Core Attributes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] text-center">
            <div className="text-[10px] text-slate-400 font-mono mb-1">Tools</div>
            <div className="text-lg font-mono font-bold text-white">
              <AnimatedNumber value={activePkg.toolInventory} />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] text-center">
            <div className="text-[10px] text-slate-400 font-mono mb-1">Capabilities</div>
            <div className="text-lg font-mono font-bold text-white">
              <AnimatedNumber value={activePkg.capabilities} />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] text-center">
            <div className="text-[10px] text-slate-400 font-mono mb-1">Risk Findings</div>
            <div className={`text-lg font-mono font-bold ${activePkg.riskFindings === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {activePkg.riskFindings}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] text-center">
            <div className="text-[10px] text-slate-400 font-mono mb-1">Dependencies</div>
            <div className="text-lg font-mono font-bold text-white">
              <AnimatedNumber value={activePkg.dependencies} />
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl bg-black/40 border border-white/[0.06] text-center">
            <div className="text-[10px] text-slate-400 font-mono mb-1">Assessed</div>
            <div className="text-xs font-mono font-semibold text-slate-300 pt-1">
              {activePkg.latestAssessment}
            </div>
          </div>
        </div>

        {/* Summary Description Box */}
        <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] text-xs text-slate-300 mb-6 leading-relaxed">
          <span className="font-semibold text-white">Summary: </span>
          {activePkg.summary}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/[0.08]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{activePkg.verifiedStatus}</span>
          </div>

          <Link
            href="/trust"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold text-black bg-amber-400 hover:bg-amber-300 transition-colors shadow-[0_0_20px_rgba(245,158,11,0.25)]"
          >
            <span>Search All Packages in Registry</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
