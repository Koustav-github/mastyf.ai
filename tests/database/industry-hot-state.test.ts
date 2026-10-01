import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  IndustryHotState,
  type IndustryHotBackend,
  type IndustryHotSnapshot,
  type HotRow,
  type HotTable,
} from '../../src/database/industry-hot-state.js';
import {
  PostgresIndustryHotBackend,
  createPostgresIndustryHotBackend,
} from '../../src/database/postgres-industry-backend.js';
import { IndustryStandardStore } from '../../src/database/industry-standard-store.js';
import {
  getIndustryHotState,
  __resetIndustryHotState,
} from '../../src/database/industry-hot-state.js';
import type { IDatabase } from '../../src/database/database-interface.js';

function emptySnapshot(): IndustryHotSnapshot {
  return {
    certifications: [],
    behaviorFingerprints: [],
    intentBindings: [],
    sandboxTiers: [],
    agentReputations: [],
    mtxSignatures: [],
  };
}

function snapshot(overrides: Partial<IndustryHotSnapshot> = {}): IndustryHotSnapshot {
  return { ...emptySnapshot(), ...overrides };
}

class FakeBackend implements IndustryHotBackend {
  readonly dialect = 'postgres' as const;
  ensureSchemaCalls = 0;
  loadCalls: string[] = [];
  upserts: Array<{ table: HotTable; row: HotRow }> = [];
  failLoad = false;
  failUpsert = 0;
  loadDelayMs = 0;

  constructor(private data: IndustryHotSnapshot = emptySnapshot()) {}

  async ensureSchema(): Promise<void> {
    this.ensureSchemaCalls++;
  }

  async loadAll(tenantId: string): Promise<IndustryHotSnapshot> {
    this.loadCalls.push(tenantId);
    if (this.loadDelayMs) await new Promise((r) => setTimeout(r, this.loadDelayMs));
    if (this.failLoad) throw new Error('connection refused');
    return this.data;
  }

  async upsert(table: HotTable, row: HotRow): Promise<void> {
    if (this.failUpsert > 0) {
      this.failUpsert--;
      throw new Error('deadlock detected');
    }
    this.upserts.push({ table, row });
  }
}

function cert(serverName: string, certified = true, issuedAt = '2026-01-01T00:00:00Z'): HotRow {
  return {
    id: `cert-${serverName}`,
    server_name: serverName,
    package_name: '@mastyf/tools',
    version: '1.0.0',
    level: 'A',
    score: 95,
    certified: certified ? 1 : 0,
    checks_json: '[]',
    issued_at: issuedAt,
    expires_at: '2027-01-01T00:00:00Z',
    tenant_id: 'default',
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  __resetIndustryHotState();
});

