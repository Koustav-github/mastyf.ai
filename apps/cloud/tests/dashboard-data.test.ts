import { describe, expect, it } from 'vitest';
import { PLAN_FOR_TIER } from '@/components/dashboard/plans';
import { PRICING_TIERS } from '@/components/landing/stats';
import { instanceHealth, rowsOf, toNumber } from '@/lib/dashboard-shared';
import { countOf, formatCount, formatShare, timeAgo } from '@/lib/format';

const NOW = Date.parse('2026-10-13T12:00:00Z');
const minutesAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();

describe('instance health comes from the last heartbeat', () => {
  it('is online within 5 minutes of a heartbeat', () => {
    expect(instanceHealth(minutesAgo(0), NOW)).toBe('online');
    expect(instanceHealth(minutesAgo(4), NOW)).toBe('online');
  });

  it('is delayed after 5 minutes and up to an hour', () => {
    expect(instanceHealth(minutesAgo(6), NOW)).toBe('delayed');
    expect(instanceHealth(minutesAgo(59), NOW)).toBe('delayed');
  });

  it('is offline after an hour, or with no usable heartbeat', () => {
    expect(instanceHealth(minutesAgo(61), NOW)).toBe('offline');
    expect(instanceHealth(null, NOW)).toBe('offline');
    expect(instanceHealth('not a date', NOW)).toBe('offline');
  });
});

describe('query results', () => {
  it('reads postgres-js results, which are arrays without .rows', () => {
    const rows = [{ a: 1 }, { a: 2 }];
    expect(rowsOf(rows)).toEqual(rows);
  });

  it('also reads node-postgres results ({ rows })', () => {
    expect(rowsOf({ rows: [{ a: 1 }] })).toEqual([{ a: 1 }]);
  });

  it('treats anything else as no rows', () => {
    expect(rowsOf(null)).toEqual([]);
    expect(rowsOf({})).toEqual([]);
  });

  it('coerces Postgres numeric strings', () => {
    expect(toNumber('12481')).toBe(12481);
    expect(toNumber(null)).toBe(0);
    expect(toNumber('nope')).toBe(0);
  });
});

describe('formatting', () => {
  it('formats counts with separators', () => {
    expect(formatCount(12481)).toBe('12,481');
  });

  it('pluralises counted nouns', () => {
    expect(countOf(1, 'CVE')).toBe('1 CVE');
    expect(countOf(0, 'CVE')).toBe('0 CVEs');
    expect(countOf(1214, 'report')).toBe('1,214 reports');
  });

  it('formats shares, including tiny non-zero ones', () => {
    expect(formatShare(0, 0)).toBeNull();
    expect(formatShare(25, 100)).toBe('25%');
    expect(formatShare(1, 500)).toBe('<1%');
    expect(formatShare(0, 500)).toBe('0%');
  });

  it('describes how long ago something happened', () => {
    expect(timeAgo(minutesAgo(0), NOW)).toBe('just now');
    expect(timeAgo(minutesAgo(5), NOW)).toBe('5 min ago');
    expect(timeAgo(minutesAgo(180), NOW)).toBe('3 h ago');
    expect(timeAgo(minutesAgo(60 * 24 * 2), NOW)).toBe('2 days ago');
    expect(timeAgo(null, NOW)).toBeNull();
  });
});

describe('license tiers', () => {
  it('each maps to a plan that exists on the pricing page', () => {
    const pricingIds = PRICING_TIERS.map((t) => t.id as string);
    for (const [tier, plan] of Object.entries(PLAN_FOR_TIER)) {
      expect(pricingIds, tier).toContain(plan.pricingId);
    }
  });
});
