/**
 * PostgreSQL implementation of `IndustryHotBackend`.
 *
 * Only the five tables the synchronous enforcement path reads. The DDL mirrors
 * src/database/migrations/012-industry-standard.sql and 013-roadmap-phase1.sql,
 * with two deliberate differences:
 *   - `datetime('now')` is SQLite-only; PostgreSQL needs `now()::text`.
 *   - No `AUTOINCREMENT` (SQLite); the hot tables are all keyed by text, so
 *     there is no serial column to translate.
 *
 * Columns are TEXT rather than TIMESTAMPTZ on purpose: the SQLite schema stores
 * ISO-8601 strings and IndustryStandardStore compares and returns them as
 * strings. Keeping the same types means the sync getters can serve a Postgres
 * row without any date parsing change.
 */
import type { IndustryHotBackend, IndustryHotSnapshot, HotRow, HotTable } from './industry-hot-state.js';
import { Logger } from '../utils/logger.js';

type QueryFn = <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>;

const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS mcp_certifications (
     id TEXT PRIMARY KEY,
     server_name TEXT NOT NULL,
     package_name TEXT NOT NULL,
     version TEXT NOT NULL,
     level TEXT NOT NULL,
     score INTEGER NOT NULL,
     certified INTEGER NOT NULL DEFAULT 0,
     attestation_jws TEXT,
     checks_json TEXT NOT NULL DEFAULT '[]',
     issued_at TEXT NOT NULL,
     expires_at TEXT NOT NULL,
     tenant_id TEXT NOT NULL DEFAULT 'default',
     created_at TEXT NOT NULL DEFAULT (now()::text)
   )`,
  `CREATE INDEX IF NOT EXISTS idx_mcp_cert_server ON mcp_certifications(server_name, expires_at DESC)`,
  `CREATE TABLE IF NOT EXISTS behavior_fingerprints (
     agent_id TEXT PRIMARY KEY,
     sample_count INTEGER NOT NULL DEFAULT 0,
     avg_inter_call_ms REAL NOT NULL DEFAULT 0,
     avg_arg_bytes REAL NOT NULL DEFAULT 0,
     tool_order_json TEXT NOT NULL DEFAULT '[]',
     arg_shape_hash TEXT NOT NULL DEFAULT '',
     tenant_id TEXT NOT NULL DEFAULT 'default',
     updated_at TEXT NOT NULL DEFAULT (now()::text)
   )`,
  `CREATE TABLE IF NOT EXISTS intent_bindings (
     session_id TEXT PRIMARY KEY,
     agent_id TEXT,
     declared_intent TEXT NOT NULL,
     allowed_tools_json TEXT NOT NULL DEFAULT '[]',
     expires_at TEXT NOT NULL,
     tenant_id TEXT NOT NULL DEFAULT 'default',
     created_at TEXT NOT NULL DEFAULT (now()::text)
   )`,
  `CREATE TABLE IF NOT EXISTS sandbox_tier_state (
     id TEXT PRIMARY KEY,
     scope_type TEXT NOT NULL,
     scope_id TEXT NOT NULL,
     tier TEXT NOT NULL DEFAULT 'shadow',
     rl_state_json TEXT,
     tenant_id TEXT NOT NULL DEFAULT 'default',
     updated_at TEXT NOT NULL DEFAULT (now()::text)
   )`,
  `CREATE INDEX IF NOT EXISTS idx_sandbox_scope ON sandbox_tier_state(scope_type, scope_id)`,
  `CREATE TABLE IF NOT EXISTS mtx_signatures (
     signature_hash TEXT PRIMARY KEY,
     mtx_json TEXT NOT NULL,
     report_count INTEGER NOT NULL DEFAULT 1,
     verified INTEGER NOT NULL DEFAULT 0,
     synced_at TEXT,
     tenant_id TEXT NOT NULL DEFAULT 'default',
     created_at TEXT NOT NULL DEFAULT (now()::text)
   )`,
  `CREATE INDEX IF NOT EXISTS idx_mtx_tenant ON mtx_signatures(tenant_id, report_count DESC)`,
  `CREATE TABLE IF NOT EXISTS agent_reputation (
     agent_id TEXT PRIMARY KEY,
     score REAL NOT NULL DEFAULT 50,
     tier TEXT NOT NULL DEFAULT 'standard',
     trend TEXT NOT NULL DEFAULT 'stable',
     events_json TEXT NOT NULL DEFAULT '[]',
     tenant_id TEXT NOT NULL DEFAULT 'default',
     updated_at TEXT NOT NULL DEFAULT (now()::text)
   )`,
];

const TABLE_FOR_LIST: Record<keyof IndustryHotSnapshot, HotTable> = {
  certifications: 'mcp_certifications',
  behaviorFingerprints: 'behavior_fingerprints',
  intentBindings: 'intent_bindings',
  sandboxTiers: 'sandbox_tier_state',
  agentReputations: 'agent_reputation',
  mtxSignatures: 'mtx_signatures',
};

const CONFLICT_KEYS: Record<HotTable, string[]> = {
  mcp_certifications: ['server_name'],
  behavior_fingerprints: ['agent_id'],
  intent_bindings: ['session_id'],
  sandbox_tier_state: ['scope_type', 'scope_id'],
  agent_reputation: ['agent_id'],
  mtx_signatures: ['signature_hash'],
};

export class PostgresIndustryHotBackend implements IndustryHotBackend {
  readonly dialect = 'postgres' as const;

  constructor(private readonly query: QueryFn) {}

  async ensureSchema(): Promise<void> {
    for (const stmt of DDL) await this.query(stmt);
  }

  async loadAll(tenantId: string): Promise<IndustryHotSnapshot> {
    const [certifications, behaviorFingerprints, intentBindings, sandboxTiers, agentReputations, mtxSignatures] =
      await Promise.all([
        this.query('SELECT * FROM mcp_certifications WHERE tenant_id = $1', [tenantId]),
        this.query('SELECT * FROM behavior_fingerprints WHERE tenant_id = $1', [tenantId]),
        this.query('SELECT * FROM intent_bindings WHERE tenant_id = $1', [tenantId]),
        this.query('SELECT * FROM sandbox_tier_state WHERE tenant_id = $1', [tenantId]),
        this.query('SELECT * FROM agent_reputation WHERE tenant_id = $1', [tenantId]),
        this.query('SELECT * FROM mtx_signatures WHERE tenant_id = $1', [tenantId]),
      ]);
    return {
      certifications,
      behaviorFingerprints,
      intentBindings,
      sandboxTiers,
      agentReputations,
      mtxSignatures,
    };
  }

  async upsert(table: HotTable, row: HotRow): Promise<void> {
    const keys = CONFLICT_KEYS[table];
    const columns = Object.keys(row);
    if (columns.length === 0) return;
    const params: unknown[] = [];
    const placeholders = columns.map((c, i) => {
      params.push(row[c] ?? null);
      return `$${i + 1}`;
    });
    const updates = columns
      .filter((c) => !keys.includes(c))
      .map((c) => `${c} = EXCLUDED.${c}`)
      .join(', ');
    const conflict = keys.join(', ');
    const sql =
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) ` +
      `ON CONFLICT (${conflict}) DO ${updates ? `UPDATE SET ${updates}` : 'NOTHING'}`;
    await this.query(sql, params);
  }
}

/**
 * Build the backend from an initialized `PostgresDatabase`.
 *
 * Kept separate from the store so the pool, migrations, and this DDL all stay
 * in the database layer and the policy layer never sees SQL.
 */
export function createPostgresIndustryHotBackend(db: {
  exec: QueryFn;
}): PostgresIndustryHotBackend {
  if (!db || typeof db.exec !== 'function') {
    throw new Error('createPostgresIndustryHotBackend requires a database with an exec() method');
  }
  Logger.info('[industry-hot-state] PostgreSQL hot-state backend created');
  return new PostgresIndustryHotBackend(db.exec.bind(db));
}