describe('IndustryHotState — hydration', () => {
  it('serves all five enforcement tables from memory after refresh', async () => {
    const backend = new FakeBackend(
      snapshot({
        certifications: [cert('github')],
        behaviorFingerprints: [{ agent_id: 'a1', sample_count: 9 }],
        intentBindings: [{ session_id: 's1', declared_intent: 'read-only' }],
        sandboxTiers: [{ scope_type: 'agent', scope_id: 'a1', tier: 'shadow' }],
        agentReputations: [{ agent_id: 'a1', score: 77, tier: 'trusted' }],
      }),
    );
    const hot = new IndustryHotState();
    hot.attach(backend);

    expect(hot.hydrated).toBe(false);
    expect(await hot.refresh()).toBe(true);
    expect(hot.hydrated).toBe(true);

    expect(hot.getCertification('github')).not.toBeNull();
    expect(hot.getBehaviorFingerprint('a1')).toMatchObject({ sample_count: 9 });
    expect(hot.getIntentBinding('s1')).not.toBeNull();
    expect(hot.getSandboxTier('agent', 'a1')).toMatchObject({ tier: 'shadow' });
    expect(hot.getAgentReputation('a1')).toMatchObject({ score: 77, tier: 'trusted' });
  });

  it('keeps only the newest certification per server, matching getCertification ORDER BY issued_at DESC', async () => {
    const backend = new FakeBackend(
      snapshot({
        certifications: [
          cert('github', true, '2026-01-01T00:00:00Z'),
          cert('github', false, '2026-06-01T00:00:00Z'),
        ],
      }),
    );
    const hot = new IndustryHotState();
    hot.attach(backend);
    await hot.refresh();
    expect(hot.getCertification('github')).toMatchObject({ issued_at: '2026-06-01T00:00:00Z' });
  });

  it('scopes hydration to the requested tenant so tenants cannot read each other', async () => {
    const backend = new FakeBackend(snapshot({ certifications: [cert('github')] }));
    const hot = new IndustryHotState();
    hot.attach(backend);
    await hot.refresh('tenant-b');
    expect(backend.loadCalls).toEqual(['tenant-b']);
  });

  it('propagates the tenant id from MASTYF_AI_TENANT_ID', async () => {
    const backend = new FakeBackend();
    const hot = new IndustryHotState();
    hot.attach(backend);
    vi.stubEnv('MASTYF_AI_TENANT_ID', 'tenant-x');
    const hot2 = new IndustryHotState();
    hot2.attach(backend);
    await hot2.refresh(process.env['MASTYF_AI_TENANT_ID'] ?? 'default');
    expect(backend.loadCalls).toContain('tenant-x');
    vi.unstubAllEnvs();
  });

  it('does not serve anything when no backend is attached', async () => {
    const hot = new IndustryHotState();
    expect(hot.enabled).toBe(false);
    expect(await hot.refresh()).toBe(false);
    expect(hot.getCertification('github')).toBeNull();
    // enqueue must decline so the caller keeps its original synchronous path.
    expect(hot.enqueue('agent_reputation', { agent_id: 'a' })).toBe(false);
  });
});

describe('IndustryHotState — refresh failure keeps the cache populated', () => {
  it('retains the previous snapshot instead of emptying it', async () => {
    const backend = new FakeBackend(snapshot({ certifications: [cert('github')] }));
    const hot = new IndustryHotState();
    hot.attach(backend);
    await hot.refresh();
    expect(hot.getCertification('github')).not.toBeNull();

    backend.failLoad = true;
    expect(await hot.refresh()).toBe(false);

    // The critical assertion: an emptied cache would make every agentic read
    // return null, which the strategies interpret as "not certified" -> the
    // gateway denies all MCP traffic. A stale snapshot is the safe failure.
    expect(hot.getCertification('github')).not.toBeNull();
    expect(hot.lastErrorMessage).toContain('connection refused');
  });

  it('surfaces the refresh error through stats for the capability report', async () => {
    const backend = new FakeBackend();
    const hot = new IndustryHotState();
    hot.attach(backend);
    await hot.refresh();
    backend.failLoad = true;
    await hot.refresh();
    const stats = hot.stats();
    expect(stats.hydrated).toBe(true);
    expect(stats.lastError).toContain('connection refused');
  });
});

