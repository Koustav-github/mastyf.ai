/**
 * Read-through cache + write-behind queue for the enforcement-path subset of
 * IndustryStandardStore.
 *
 * Why this exists: the three agentic policy strategies (certification,
 * behavioral-biometrics, zero-trust) read agentic state from a *synchronous*
 * `PolicyStrategy.evaluate()` on the authorization hot path. A synchronous
 * authorization decision cannot await a network database, so pointing the
 * store at PostgreSQL naively does not work -- and today it does far worse
 * than "no data": every read returns null, which the strategies interpret as
 * "not certified" / "no fingerprint", so they block all traffic.
 *
 * The design:
 *   - `hydrate()` loads the enforcement-relevant rows into memory (async, once
 *     at startup and then on an interval).
 *   - Sync getters read that in-memory snapshot, so the strategy signatures and
 *     the hot path stay synchronous and untouched.
 *   - Sync writes update the snapshot immediately and enqueue an async persist
 *     that is drained on a timer and on shutdown.
 *
 * Tradeoff, stated plainly: this is a cache, so a revocation is only visible
 * after the next refresh (MASTYF_AI_INDUSTRY_REFRESH_MS, default 30s). That
 * window is the price of keeping the decision path synchronous.
 *
 * Scope is deliberately narrow -- only the tables the enforcement path actually
 * reads. The remaining IndustryStandardStore tables are control-plane/dashboard
 * data and stay on their existing synchronous SQLite path.
 */
import { Logger } from '../utils/logger.js';

export type HotTable =
  | 'mcp_certifications'
  | 'behavior_fingerprints'
  | 'intent_bindings'
  | 'sandbox_tier_state'
  | 'agent_reputation'
  | 'mtx_signatures';

export type HotRow = Record<string, unknown>;

/**
 * Separator for composite cache keys.
 *
 * Explicitly NUL: a printable separator like '|' or ' ' can appear inside an
 * agent id or scope id, which would make ('a', 'b c') collide with ('a b', 'c')
 * and silently return the wrong sandbox tier. NUL cannot occur in these values.
 */
const KEY_SEP = '\u0000';

/** Primary key columns per table, used to key rows in memory and to upsert. */
export const HOT_TABLE_KEYS: Record<HotTable, string[]> = {
  mcp_certifications: ['server_name'],
  behavior_fingerprints: ['agent_id'],
  intent_bindings: ['session_id'],
  sandbox_tier_state: ['scope_type', 'scope_id'],
  agent_reputation: ['agent_id'],
  mtx_signatures: ['signature_hash'],
};

/**
 * Maps each hot table to its collection in `IndustryHotSnapshot`. Single source
 * of truth so adding a table cannot leave one of the two lists behind.
 */
const SNAPSHOT_KEYS: Array<[HotTable, keyof IndustryHotSnapshot]> = [
  ['mcp_certifications', 'certifications'],
  ['behavior_fingerprints', 'behaviorFingerprints'],
  ['intent_bindings', 'intentBindings'],
  ['sandbox_tier_state', 'sandboxTiers'],
  ['agent_reputation', 'agentReputations'],
  ['mtx_signatures', 'mtxSignatures'],
];

export interface IndustryHotSnapshot {
  certifications: HotRow[];
  behaviorFingerprints: HotRow[];
  intentBindings: HotRow[];
  sandboxTiers: HotRow[];
  agentReputations: HotRow[];
  mtxSignatures: HotRow[];
}

/**
 * Async persistence for the hot tables. Implemented once per dialect; the cache
 * itself has no SQL.
 */
export interface IndustryHotBackend {
  readonly dialect: 'sqlite' | 'postgres';
  /** Create tables if absent. Must be idempotent. */
  ensureSchema(): Promise<void>;
  loadAll(tenantId: string): Promise<IndustryHotSnapshot>;
  upsert(table: HotTable, row: HotRow): Promise<void>;
}

interface PendingWrite {
  table: HotTable;
  row: HotRow;
  attempts: number;
}

export interface IndustryHotStats {
  hydrated: boolean;
  dialect: string | null;
  lastRefreshMs: number | null;
  lastError: string | null;
  queuedWrites: number;
  persistedWrites: number;
  droppedWrites: number;
  rowCounts: Record<string, number>;
}

const DEFAULT_MAX_QUEUE = 5000;
const DEFAULT_DRAIN_DEBOUNCE_MS = 250;

