import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Download } from 'lucide-react';
import { safeAuth } from '@/lib/safe-auth';
import { GITHUB_REPO_URL } from '@/lib/github-links';
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/lib/support';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteNav } from '@/components/SiteNav';
import { Benchmarks } from '@/components/docs/Benchmarks';
import { CompareTable } from '@/components/docs/CompareTable';
import { CostCalculator } from '@/components/docs/CostCalculator';
import { DecisionConsole } from '@/components/docs/DecisionConsole';
import { DocsNav, type DocsSectionLink } from '@/components/docs/DocsNav';
import { Guarantees } from '@/components/docs/Guarantees';
import { IncidentFeed } from '@/components/docs/IncidentFeed';
import { Integrations } from '@/components/docs/Integrations';
import { PlatformComponents, ShieldGates } from '@/components/docs/PlatformComponents';
import { Plans } from '@/components/docs/Plans';
import { ShieldAppDemo } from '@/components/docs/ShieldAppDemo';
import { AcademicPaperHero } from '@/components/landing/AcademicPaperHero';
import { FaqList } from '@/components/landing/FaqSection';
import { HERO_LEAD, HERO_VALUE_PILLARS } from '@/components/landing/stats';

export const metadata: Metadata = {
  title: 'Docs — Mastyf',
  description:
    'How Mastyf enforces policy on AI agent tool calls: deployment options, the four Shield gates, platform components, benchmarks, guarantees, the paper, plans, and FAQ.',
};

const SECTIONS: DocsSectionLink[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'quickstart', label: 'Quickstart' },
  { id: 'how-it-works', label: 'How enforcement works' },
  { id: 'components', label: 'Platform components' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'shield-app', label: 'Shield desktop app' },
  { id: 'cost', label: 'Performance and cost' },
  { id: 'benchmarks', label: 'Benchmarks' },
  { id: 'compare', label: 'How Mastyf compares' },
  { id: 'guarantees', label: 'Guarantees and limits' },
  { id: 'paper', label: 'Paper and proofs' },
  { id: 'plans', label: 'Plans and licensing' },
  { id: 'threats', label: 'Threat landscape' },
  { id: 'faq', label: 'FAQ' },
  { id: 'help', label: 'Get help' },
];

function DocSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="doc-section" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{title}</h2>
      {children}
    </section>
  );
}