describe('IndustryHotState — write-behind', () => {
  it('reflects a write in the snapshot immediately, before it is persisted', async () => {
    const backend = new FakeBackend();
    const hot = new IndustryHotState();
    hot.attach(backend);
    await hot.refresh();

    expect(hot.getAgentReputation('a1')).toBeNull();
    hot.enqueue('agent_reputation', { agent_id: 'a1', score: 91, tier: 'trusted' });

    // Synchronous read-after-write, which is what the strategy needs.
    expect(hot.getAgentReputation('a1')).toMatchObject({ score: 91 });
    // Not yet durable.
    expect(backend.upserts).toHaveLength(0);
    expect(hot.stats().queuedWrites).toBe(1);

    await hot.drain();
    expect(backend.upserts).toHaveLength(1);
    expect(backend.upserts[0]!.table).toBe('agent_reputation');
  });

  it('drains without an explicit call on the debounce timer', async () => {
    const backend = new FakeBackend();
    const hot = new IndustryHotState();
    hot.attach(backend);
    await hot.refresh();
    hot.enqueue('intent_bindings', { session_id: 's1', declared_intent: 'read-only' });
    await vi.waitFor(() => expect(backend.upserts).toHaveLength(1));
  });

  it('drains the whole backlog in order', async () => {
    const backend = new FakeBackend();
    const hot = new IndustryHotState();
    hot.attach(backend);
    await hot.refresh();
    hot.enqueue('agent_reputation', { agent_id: 'a', score: 1 });
    hot.enqueue('agent_reputation', { agent_id: 'a', score: 2 });
    hot.enqueue('sandbox_tier_state', { scope_type: 'agent', scope_id: 'a', tier: 'enforced' });
    await hot.drain();
    expect(backend.upserts.map((u) => u.table)).toEqual([
      'agent_reputation',
      'agent_reputation',
      'sandbox_tier_state',
    ]);
    // Last write wins in the snapshot.
    expect(hot.getAgentReputation('a')).toMatchObject({ score: 2 });
  });

  it('retries a transient persist failure and keeps the write', async () => {
    const backend = new FakeBackend();
    backend.failUpsert = 1;
    const hot = new IndustryHotState();
    hot.attach(backend);
    await hot.refresh();
    hot.enqueue('agent_reputation', { agent_id: 'a', score: 5 });
    await hot.drain();
    expect(backend.upserts).toHaveLength(1);
    expect(hot.stats().droppedWrites).toBe(0);
  });

  it('gives up after the retry budget and counts the dropped write', async () => {
    const backend = new FakeBackend();
    backend.failUpsert = 10;
    const hot = new IndustryHotState();
    hot.attach(backend);
    await hot.refresh();
    hot.enqueue('agent_reputation', { agent_id: 'a', score: 5 });
    await hot.drain();
    expect(hot.stats().droppedWrites).toBe(1);
    expect(backend.upserts).toHaveLength(0);
  });

  it('does not collide on ambiguous composite sandbox keys', async () => {
    const backend = new FakeBackend(
      snapshot({
        sandboxTiers: [
          { scope_type: 'a', scope_id: 'b c', tier: 'first' },
          { scope_type: 'a b', scope_id: 'c', tier: 'second' },
        ],
      }),
    );
    const hot = new IndustryHotState();
    hot.attach(backend);
    await hot.refresh();
    // With a printable separator these two would share a key and one tier would
    // silently shadow the other.
    expect(hot.getSandboxTier('a', 'b c')).toMatchObject({ tier: 'first' });
    expect(hot.getSandboxTier('a b', 'c')).toMatchObject({ tier: 'second' });
  });

  it('records queue saturation instead of failing a decision', async () => {
    vi.stubEnv('MASTYF_AI_INDUSTRY_QUEUE_MAX', '10');
    const backend = new FakeBackend();
    const hot = new IndustryHotState();
    hot.attach(backend);
    await hot.refresh();
    for (let i = 0; i < 25; i++) {
      hot.enqueue('agent_reputation', { agent_id: `a${i}`, score: i });
    }
    const stats = hot.stats();
    expect(stats.queuedWrites).toBe(10);
    expect(stats.droppedWrites).toBe(15);
    vi.unstubAllEnvs();
  });

  it('flushes queued writes on shutdown', async () => {
    const backend = new FakeBackend();
    const hot = new IndustryHotState();
    hot.attach(backend);
    await hot.refresh();
    hot.startRefresh('default');
    hot.enqueue('agent_reputation', { agent_id: 'a', score: 3 });
    await hot.shutdown();
    expect(backend.upserts).toHaveLength(1);
  });

  it('is a no-op to drain when there is nothing queued', async () => {
    const backend = new FakeBackend();
    const hot = new IndustryHotState();
    hot.attach(backend);
    await hot.refresh();
    await expect(hot.drain()).resolves.toBeUndefined();
  });
});

describe('IndustryHotState — detach', () => {
  it('clears the snapshot so a reattached backend cannot serve another tenant', async () => {
    const hot = new IndustryHotState();
    hot.attach(new FakeBackend(snapshot({ certifications: [cert('github')] })));
    await hot.refresh();
    expect(hot.getCertification('github')).not.toBeNull();

    hot.detach();
    expect(hot.enabled).toBe(false);
    expect(hot.hydrated).toBe(false);
    expect(hot.getCertification('github')).toBeNull();
  });
});

