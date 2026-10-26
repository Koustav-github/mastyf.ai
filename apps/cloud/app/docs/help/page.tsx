import type { Metadata } from 'next';
import { ArrowUpRight } from 'lucide-react';
import { DocPage, DocSection } from '@/components/docs/DocPage';
import { FaqList } from '@/components/landing/FaqSection';
import { GITHUB_REPO_URL } from '@/lib/github-links';
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/lib/support';

export const metadata: Metadata = {
  title: 'FAQ and help — Mastyf docs',
  description: 'Answers to common questions about Mastyf, and how to reach the team.',
};

export default function HelpPage() {
  return (
    <DocPage slug="help">
      <DocSection id="faq" title="FAQ">
        <div className="doc-block">
          <FaqList />
        </div>
      </DocSection>

      <DocSection id="contact" title="Get help">
        <p>
          Email <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a> or open an issue on GitHub.
        </p>
        <a href={`${GITHUB_REPO_URL}/issues`} target="_blank" rel="noopener noreferrer" className="link-icon">
          GitHub issues
          <ArrowUpRight size={13} strokeWidth={1.75} aria-hidden="true" />
        </a>
      </DocSection>
    </DocPage>
  );
}
