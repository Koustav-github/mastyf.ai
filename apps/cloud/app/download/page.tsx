import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteNav } from '@/components/SiteNav';
import { GatedDownloadBox } from '@/components/download/GatedDownloadBox';
import { CONTACT_EMAIL } from '@/lib/product-links';
import { GITHUB_REPO_URL } from '@/lib/github-links';
import { safeAuth } from '@/lib/safe-auth';

const DMG_SHA = process.env.NEXT_PUBLIC_SHIELD_DMG_SHA256 || '9a48d91c89f02c91a0f837eb5f0821d3f94a81e9b2071d02c46f8812c9b10492';
const VERSION = process.env.NEXT_PUBLIC_SHIELD_VERSION || '0.2.2';
const CHECKOUT_URL = 'https://mastyfai.lemonsqueezy.com/checkout/buy/49323daa-90ef-4157-90b9-8706acd13fe6';

export const metadata = {
  title: 'Download Mastyf Shield — Mastyf',
  description:
    'Download Mastyf Shield for macOS, Windows, and Linux: a desktop app that checks every tool call Claude Desktop, Cursor, and other local agents make before it runs.',
};

const STEPS = [
  {
    title: 'Get a license key',
    body: (
      <>
        Subscribe to Developer Pro ($49/month) on Lemon Squeezy. The key arrives by email.
      </>
    ),
  },
  {
    title: 'Install',
    body: (
      <>
        macOS: drag the <code>.dmg</code> to Applications. Windows: run the <code>.exe</code>. Linux: run the{' '}
        <code>.AppImage</code> or install the <code>.deb</code>.
      </>
    ),
  },
  {
    title: 'Activate',
    body: <>Paste the key into the first-launch window. Shield starts checking MCP tool calls right away.</>,
  },
];

const REQUIREMENTS = [
  { os: 'macOS', need: '12 Monterey or newer. Universal build for Apple Silicon (arm64) and Intel (x86_64).' },
  { os: 'Windows', need: 'Windows 10 (build 19041+) or Windows 11, x64 or ARM64.' },
  { os: 'Linux', need: 'glibc 2.28+: Ubuntu 20.04+, Debian 11+, Fedora 34+, Arch.' },
  { os: 'Works with', need: 'Claude Desktop, Cursor, Windsurf, VS Code, and any Model Context Protocol client.' },
];

export default async function DownloadPage() {
  const session = await safeAuth();

  return (
    <>
      <SiteNav session={!!session} />
      <main className="page-main">
        <header className="page-head page-head--split">
          <div>
            <h1 className="page-head__title">Download Mastyf Shield</h1>
            <p className="page-head__lead">
              A desktop app that sits between your local agents and their tools. Every tool call Claude Desktop, Cursor
              or Windsurf makes is checked against your policy before it runs.
            </p>
            <dl className="facts">
              <div>
                <dt>Version</dt>
                <dd>{VERSION}</dd>
              </div>
              <div>
                <dt>Platforms</dt>
                <dd>macOS, Windows, Linux</dd>
              </div>
              <div>
                <dt>Decision</dt>
                <dd>Under 4.8 µs, on device</dd>
              </div>
            </dl>
          </div>

          <GatedDownloadBox initialSession={!!session} version={VERSION} sha256={DMG_SHA} checkoutUrl={CHECKOUT_URL} />
        </header>

        <section className="section" aria-labelledby="setup-title">
          <h2 id="setup-title" className="section__title">
            Set up in three steps
          </h2>
          <ol className="step-row">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <span className="step-row__n">{i + 1}</span>
                <span>
                  <strong>{step.title}</strong>
                  {step.body}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="section" aria-labelledby="requirements-title">
          <div className="dl-more">
            <div>
              <h2 id="requirements-title" className="section__title">
                Requirements
              </h2>
              <div className="table-scroll">
                <table className="data-table">
                  <tbody>
                    {REQUIREMENTS.map((row) => (
                      <tr key={row.os}>
                        <th scope="row">{row.os}</th>
                        <td>{row.need}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h2 className="section__title">Other ways to run Mastyf</h2>
              <ul className="dl-alt">
                <li>
                  <span>
                    <strong>Open source CLI.</strong> The Gateway, policy engine and Swarm fixtures are free under
                    AGPL-3.0, no Shield license needed.
                  </span>
                  <span className="dl-alt__links">
                    <Link href="/developers" className="link-icon">
                      Developer quickstart
                      <ArrowRight size={13} strokeWidth={1.75} aria-hidden="true" />
                    </Link>
                    <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="link-icon">
                      GitHub
                      <ArrowUpRight size={13} strokeWidth={1.75} aria-hidden="true" />
                    </a>
                  </span>
                </li>
                <li>
                  <span>
                    <strong>A whole fleet.</strong> Kubernetes sidecars and managed distribution for teams.
                  </span>
                  <span className="dl-alt__links">
                    <Link href="/pilot" className="link-icon">
                      30-day pilot
                      <ArrowRight size={13} strokeWidth={1.75} aria-hidden="true" />
                    </Link>
                    <a href={`mailto:${CONTACT_EMAIL}`} className="link-icon">
                      {CONTACT_EMAIL}
                    </a>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
