'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { ArrowUpRight, ChevronDown, ChevronUp } from 'lucide-react';
import type { LiveIncidentItem } from '@/app/api/v1/live-incidents/route';

const FILTERS = [
  { id: 'ALL', label: 'All dispatches' },
  { id: 'PROMPT_INJECTION', label: 'Prompt injection' },
  { id: 'AGENT_EXPLOIT', label: 'Agent tool exploits' },
  { id: 'MCP_VULNERABILITY', label: 'MCP protocol risks' },
  { id: 'CREDENTIAL_LEAK', label: 'Credential leaks' },
] as const;

const CATEGORY_LABEL: Record<LiveIncidentItem['category'], string> = {
  PROMPT_INJECTION: 'Prompt injection',
  AGENT_EXPLOIT: 'Agent exploit',
  MCP_VULNERABILITY: 'MCP vulnerability',
  CREDENTIAL_LEAK: 'Credential leak',
};

function formatRelativeTime(dateStr: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return 'Recently';
  }
}

// Feed text arrives with raw (sometimes truncated) HTML from RSS sources.
function toPlainText(value: string): string {
  return value
    .replace(/<[^>]*(>|$)/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function displayTitle(item: LiveIncidentItem): string {
  const title = toPlainText(item.title);
  const suffix = ` - ${item.source}`;
  return title.endsWith(suffix) ? title.slice(0, -suffix.length) : title;
}

function displaySnippet(item: LiveIncidentItem, title: string): string {
  const snippet = toPlainText(item.snippet).replace(/\.\.\.$/, '').trim();
  if (snippet.length < 12 || title.startsWith(snippet)) return '';
  return snippet;
}

function severityTone(severity: LiveIncidentItem['severity']) {
  return severity === 'HIGH' ? { tone: 'warning', mark: '▲' } : { tone: 'critical', mark: '×' };
}

export function IncidentFeed() {
  const [incidents, setIncidents] = useState<LiveIncidentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [showAll, setShowAll] = useState<boolean>(false);
  const [activeIncidentIndex, setActiveIncidentIndex] = useState<number>(0);

  // Fetch real-time live articles from our edge API route
  const fetchIncidents = async () => {
    try {
      const res = await fetch('/api/v1/live-incidents');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.incidents) && data.incidents.length > 0) {
          setIncidents(data.incidents);
        }
      }
    } catch (err) {
      console.error('Failed to load live incident wire:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    // Poll for new live breaking dispatches every 60 seconds
    const interval = setInterval(fetchIncidents, 60000);
    return () => clearInterval(interval);
  }, []);

  // Filter incidents based on category
  const filteredIncidents = useMemo(() => {
    if (activeFilter === 'ALL') return incidents;
    return incidents.filter((item) => item.category === activeFilter);
  }, [incidents, activeFilter]);

  // Rotate the current marker through the first six dispatches
  useEffect(() => {
    if (filteredIncidents.length === 0) return;
    const timer = setInterval(() => {
      setActiveIncidentIndex((prev) => (prev + 1) % Math.min(filteredIncidents.length, 6));
    }, 5500);
    return () => clearInterval(timer);
  }, [filteredIncidents.length]);

  const displayedIncidents = showAll ? filteredIncidents : filteredIncidents.slice(0, 6);

  return (
    <div className="wire">
      <dl className="wire__stats">
        <div>
          <dt>Feed status</dt>
          <dd>
            <span className="status status--active">
              <span className="status__mark" aria-hidden="true">●</span>
              Active dispatch
            </span>
          </dd>
        </div>
        <div>
          <dt>Live coverage</dt>
          <dd>{incidents.length > 0 ? `${incidents.length} dispatches ingested` : 'Streaming'}</dd>
        </div>
      </dl>

      <div className="panel" data-reveal>
        <div className="panel__head wire__head">
          <div className="tablist tablist--boxed" role="group" aria-label="Incident categories">
            {FILTERS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className="tab"
                aria-pressed={activeFilter === tab.id}
                onClick={() => setActiveFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="panel__meta">Refreshes every 60s</span>
        </div>

        {loading && incidents.length === 0 ? (
          <div className="wire__state">
            <div className="loader" role="status">
              <span>Querying security newsrooms and threat feeds</span>
              <span className="loader__track" aria-hidden="true" />
            </div>
          </div>
        ) : displayedIncidents.length === 0 ? (
          <div className="wire__state">
            <p>No dispatches in this category yet. Choose another category or check back after the next refresh.</p>
          </div>
        ) : (
          <ul className="incidents">
            {displayedIncidents.map((item, idx) => {
              const title = displayTitle(item);
              const snippet = displaySnippet(item, title);
              const sev = severityTone(item.severity);
              return (
                <li
                  key={`${item.url}-${idx}`}
                  className={`incident${idx === activeIncidentIndex ? ' is-current' : ''}`}
                >
                  <span className={`status status--${sev.tone}`}>
                    <span className="status__mark" aria-hidden="true">{sev.mark}</span>
                    {item.severity}
                  </span>
                  <div className="incident__main">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="incident__title">
                      {title}
                      <ArrowUpRight size={13} strokeWidth={1.75} aria-hidden="true" />
                    </a>
                    {snippet ? <p className="incident__snippet">{snippet}</p> : null}
                  </div>
                  <div className="incident__meta">
                    <span className="incident__source">{item.source}</span>
                    <span className="incident__cat">{CATEGORY_LABEL[item.category] ?? item.category}</span>
                  </div>
                  <time className="incident__time" dateTime={item.publishedAt}>
                    {formatRelativeTime(item.publishedAt)}
                  </time>
                </li>
              );
            })}
          </ul>
        )}

        {filteredIncidents.length > 6 && (
          <div className="panel__foot wire__foot">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAll((prev) => !prev)}>
              {showAll ? 'Show fewer dispatches' : `View all ${filteredIncidents.length} dispatches`}
              {showAll ? (
                <ChevronUp size={13} strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <ChevronDown size={13} strokeWidth={1.75} aria-hidden="true" />
              )}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