describe('IndustryStandardStore read-through integration', () => {
  const db = { prepare: () => undefined } as unknown as IDatabase;

  async function attachSingleton(data: IndustryHotSnapshot): Promise<IndustryHotState> {
    const hot = getIndustryHotState();
    hot.attach(new FakeBackend(data));
    await hot.refresh();
    return hot;
  }

  it('serves certification from the cache instead of the (absent) sqlite path', async () => {
    await attachSingleton(snapshot({ certifications: [cert('github', true)] }));
    const store = new IndustryStandardStore(db);
    const row = store.getCertification('github');
    expect(row).not.toBeNull();
    expect(row!.serverName).toBe('github');
    expect(row!.certified).toBe(true);
    expect(row!.score).toBe(95);
  });

  it('maps a PostgreSQL boolean certified column as well as sqlite 0/1', async () => {
    const hot = await attachSingleton(snapshot({ certifications: [cert('github', true)] }));
    const store = new IndustryStandardStore(db);
    const cached = hot.getCertification('github')!;
    cached.certified = true; // as PostgreSQL would round-trip a BOOLEAN
    hot.enqueue('mcp_certifications', cached);
    expect(store.getCertification('github')!.certified).toBe(true);

    const asZero = hot.getCertification('github')!;
    asZero.certified = 0; // as sqlite stores it
    hot.enqueue('mcp_certifications', asZero);
    expect(store.getCertification('github')!.certified).toBe(false);
  });

  it('reads every other enforcement table through the cache', async () => {
    await attachSingleton(
      snapshot({
        behaviorFingerprints: [{ agent_id: 'a1', sample_count: 9, tool_order_json: '[]' }],
        intentBindings: [{ session_id: 's1', declared_intent: 'x', allowed_tools_json: '["fs"]' }],
        sandboxTiers: [{ scope_type: 'agent', scope_id: 'a1', tier: 'enforced' }],
        agentReputations: [{ agent_id: 'a1', score: 88, tier: 'trusted', trend: 'up' }],
      }),
    );
    const store = new IndustryStandardStore(db);
    expect(store.getBehaviorFingerprint('a1')!.sampleCount).toBe(9);
    expect(store.getIntentBinding('s1')!.allowedTools).toEqual(['fs']);
    expect(store.getSandboxTier('agent', 'a1')).toBe('enforced');
    expect(store.getAgentReputation('a1')).toEqual({ score: 88, tier: 'trusted', trend: 'up' });
  });

  it('routes a certification write to the cache instead of dropping it silently', async () => {
    const backend = new FakeBackend();
    const hot = getIndustryHotState();
    hot.attach(backend);
    await hot.refresh();
    const store = new IndustryStandardStore(db);
    store.saveCertification({
      id: 'c1',
      serverName: 'linear',
      packageName: '@mastyf/linear',
      version: '1.0.0',
      level: 'A',
      score: 90,
      certified: true,
      checksJson: '[]',
      issuedAt: '2026-02-01T00:00:00Z',
      expiresAt: '2027-02-01T00:00:00Z',
      tenantId: 'default',
    });
    // Visible to the next decision straight away...
    expect(store.getCertification('linear')).not.toBeNull();
    // ...and durable once the queue drains.
    expect(backend.upserts).toHaveLength(0);
    await hot.drain();
    expect(backend.upserts[0]).toMatchObject({ table: 'mcp_certifications' });
  });

  it('reports the same sandbox tiers the enforcement path sees', async () => {
    await attachSingleton(
      snapshot({
        sandboxTiers: [
          { scope_type: 'agent', scope_id: 'a1', tier: 'enforced' },
          { scope_type: 'agent', scope_id: 'a2', tier: 'shadow' },
        ],
      }),
    );
    const store = new IndustryStandardStore(db);
    const listed = store.listSandboxTiers().sort((a, b) => a.scopeId.localeCompare(b.scopeId));
    // Previously this returned [] under Postgres: the dashboard would have shown
    // zero tiers while the enforcement path was actively enforcing them.
    expect(listed).toHaveLength(2);
    expect(listed[0]).toMatchObject({ scopeId: 'a1', tier: 'enforced' });
    expect(store.getSandboxTier('agent', 'a1')).toBe('enforced');
  });

  it('lists certifications from the cache, newest first, filtered by tenant', async () => {
    await attachSingleton(
      snapshot({
        certifications: [
          { ...cert('github'), tenant_id: 'default', issued_at: '2026-01-01T00:00:00Z' },
          { ...cert('github'), tenant_id: 'default', issued_at: '2026-05-01T00:00:00Z' },
          { ...cert('linear'), tenant_id: 'other' },
        ],
      }),
    );
    const store = new IndustryStandardStore(db);
    const mine = store.listCertifications('default');
    expect(mine).toHaveLength(1);
    expect(mine[0]!.serverName).toBe('github');
    expect(mine[0]!.issuedAt).toBe('2026-05-01T00:00:00Z');
    expect(store.listCertifications('other')).toHaveLength(1);
  });

  it('reports a certification count consistent with the cached rows', async () => {
    await attachSingleton(
      snapshot({
        certifications: [
          { ...cert('github'), tenant_id: 'default' },
          { ...cert('linear'), tenant_id: 'default' },
        ],
      }),
    );
    const store = new IndustryStandardStore(db);
    const status = store.getStatus('default');
    expect(status.certificationCount).toBe(2);
    // The remaining tables have no async port yet. That must be visible as
    // "unavailable", not reported as a confident zero.
    expect(status.partial).toBe(true);
    expect(status.unavailable).toContain('mtx_signatures');
  });

  // REGRESSION GUARD: listMtxPatternHashes feeds src/policy/threat-intel-guard.ts.
  // Returning [] does not fail closed -- it removes every MTX community
  // signature from the guard's pattern set, so the guard simply stops matching.
  // This is the one unported method that made enforcement WEAKER rather than
  // just less informative.
  it('keeps the threat-intel guard fed under Postgres', async () => {
    await attachSingleton(
      snapshot({
        mtxSignatures: [
          { signature_hash: 'abc123', report_count: 40, tenant_id: 'default' },
          { signature_hash: 'def456', report_count: 5, tenant_id: 'default' },
        ],
      }),
    );
    const store = new IndustryStandardStore(db);
    const hashes = store.listMtxPatternHashes('default');
    expect(hashes).toEqual(['abc123', 'def456']);
    expect(hashes.length).toBeGreaterThan(0);
  });

  it('orders MTX signatures by report_count, most-reported first', async () => {
    await attachSingleton(
      snapshot({
        mtxSignatures: [
          { signature_hash: 'low', report_count: 1, tenant_id: 'default' },
          { signature_hash: 'high', report_count: 99, tenant_id: 'default' },
          { signature_hash: 'mid', report_count: 50, tenant_id: 'default' },
        ],
      }),
    );
    const store = new IndustryStandardStore(db);
    expect(store.listMtxPatternHashes('default')).toEqual(['high', 'mid', 'low']);
  });

  it('does not leak another tenant MTX signatures', async () => {
    await attachSingleton(
      snapshot({
        mtxSignatures: [
          { signature_hash: 'mine', report_count: 5, tenant_id: 'default' },
          { signature_hash: 'theirs', report_count: 500, tenant_id: 'other' },
        ],
      }),
    );
    const store = new IndustryStandardStore(db);
    expect(store.listMtxPatternHashes('default')).toEqual(['mine']);
    expect(store.listMtxPatternHashes('other')).toEqual(['theirs']);
  });

  it('routes an MTX signature write to the cache', async () => {
    const backend = new FakeBackend();
    const hot = getIndustryHotState();
    hot.attach(backend);
    await hot.refresh();
    const store = new IndustryStandardStore(db);
    store.saveMtxSignature('feed', '{"sig":"x"}', true, 'default');
    expect(store.listMtxPatternHashes('default')).toContain('feed');
    await hot.drain();
    expect(backend.upserts[0]).toMatchObject({ table: 'mtx_signatures' });
  });

  it('treats an uncached server as uncertified rather than throwing', async () => {
    await attachSingleton(snapshot());
    const store = new IndustryStandardStore(db);
    expect(store.getCertification('never-seen')).toBeNull();
  });

  it('falls back to the synchronous sqlite path when no cache is attached', () => {
    // Regression guard: attaching the cache must not change default behaviour.
    const fakePrepare = (sql: string) => ({
      get: () => (sql.includes('mcp_certifications') ? cert('github', true) : undefined),
    });
    const sqliteDb = { prepare: fakePrepare } as unknown as IDatabase;
    const store = new IndustryStandardStore(sqliteDb);
    expect(getIndustryHotState().enabled).toBe(false);
    expect(store.getCertification('github')!.serverName).toBe('github');
  });
});

