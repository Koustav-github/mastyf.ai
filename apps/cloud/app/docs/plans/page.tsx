import type { Metadata } from 'next';
import { DocPage, DocSection } from '@/components/docs/DocPage';
import { Plans } from '@/components/docs/Plans';

export const metadata: Metadata = {
  title: 'Plans and licensing — Mastyf docs',
  description: 'Every Mastyf plan’s full feature list, and how licensing and payment work.',
};

export default function PlansDocsPage() {
  return (
    <DocPage slug="plans">
      <DocSection id="plans" title="Plans and licensing">
        <p>Every plan&rsquo;s full feature list, and how licensing and payment work.</p>
        <div className="doc-block">
          <Plans />
        </div>
      </DocSection>
    </DocPage>
  );
}