/** Batching window before queued writes are pushed to the durable store. */
function drainDebounceMs(): number {
  const parsed = Number.parseInt(process.env['MASTYF_AI_INDUSTRY_DEBOUNCE_MS'] ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_DRAIN_DEBOUNCE_MS;
}

function maxQueue(): number {
  const parsed = Number.parseInt(process.env['MASTYF_AI_INDUSTRY_QUEUE_MAX'] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_QUEUE;
}
const MAX_ATTEMPTS = 3;

function keyOf(table: HotTable, row: HotRow): string {
  return HOT_TABLE_KEYS[table].map((k) => String(row[k] ?? '')).join(KEY_SEP);
}

function tenantOf(row: HotRow): string {
  return String(row['tenant_id'] ?? 'default');
}

export class IndustryHotState {
  private backend: IndustryHotBackend | null = null;
  private snapshot: IndustryHotSnapshot | null = null;
  private maps = new Map<HotTable, Map<string, HotRow>>();
  private queue: PendingWrite[] = [];
  private draining = false;
  private timer: NodeJS.Timeout | null = null;
  private drainTimer: NodeJS.Timeout | null = null;
  private lastRefreshMs: number | null = null;
  private lastError: string | null = null;
  private persistedWrites = 0;
  private droppedWrites = 0;

  get enabled(): boolean {
    return this.backend !== null;
  }

  get hydrated(): boolean {
    return this.snapshot !== null;
  }

  get lastErrorMessage(): string | null {
    return this.lastError;
  }

  stats(): IndustryHotStats {
    const rowCounts: Record<string, number> = {};
    for (const [table, map] of this.maps) rowCounts[table] = map.size;
    return {
      hydrated: this.hydrated,
      dialect: this.backend?.dialect ?? null,
      lastRefreshMs: this.lastRefreshMs,
      lastError: this.lastError,
      queuedWrites: this.queue.length,
      persistedWrites: this.persistedWrites,
      droppedWrites: this.droppedWrites,
      rowCounts,
    };
  }

  /** Create the hot tables if absent. No-op when no backend is attached. */
  async ensureSchema(): Promise<void> {
    await this.backend?.ensureSchema();
  }

  /** Bind a backend. Not yet hydrated -- reads fall through until `refresh()`. */
  attach(backend: IndustryHotBackend): void {
    this.backend = backend;
    this.maps = new Map(
      (Object.keys(HOT_TABLE_KEYS) as HotTable[]).map((t) => [t, new Map<string, HotRow>()]),
    );
  }

  detach(): void {
    if (this.drainTimer) {
      clearTimeout(this.drainTimer);
      this.drainTimer = null;
    }
    this.backend = null;
    this.snapshot = null;
    this.maps.clear();
    this.queue = [];
    this.stopRefresh();
  }

  /**
   * Load the snapshot. On failure the previous snapshot is retained rather than
   * cleared: dropping to empty would make every agentic read return null and
   * turn the strategies into a blanket deny.
   */
  async refresh(tenantId = 'default'): Promise<boolean> {
    if (!this.backend) return false;
    try {
      const snap = await this.backend.loadAll(tenantId);
      this.maps = new Map(
        (Object.keys(HOT_TABLE_KEYS) as HotTable[]).map((t) => [t, new Map<string, HotRow>()]),
      );
      // Defensive: one missing/renamed collection must not throw away every
      // other table, which would turn into a deny-everything state.
      for (const [table, key] of SNAPSHOT_KEYS) {
        for (const row of snap[key] ?? []) this.index(table, row);
      }
      this.snapshot = snap;
      this.lastRefreshMs = Date.now();
      this.lastError = null;
      return true;
    } catch (err: unknown) {
      this.lastError = err instanceof Error ? err.message : String(err);
      Logger.error(
        `[industry-hot-state] refresh failed, retaining the previous snapshot (${this.lastError}). ` +
          'Serving a stale snapshot is still correct here; an empty one would read as "not certified" and deny all traffic.',
      );
      return false;
    }
  }

  /** `mcp_certifications` keeps only the newest row per server, as `getCertification` does. */
  private index(table: HotTable, row: HotRow): void {
    const map = this.maps.get(table);
    if (!map) return;
    const key = keyOf(table, row);
    const existing = map.get(key);
    if (table === 'mcp_certifications' && existing) {
      const prev = String(existing['issued_at'] ?? '');
      const next = String(row['issued_at'] ?? '');
      if (next < prev) return;
    }
    map.set(key, row);
  }

  // ── synchronous reads (hot path) ────────────────────────────────────────

  getCertification(serverName: string): HotRow | null {
    return this.maps.get('mcp_certifications')?.get(serverName) ?? null;
  }

  getBehaviorFingerprint(agentId: string): HotRow | null {
    return this.maps.get('behavior_fingerprints')?.get(agentId) ?? null;
  }

  getIntentBinding(sessionId: string): HotRow | null {
    return this.maps.get('intent_bindings')?.get(sessionId) ?? null;
  }

  getSandboxTier(scopeType: string, scopeId: string): HotRow | null {
    return this.maps.get('sandbox_tier_state')?.get(`${scopeType}${KEY_SEP}${scopeId}`) ?? null;
  }

  getAgentReputation(agentId: string): HotRow | null {
    return this.maps.get('agent_reputation')?.get(agentId) ?? null;
  }

  /**
   * Every cached row for a table, for the control-plane readers (status,
   * listings). Returns a copy so callers cannot mutate the cache.
   */
  rows(table: HotTable): HotRow[] {
    const rows = Array.from(this.maps.get(table)?.values() ?? []);
    if (table === 'mtx_signatures') {
      // Sorted here rather than at hydrate time so a signature written since
      // the last refresh is visible immediately instead of 30s later.
      // threat-intel-guard caches its pattern set for 60s, so this sort runs
      // at most once a minute.
      return rows.sort((a, b) => Number(b['report_count'] ?? 0) - Number(a['report_count'] ?? 0));
    }
    return rows;
  }

  // ── write-behind ────────────────────────────────────────────────────────

  /**
   * Update the snapshot immediately and queue the durable write. Returns false
   * when no backend is attached, in which case the caller keeps using its
   * existing synchronous path.
   */
  enqueue(table: HotTable, row: HotRow): boolean {
    if (!this.backend) return false;
    // Reflect the write now so the next decision sees it, even though the
    // durable write has not landed yet.
    this.index(table, row);
    this.queue.push({ table, row, attempts: 0 });
    this.scheduleDrain();
    const limit = maxQueue();
    if (this.queue.length > limit) {
      const dropped = this.queue.length - limit;
      this.queue.splice(0, dropped);
      this.droppedWrites += dropped;
      Logger.error(
        `[industry-hot-state] write-behind queue exceeded ${limit}; dropped ${dropped} writes. ` +
          'Agentic state in PostgreSQL is now behind memory. Raise MASTYF_AI_INDUSTRY_QUEUE_MAX or investigate the backend.',
      );
    }
    return true;
  }

  /**
   * Batch writes to a durable store quickly rather than waiting for the refresh
   * tick. Without this, a crash can lose every write made since the last
   * refresh -- which for a certification or reputation change is exactly the
   * window an attacker would aim for.
   *
   * MASTYF_AI_INDUSTRY_DEBOUNCE_MS trades write amplification against the
   * crash window. Shutdown flushes synchronously regardless.
   */
  private scheduleDrain(): void {
    if (this.drainTimer) return;
    this.drainTimer = setTimeout(() => {
      this.drainTimer = null;
      void this.drain();
    }, drainDebounceMs());
    this.drainTimer.unref?.();
  }

  async drain(): Promise<void> {
    if (!this.backend || this.draining || this.queue.length === 0) return;
    this.draining = true;
    try {
      while (this.queue.length > 0) {
        const item = this.queue.shift();
        if (!item) break;
        try {
          await this.backend.upsert(item.table, item.row);
          this.persistedWrites++;
        } catch (err: unknown) {
          item.attempts++;
          if (item.attempts < MAX_ATTEMPTS) {
            this.queue.push(item);
            Logger.warn(
              `[industry-hot-state] persist failed for ${item.table} (attempt ${item.attempts}): ${
                err instanceof Error ? err.message : String(err)
              }`,
            );
          } else {
            this.droppedWrites++;
            Logger.error(
              `[industry-hot-state] dropping ${item.table} write after ${MAX_ATTEMPTS} attempts: ${
                err instanceof Error ? err.message : String(err)
              }`,
            );
          }
        }
      }
    } finally {
      this.draining = false;
    }
  }

  startRefresh(tenantId = 'default'): void {
    if (this.timer || !this.backend) return;
    const raw = process.env['MASTYF_AI_INDUSTRY_REFRESH_MS'];
    const parsed = raw ? Number.parseInt(raw, 10) : 30_000;
    const intervalMs = Number.isFinite(parsed) && parsed > 0 ? parsed : 30_000;
    this.timer = setInterval(() => {
      void this.refresh(tenantId).then(() => this.drain());
    }, intervalMs);
    // Do not hold the event loop open for a cache refresh.
    this.timer.unref?.();
  }

  stopRefresh(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Best-effort drain for shutdown. */
  async shutdown(): Promise<void> {
    this.stopRefresh();
    if (this.drainTimer) {
      clearTimeout(this.drainTimer);
      this.drainTimer = null;
    }
    await this.drain();
  }
}

let _instance: IndustryHotState | null = null;

export function getIndustryHotState(): IndustryHotState {
  if (!_instance) _instance = new IndustryHotState();
  return _instance;
}

/** Test seam. */
export function __resetIndustryHotState(): void {
  _instance?.detach();
  _instance = null;
}

export { tenantOf };