describe('PostgresIndustryHotBackend SQL', () => {
  function collectingBackend() {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const query = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      return [] as T[];
    };
    return { calls, backend: createPostgresIndustryHotBackend({ exec: query }) };
  }

  it('creates the six hot tables with portable PostgreSQL DDL', async () => {
    const { calls, backend } = collectingBackend();
    await backend.ensureSchema();
    const ddl = calls.map((c) => c.sql).join('\n');
    for (const table of [
      'mcp_certifications',
      'behavior_fingerprints',
      'intent_bindings',
      'sandbox_tier_state',
      'agent_reputation',
      'mtx_signatures',
    ]) {
      expect(ddl).toContain(table);
    }
    // These are SQLite-only and would throw at runtime on Postgres.
    expect(ddl).not.toContain("datetime('now')");
    expect(ddl).not.toMatch(/AUTOINCREMENT/i);
    expect(ddl).toContain('now()::text');
  });

  it('reads all six tables scoped to a tenant', async () => {
    const { calls, backend } = collectingBackend();
    await backend.loadAll('tenant-9');
    expect(calls).toHaveLength(6);
    for (const call of calls) {
      expect(call.sql).toContain('$1');
      expect(call.params).toEqual(['tenant-9']);
      expect(call.sql.toLowerCase()).toContain('tenant_id = $1');
    }
  });

  it('upserts with ON CONFLICT so writes are idempotent', async () => {
    const { calls, backend } = collectingBackend();
    await backend.upsert('agent_reputation', {
      agent_id: 'a1',
      score: 80,
      tenant_id: 'default',
    });
    const sql = calls[0]!.sql;
    expect(sql).toContain('INSERT INTO agent_reputation');
    expect(sql).toContain('ON CONFLICT (agent_id) DO UPDATE SET');
    expect(calls[0]!.params).toEqual(['a1', 80, 'default']);
  });

  it('never updates the conflict key itself', async () => {
    const { calls, backend } = collectingBackend();
    await backend.upsert('sandbox_tier_state', {
      scope_type: 'agent',
      scope_id: 'a1',
      tier: 'enforced',
    });
    expect(calls[0]!.sql).toBe(
      'INSERT INTO sandbox_tier_state (scope_type, scope_id, tier) VALUES ($1, $2, $3) ' +
        'ON CONFLICT (scope_type, scope_id) DO UPDATE SET tier = EXCLUDED.tier',
    );
  });

  it('does nothing for an empty row', async () => {
    const { calls, backend } = collectingBackend();
    await backend.upsert('agent_reputation', {});
    expect(calls).toHaveLength(0);
  });

  it('rejects construction without an exec seam', () => {
    expect(() => createPostgresIndustryHotBackend({} as never)).toThrow(/exec/);
  });

  it('exposes the postgres dialect', () => {
    const { backend } = collectingBackend();
    expect(backend.dialect).toBe('postgres');
  });
});

describe('PostgresIndustryHotBackend class surface', () => {
  it('can be constructed directly with a query function', async () => {
    const backend = new PostgresIndustryHotBackend(async () => []);
    await expect(backend.ensureSchema()).resolves.toBeUndefined();
  });
});