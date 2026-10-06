'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, ShieldCheck, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
    <section className="registry-section" id="registry">
      <div className="section-container">
        {/* Acquisition Header */}
        <div className="section-header">
          <div className="section-tag">PUBLIC MCP TRUST REGISTRY</div>
          <h2 className="section-title">
            Before you connect an AI tool, check it.
          </h2>
          <p className="section-subtitle">
            Every MCP package and tool server receives automated static analysis, permission scoping,
            dependency tracking, and runtime behavioral assessment.
          </p>
        </div>

        {/* Live Search Interactive Box */}
        <div className="registry-search-interactive-wrapper">
          <div className="registry-query-label">
            Is this MCP server safe?
          </div>

          <div className="registry-search-bar">
            <span className="search-prefix-icon font-mono font-bold text-amber-400">[?]</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search MCP package name (e.g. @modelcontextprotocol/server-github)"
              className="search-input-field font-mono"
            />
            <span className="search-submit-hint font-mono">Instant Lookup</span>
          </div>

          {/* Quick Select Preset Buttons */}
          <div className="registry-quick-chips">
            <span className="quick-chips-label">Popular packages:</span>
            {REGISTRY_PACKAGES.map((pkg) => (
              <button
                key={pkg.id}
                type="button"
                onClick={() => {
                  setSearchQuery(pkg.name);
                  setSelectedPkgId(pkg.id);
                }}
                className={`quick-chip-button font-mono ${activePkg.id === pkg.id ? 'active' : ''}`}
              >
                {pkg.name}
              </button>
            ))}
          </div>
        </div>

        {/* Active Package Trust Profile Card */}
        <div className="registry-profile-showcase relative overflow-hidden">
          <BorderBeam
            size={280}
            duration={9}
            borderWidth={1.5}
            colorFrom="#f59e0b"
            colorTo="#10b981"
          />

          <div className="profile-header-strip">
            <div className="profile-identity">
              <span className="profile-tag-eyebrow">MASTYF TRUST PROFILE</span>
              <h3 className="profile-package-name font-mono">{activePkg.name}</h3>
              <p className="profile-publisher">Published by {activePkg.publisher}</p>
            </div>

            <div className="profile-trust-score-badge">
              <div className="trust-score-circle">
                <span className="score-number">
                  <AnimatedNumber value={activePkg.trustScore} />
                </span>
                <span className="score-max">/100</span>
              </div>
              <span className="score-label">Trust Score</span>
            </div>
          </div>

          {/* 5 Core Registry Attributes */}
          <div className="profile-metrics-grid">
            <div className="profile-metric-cell">
              <span className="metric-cell-label">Tool Inventory</span>
              <span className="metric-cell-value">
                <AnimatedNumber value={activePkg.toolInventory} /> tools
              </span>
            </div>

            <div className="profile-metric-cell">
              <span className="metric-cell-label">Capabilities</span>
              <span className="metric-cell-value">
                <AnimatedNumber value={activePkg.capabilities} /> declared
              </span>
            </div>

            <div className="profile-metric-cell">
              <span className="metric-cell-label">Risk Findings</span>
              <span className={`metric-cell-value ${activePkg.riskFindings > 0 ? 'text-warn' : 'text-pass'}`}>
                {activePkg.riskFindings} finding{activePkg.riskFindings === 1 ? '' : 's'}
              </span>
            </div>

            <div className="profile-metric-cell">
              <span className="metric-cell-label">Dependencies</span>
              <span className="metric-cell-value">
                <AnimatedNumber value={activePkg.dependencies} /> packages
              </span>
            </div>

            <div className="profile-metric-cell">
              <span className="metric-cell-label">Latest Assessment</span>
              <span className="metric-cell-value">{activePkg.latestAssessment}</span>
            </div>
          </div>

          <div className="profile-summary-box">
            <strong>Package Summary:</strong> {activePkg.summary}
          </div>

          <div className="profile-footer-actions">
            <div className="profile-verified-badge">
              <Badge variant="success" className="text-xs">
                <span className="badge-dot mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {activePkg.verifiedStatus}
              </Badge>
            </div>

            <Link href={`/certified`} className="btn-dominant-hero">
              View Full Trust Profile -&gt;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
