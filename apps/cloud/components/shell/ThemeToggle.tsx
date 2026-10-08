'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';

/** localStorage key; read before first paint by the theme script in app/layout.tsx. */
export const THEME_KEY = 'mastyf-theme';

const readTheme = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { ready: Promise<void> };
};

/**
 * Switches between the dark and the warm-white light theme. The icon is chosen by CSS
 * from `html[data-theme]`, so it is right on first paint. Without a saved choice the
 * site follows the system setting.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(readTheme());
    const system = window.matchMedia('(prefers-color-scheme: light)');
    const onSystemChange = () => {
      try {
        if (localStorage.getItem(THEME_KEY)) return;
      } catch {}
      applyTheme(system.matches ? 'light' : 'dark');
    };
    system.addEventListener('change', onSystemChange);
    // Keep every toggle on the page in step.
    const observer = new MutationObserver(() => setTheme(readTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      system.removeEventListener('change', onSystemChange);
      observer.disconnect();
    };
  }, []);

  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    const next: Theme = readTheme() === 'light' ? 'dark' : 'light';
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}

    const doc = document as ViewTransitionDocument;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!doc.startViewTransition || reduced) {
      applyTheme(next);
      return;
    }
    // The new theme spreads out from the button.
    const box = event.currentTarget.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const transition = doc.startViewTransition(() => applyTheme(next));
    transition.ready
      .then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 560, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
        );
      })
      .catch(() => {});
  };

  return (
    <button
      type="button"
      className={`icon-btn theme-toggle ${className}`.trim()}
      aria-label="Light theme"
      aria-pressed={theme === null ? undefined : theme === 'light'}
      title={theme === 'light' ? 'Switch to dark' : 'Switch to light'}
      onClick={toggle}
    >
      <Sun className="theme-toggle__sun" size={16} strokeWidth={1.75} aria-hidden="true" />
      <Moon className="theme-toggle__moon" size={16} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}
