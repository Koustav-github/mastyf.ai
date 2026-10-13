/** Small, locale-stable formatters for dashboard numbers and times. */

const counter = new Intl.NumberFormat('en-US');

export function formatCount(n: number): string {
  return counter.format(Math.round(n));
}

/** "1 report", "214 reports". */
export function countOf(n: number, noun: string, pluralNoun = `${noun}s`): string {
  return `${formatCount(n)} ${Math.round(n) === 1 ? noun : pluralNoun}`;
}

/** "12%" (or "<1%" for small non-zero shares); null when there is nothing to divide. */
export function formatShare(part: number, whole: number): string | null {
  if (!whole) return null;
  const pct = (part / whole) * 100;
  if (pct > 0 && pct < 1) return '<1%';
  return `${Math.round(pct)}%`;
}

/** "just now", "5 min ago", "3 h ago", "2 days ago"; null for a missing time. */
export function timeAgo(iso: string | null | undefined, now = Date.now()): string | null {
  if (!iso) return null;
  const at = new Date(iso).getTime();
  if (!Number.isFinite(at)) return null;
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  return Number.isNaN(at.getTime())
    ? null
    : at.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  return Number.isNaN(at.getTime())
    ? null
    : at.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
