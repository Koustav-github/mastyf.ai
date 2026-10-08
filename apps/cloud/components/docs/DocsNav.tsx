'use client';

import { useEffect, useState } from 'react';

export type DocsSectionLink = { id: string; label: string };

/** Section index with scroll tracking: highlights the section currently in view. */
export function DocsNav({ sections }: { sections: DocsSectionLink[] }) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    const targets = sections
      .map((section) => document.getElementById(section.id))
      .filter((el): el is HTMLElement => Boolean(el));
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-18% 0px -72% 0px' }
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);

  return (
    <nav className="docs__nav" aria-label="Documentation sections">
      <p className="label docs__nav-title">On this page</p>
      <ul>
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className={active === section.id ? 'is-active' : undefined}
              aria-current={active === section.id ? 'location' : undefined}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
