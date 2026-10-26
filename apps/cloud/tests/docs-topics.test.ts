import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { DOC_TOPICS, LEGACY_DOC_ANCHORS } from '@/components/docs/topics';

const pageSource = (slug: string) => readFileSync(join(__dirname, '..', 'app', 'docs', slug, 'page.tsx'), 'utf8');

describe('docs topics', () => {
  it('has a page for every topic', () => {
    for (const topic of DOC_TOPICS) {
      expect(existsSync(join(__dirname, '..', 'app', 'docs', topic.slug, 'page.tsx')), topic.slug).toBe(true);
    }
  });

  it('renders every listed section on its page, so the sidebar and cards never link to nothing', () => {
    for (const topic of DOC_TOPICS) {
      const source = pageSource(topic.slug);
      expect(source, topic.slug).toContain(`slug="${topic.slug}"`);
      for (const section of topic.sections) {
        expect(source, `${topic.slug}#${section.id}`).toContain(`<DocSection id="${section.id}"`);
      }
    }
  });

  it('uses unique slugs and section ids', () => {
    expect(new Set(DOC_TOPICS.map((t) => t.slug)).size).toBe(DOC_TOPICS.length);
    for (const topic of DOC_TOPICS) {
      expect(new Set(topic.sections.map((s) => s.id)).size, topic.slug).toBe(topic.sections.length);
    }
  });

  it('sends every old /docs#anchor to an existing page and section', () => {
    const known = new Set(
      DOC_TOPICS.flatMap((t) => [`/docs/${t.slug}`, ...t.sections.map((s) => `/docs/${t.slug}#${s.id}`)]),
    );
    for (const [anchor, target] of Object.entries(LEGACY_DOC_ANCHORS)) {
      expect(known.has(target), `#${anchor} → ${target}`).toBe(true);
    }
  });
});
