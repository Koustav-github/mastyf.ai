import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { DOC_TOPICS, docHref, docTopic } from './topics';

/** One docs topic: its title and lead, its sections, then links to the topics around it. */
export function DocPage({ slug, lead, children }: { slug: string; lead?: string; children: React.ReactNode }) {
  const topic = docTopic(slug);
  const index = DOC_TOPICS.indexOf(topic);
  const prev = DOC_TOPICS[index - 1];
  const next = DOC_TOPICS[index + 1];

  return (
    <main id="main" className="docs__main">
      <header className="docs__intro">
        <h1>{topic.title}</h1>
        <p>{lead ?? topic.summary}</p>
      </header>

      {children}

      <nav className="docs__pager" aria-label="More documentation">
        {prev ? (
          <Link href={docHref(prev.slug)} className="docs__pager-link">
            <span className="label">Previous</span>
            <span className="docs__pager-title">
              <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
              {prev.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={docHref(next.slug)} className="docs__pager-link docs__pager-link--next">
            <span className="label">Next</span>
            <span className="docs__pager-title">
              {next.title}
              <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />
            </span>
          </Link>
        ) : null}
      </nav>
    </main>
  );
}

/** A subtopic. Its id must be listed for the topic in topics.ts. */
export function DocSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="doc-section" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{title}</h2>
      {children}
    </section>
  );
}
