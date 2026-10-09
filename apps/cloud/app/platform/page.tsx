import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Download } from 'lucide-react';
import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';
import { PlatformMap } from '@/components/platform/PlatformMap';
import { safeAuth } from '@/lib/safe-auth';

export const metadata: Metadata = {
  title: 'Platform — Mastyf',
  description:
    'How Shield, Gateway, Swarm, Trust, and the Control Plane fit around one checkpoint between your AI agents and your tools.',
};

export default async function PlatformPage() {
  const session = await safeAuth();

  return (
    <>
      <SiteNav session={!!session} />
      <main className="page-main">
        <header className="page-head">
          <h1 className="page-head__title">One checkpoint between your agents and your tools</h1>
          <p className="page-head__lead">
            Mastyf is five parts built around that checkpoint. Select a part to read how it works.
          </p>
        </header>

        <section className="section section--flush-top" aria-label="How the parts fit">
          <PlatformMap />
          <div className="page-head__actions">
            <Link href="/download" className="btn btn-primary">
              <Download size={14} strokeWidth={2} aria-hidden="true" />
              Download Shield
            </Link>
            <Link href="/docs#components" className="btn">
              Read the component docs
              <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />
            </Link>
            <Link href="/docs#compare" className="link-icon">
              How Mastyf compares
              <ArrowRight size={13} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
