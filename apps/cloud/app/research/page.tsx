import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Download } from 'lucide-react';
import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';
import { CiteButton } from '@/components/research/CiteButton';
import { PaperReader } from '@/components/research/PaperReader';
import {
  PAPER_LOCAL_PDF_PATH,
  PAPER_SUBTITLE,
  PAPER_TITLE,
  PAPER_VERSION,
  ZENODO_DOI,
  ZENODO_URL,
} from '@/lib/product-links';
import { safeAuth } from '@/lib/safe-auth';

export const metadata: Metadata = {
  title: 'Research — Mastyf',
  description:
    'Capability-Mediated Perimeters for Secure AI Agent Tool Execution: read the open-access preprint by Rudraneel Das, with formal invariants and benchmark results.',
};

export default async function ResearchPage() {
  const session = await safeAuth();

  return (
    <>
      <SiteNav session={!!session} />
      <main className="page-main">
        <header className="page-head">
          <p className="eyebrow">Preprint, version {PAPER_VERSION}</p>
          <h1 className="page-head__title page-head__title--long">{PAPER_TITLE}</h1>
          <p className="page-head__lead">{PAPER_SUBTITLE}</p>

          <dl className="facts">
            <div>
              <dt>Author</dt>
              <dd>Rudraneel Das</dd>
            </div>
            <div>
              <dt>DOI</dt>
              <dd>
                <a href={`https://doi.org/${ZENODO_DOI}`} target="_blank" rel="noopener noreferrer">
                  {ZENODO_DOI}
                </a>
              </dd>
            </div>
            <div>
              <dt>License</dt>
              <dd>CC BY 4.0, open access</dd>
            </div>
          </dl>

          <div className="page-head__actions">
            <a href={PAPER_LOCAL_PDF_PATH} download className="btn btn-primary">
              <Download size={14} strokeWidth={2} aria-hidden="true" />
              Download PDF
            </a>
            <a href={ZENODO_URL} target="_blank" rel="noopener noreferrer" className="btn">
              Zenodo record
              <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden="true" />
            </a>
            <CiteButton />
          </div>
        </header>

        <section className="section section--flush-top research-reader" aria-label="Read the paper">
          <PaperReader />
          <p className="research-reader__more">
            <Link href="/docs#paper" className="link-icon">
              Theorems, proofs and results, explained in the docs
              <ArrowRight size={13} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