export default async function DocsPage() {
  const session = await safeAuth();

  return (
    <>
      <SiteNav session={!!session} />
      <div className="docs">
        <DocsNav sections={SECTIONS} />

        <main id="main" className="docs__main">
          <header className="docs__intro">
            <h1>Documentation</h1>
            <p>How Mastyf enforces policy on agent tool calls, what each component does, and how to run it.</p>
          </header>

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
                  Protect Claude Desktop, Cursor, and Windsurf with Mastyf Shield for macOS (.dmg), Windows (.exe), or
                  Linux (.AppImage, .deb).
                </p>
                <Link href="/download" className="btn btn-primary btn-sm">
                  <Download size={13} strokeWidth={2} aria-hidden="true" />
                  Download Shield
                </Link>
              </div>
              <div>
                <h3>Developer CLI</h3>
                <p>Install the gateway locally and route your MCP servers through it from your client config.</p>
                <Link href="/developers" className="link-icon">
                  Developer quickstart
                  <ArrowRight size={13} strokeWidth={1.75} aria-hidden="true" />
                </Link>
              </div>
              <div>
                <h3>Production</h3>
                <p>Run Mastyf Gateway as an inline sidecar proxy in front of your agents and pipelines.</p>
                <Link href="/developers" className="link-icon">
                  Gateway setup
                  <ArrowRight size={13} strokeWidth={1.75} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </DocSection>

          <DocSection id="how-it-works" title="How enforcement works">
            <p>
              Mastyf sits on the MCP transport between the agent and its tools. Every tool invocation is intercepted and
              evaluated before dispatch. Shield runs four gates in order; if any check fails, the call is severed before a
              single byte reaches the backend.
            </p>
            <div className="doc-block">
              <ShieldGates />
            </div>
            <h3>Decision console</h3>
            <p>
              Step through four tool calls and see the decision for each: the client, the invariant that fired, and what
              reached the tool.
            </p>
            <div className="doc-block">
              <DecisionConsole />
            </div>
          </DocSection>

          <DocSection id="components" title="Platform components">
            <p>Five components, from a developer desktop sidecar to enterprise fleet governance.</p>
            <div className="doc-block">
              <PlatformComponents />
            </div>
          </DocSection>

          <DocSection id="integrations" title="Integrations">
            <p>Works with any client, IDE, or framework that speaks the Model Context Protocol.</p>
            <div className="doc-block">
              <Integrations />
            </div>
          </DocSection>

          <DocSection id="shield-app" title="Shield desktop app">
            <p>
              A lightweight, tamper-proof sidecar that intercepts every MCP tool call on your machine. No cloud round
              trip: decisions run locally.
            </p>
            <div className="doc-block">
              <ShieldAppDemo />
            </div>
          </DocSection>

          <DocSection id="cost" title="Performance and cost">
            <p>
              Cloud LLM guardrails add around 850ms per tool call and bill per check. Mastyf decides locally in under
              4.8µs for a flat monthly price. Adjust the inputs to compare.
            </p>
            <div className="doc-block">
              <CostCalculator />
            </div>
          </DocSection>

          <DocSection id="benchmarks" title="Benchmarks">
            <p>
              Results on standard adversarial evaluation suites, with the methodology and proofs documented in an
              open-access preprint.
            </p>
            <div className="doc-block">
              <Benchmarks />
            </div>
            <Link href="/research" className="link-icon doc-more">
              Paper, theorems, and limitations
              <ArrowRight size={13} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </DocSection>

          <DocSection id="compare" title="How Mastyf compares">
            <p>
              Most agent security tools moderate the conversation or audit logs after the fact. Mastyf enforces at the
              execution boundary: it authorizes each tool call against your policy, tracks workflow state, and is
              tested continuously by adversarial runs.
            </p>
            <div className="doc-block">
              <CompareTable />
            </div>
          </DocSection>

          <DocSection id="guarantees" title="Guarantees and limits">
            <p>
              What the architecture guarantees, and the limits documented in the published research, side by side.
            </p>
            <div className="doc-block">
              <Guarantees />
            </div>
          </DocSection>

          <DocSection id="paper" title="Paper and proofs">
            <p>
              The abstract, the invariants and theorems with their proofs, the six-regime results, and a BibTeX entry.
              To read the paper itself, open the{' '}
              <Link href="/research">research page</Link>.
            </p>
            <div className="doc-block">
              <AcademicPaperHero />
            </div>
          </DocSection>

          <DocSection id="plans" title="Plans and licensing">
            <p>Every plan&rsquo;s full feature list, and how licensing and payment work.</p>
            <div className="doc-block">
              <Plans />
            </div>
          </DocSection>

          <DocSection id="threats" title="Threat landscape">
            <p>
              A live, uncurated feed of public reporting on prompt injection, tool poisoning, and agent breaches. Each of
              these happened because an agent executed a tool call nobody checked.
            </p>
            <div className="doc-block">
              <IncidentFeed />
            </div>
          </DocSection>

          <DocSection id="faq" title="FAQ">
            <div className="doc-block">
              <FaqList />
            </div>
          </DocSection>

          <DocSection id="help" title="Get help">
            <p>
              Email <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a> or open an issue on GitHub.
            </p>
            <a href={`${GITHUB_REPO_URL}/issues`} target="_blank" rel="noopener noreferrer" className="link-icon">
              GitHub issues
              <ArrowUpRight size={13} strokeWidth={1.75} aria-hidden="true" />
            </a>
          </DocSection>
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
