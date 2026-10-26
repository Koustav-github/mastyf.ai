import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Download } from 'lucide-react';
import { DocPage, DocSection } from '@/components/docs/DocPage';
import { HERO_LEAD, HERO_VALUE_PILLARS } from '@/components/landing/stats';

export const metadata: Metadata = {
  title: 'Getting started — Mastyf docs',
  description: 'What Mastyf does and the fastest way to run it for desktop agents, developers and production.',
};

export default function GettingStartedPage() {
  return (
    <DocPage slug="getting-started">
      <DocSection id="overview" title="Overview">
        <p>{HERO_LEAD}</p>
        <dl className="doc-list">
          {HERO_VALUE_PILLARS.map((pillar) => (
            <div key={pillar.id}>
              <dt>{pillar.title}</dt>
              <dd>{pillar.body}</dd>
            </div>
          ))}
        </dl>
      </DocSection>

      <DocSection id="quickstart" title="Quickstart">
        <p>Pick the setup that matches where your agents run.</p>
        <div className="doc-grid">
          <div>
            <h3>Desktop agents</h3>
            <p>
              Protect Claude Desktop, Cursor, and Windsurf with Mastyf Shield for macOS (.dmg), Windows (.exe), or Linux
              (.AppImage, .deb).
            </p>
            <Link href="/download" className="btn btn-primary btn-sm">
              <Download size={13} strokeWidth={2} aria-hidden="true" />
              Download Shield
            </Link>
          </div>
          <div>
            <h3>Developer CLI</h3>
            <p>Install the gateway locally and route your MCP servers or agent framework through it.</p>
            <Link href="/docs/connect#install" className="link-icon">
              Install the gateway
              <ArrowRight size={13} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </div>
          <div>
            <h3>Production</h3>
            <p>Run the gateway as an inline sidecar in front of your agents and link it to your Mastyf Cloud workspace.</p>
            <Link href="/docs/connect#cloud" className="link-icon">
              Link to Mastyf Cloud
              <ArrowRight size={13} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </DocSection>
    </DocPage>
  );
}
