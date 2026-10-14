/** Pure helpers behind the dashboard data (no database or auth imports, so they are unit-testable). */

export type InstanceHealth = 'online' | 'delayed' | 'offline';

/** Proxies heartbeat every 60s by default (MASTYF_AI_HEARTBEAT_INTERVAL_MS). */
export const ONLINE_WITHIN_MS = 5 * 60_000;
export const DELAYED_WITHIN_MS = 60 * 60_000;

/** Health from the last heartbeat, not the stored status text (which is never cleared). */
export function instanceHealth(lastHeartbeat: string | Date | null | undefined, now = Date.now()): InstanceHealth {
  if (!lastHeartbeat) return 'offline';
  const at = new Date(lastHeartbeat).getTime();
  if (!Number.isFinite(at)) return 'offline';
  const age = now - at;
  if (age <= ONLINE_WITHIN_MS) return 'online';
  if (age <= DELAYED_WITHIN_MS) return 'delayed';
  return 'offline';
}

/**
 * `db.execute` with the postgres-js driver returns the rows themselves (an array), not a
 * `{ rows }` object as node-postgres does. Accept both so a driver change cannot silently
 * empty the dashboard.
 */
export function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: unknown } | null)?.rows;
  return Array.isArray(rows) ? (rows as T[]) : [];
}

/** Postgres returns sums and counts as strings (bigint/numeric); coerce safely. */
export function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}
