/**
 * Tests for the Agent Gateway enforcement contract.
 *
 * The property under test is honesty: the report must never claim a capability
 * is live when it is not, and must never emit a state without a stated reason.
 * A capability that silently degrades is the failure mode this module exists to
 * make visible, so the tests assert on absence as much as on presence.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setAgenticContainer } from '../../src/utils/agentic-container.js';
import {
  getIndustryHotState,
  __resetIndustryHotState,
} from '../../src/database/industry-hot-state.js';
import {
  buildCapabilityReport,
  buildProtocolCoverage,
  findMissingRequired,
  formatCapabilityReport,
  buildCapabilityArtifact,
  diffCapabilityArtifact,
  AUTHORIZED_MCP_METHODS,
} from '../../src/agent-gateway/capabilities.js';

const ENV_KEYS = [
  'MASTYF_AI_AGENTIC_ENABLED',
  'MASTYF_AI_STRICT_MODE',
  'REDIS_URL',
  'REDIS_SENTINELS',
  'REDIS_CLUSTER_NODES',
  'OPA_URL',
  'DB_TYPE',
  'MASTYF_AI_DB_PATH',
  'MASTYF_AI_AGENTIC_STATE_DURABLE',
  'K_CONFIGURATION',
] as const;

let saved: Record<string, string | undefined> = {};

function clearEnv(): void {
  for (const key of ENV_KEYS) delete process.env[key];
}

/** Minimal stand-in: `isAgenticEnabled` only checks for a non-null container. */
function fakeContainer(): never {
  return {} as never;
}

function byId(report: { capabilities: { id: string }[] }, id: string) {
  const found = report.capabilities.find((c) => c.id === id);
  expect(found, `capability '${id}' missing from report`).toBeDefined();
  return found as unknown as {
    id: string;
    state: string;
    enforcement: string;
    detail: string;
  };
}

beforeEach(() => {
  saved = {};
  for (const key of ENV_KEYS) saved[key] = process.env[key];
  clearEnv();
  setAgenticContainer(null);
  // The Postgres capability state now depends on the hot-state singleton, so
  // each test needs a clean one or state leaks between them.
  __resetIndustryHotState();
});

afterEach(() => {
  clearEnv();
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key] as string;
  }
  setAgenticContainer(null);
});

describe('protocol coverage', () => {
  it('authorizes tools/call only', () => {
    expect([...AUTHORIZED_MCP_METHODS]).toEqual(['tools/call']);
  });

  it('lists non-tools/call MCP methods as unauthorized, not denied', () => {
    const coverage = buildProtocolCoverage();
    // The distinction matters: `denied` means this service parsed and refused
    // it. `unauthorized` means no verdict is produced here at all.
    expect(coverage.unauthorized).toContain('prompts/get');
    expect(coverage.unauthorized).toContain('resources/read');
    expect(coverage.unauthorized).toContain('completion/complete');
    expect(coverage.denied).not.toContain('prompts/get');
    expect(coverage.denied).not.toContain('resources/read');
  });

  it('separates parse-level denials from the unsupported method set', () => {
    const coverage = buildProtocolCoverage();
    expect(coverage.denied).toContain('unauthorised-method');
    expect(coverage.denied).toContain('unrecognised-payload');
  });

  it('states that non-MCP traffic is not authorized', () => {
    expect(buildProtocolCoverage().nonMcpTraffic).toMatch(/Not authorized/i);
  });
});

describe('agentic strategies (phase 1 item 4)', () => {
  const AGENTIC_IDS = [
    'mcp-certification',
    'behavioral-biometrics',
    'zero-trust',
    'agentic-pre-guard-hooks',
  ] as const;

  it('reports the agentic strategies as unavailable when no container exists', () => {
    const report = buildCapabilityReport({ requestTokensMode: 'zeroed' });
    for (const id of AGENTIC_IDS) {
      expect(byId(report, id).state, `${id} should be unavailable without a container`).toBe('unavailable');
    }
  });

  it('names the actual no-op in the reason rather than a generic label', () => {
    const report = buildCapabilityReport({ requestTokensMode: 'zeroed' });
    // A vague detail is indistinguishable from a guess, which is the whole
    // failure mode being prevented.
    expect(byId(report, 'mcp-certification').detail).toMatch(/return null and are silently skipped/i);
  });

  it('reports them live once a container is wired with a durable backend', () => {
    process.env['DB_TYPE'] = 'sqlite';
    process.env['MASTYF_AI_DB_PATH'] = '/var/mastyf/history.db';
    setAgenticContainer(fakeContainer());
    const report = buildCapabilityReport({ requestTokensMode: 'zeroed' });
    for (const id of AGENTIC_IDS) {
      expect(byId(report, id).state).toBe('live');
    }
    expect(byId(report, 'mcp-certification').detail).toMatch(/durable state/i);
  });

  // A wired container is not sufficient evidence. IndustryStandardStore writes
  // through the better-sqlite3 prepare() API; PostgresDatabase has no prepare(),
  // so every read and write is silently discarded with no error. Reporting
  // `live` here would tell an operator their certification control is enforced
  // while it stores nothing.
  it('does not claim live when the backend cannot persist agentic state', () => {
    process.env['DB_TYPE'] = 'postgres';
    setAgenticContainer(fakeContainer());
    const report = buildCapabilityReport({ requestTokensMode: 'zeroed' });
    for (const id of AGENTIC_IDS) {
      expect(byId(report, id).state, `${id} must not claim live on Postgres`).toBe('degraded');
    }
    const cert = byId(report, 'mcp-certification');
    expect(cert.detail).toMatch(/prepare\(\)/);
    expect(cert.detail).toMatch(/returns null/i);
    expect(cert.detail).not.toMatch(/reading real state/i);
  });

  // Option A: once the industry hot-state cache has hydrated from PostgreSQL,
  // the enforcement path really is durable, so `live` is the truthful answer
  // and the startup gate must let the process through.
  it('claims live on Postgres once the hot-state cache has hydrated', async () => {
    process.env['DB_TYPE'] = 'postgres';
    setAgenticContainer(fakeContainer());
    const hot = getIndustryHotState();
    hot.attach({
      dialect: 'postgres',
      ensureSchema: async () => {},
      loadAll: async () => ({
        certifications: [{ server_name: 'github' }],
        behaviorFingerprints: [{ agent_id: 'a1' }],
        intentBindings: [],
        sandboxTiers: [],
        agentReputations: [],
      }),
      upsert: async () => {},
    });
    await hot.refresh();

    const report = buildCapabilityReport({ requestTokensMode: 'zeroed' });
    for (const id of AGENTIC_IDS) {
      expect(byId(report, id).state, `${id} should be live on hydrated Postgres`).toBe('live');
    }
    expect(byId(report, 'mcp-certification').detail).toMatch(/hot-state cache/i);
    expect(byId(report, 'mcp-certification').detail).toMatch(/certification=1/);
    expect(findMissingRequired(report)).toEqual([]);
  });

  it('does not claim live on Postgres before the hot-state cache hydrates', () => {
    process.env['DB_TYPE'] = 'postgres';
    setAgenticContainer(fakeContainer());
    const hot = getIndustryHotState();
    hot.attach({
      dialect: 'postgres',
      ensureSchema: async () => {},
      loadAll: async () => {
        throw new Error('not loaded yet');
      },
      upsert: async () => {},
    });

    const report = buildCapabilityReport({ requestTokensMode: 'zeroed' });
    expect(byId(report, 'mcp-certification').state).toBe('degraded');
    expect(byId(report, 'mcp-certification').detail).toMatch(/not yet hydrated/i);
    // The gate must still refuse: an unhydrated cache denies all MCP traffic.
    expect(findMissingRequired(report).length).toBeGreaterThan(0);
  });

  it('does not claim live when the hot-state cache is serving a stale snapshot', async () => {
    process.env['DB_TYPE'] = 'postgres';
    setAgenticContainer(fakeContainer());
    const hot = getIndustryHotState();
    let calls = 0;
    hot.attach({
      dialect: 'postgres',
      ensureSchema: async () => {},
      loadAll: async () => {
        if (++calls > 1) throw new Error('connection reset');
        return {
          certifications: [],
          behaviorFingerprints: [],
          intentBindings: [],
          sandboxTiers: [],
          agentReputations: [],
        };
      },
      upsert: async () => {},
    });
    await hot.refresh();
    expect(byId(buildCapabilityReport({ requestTokensMode: 'zeroed' }), 'mcp-certification').state).toBe(
      'live',
    );

    await hot.refresh();
    const cert = byId(buildCapabilityReport({ requestTokensMode: 'zeroed' }), 'mcp-certification');
    expect(cert.state).toBe('degraded');
    expect(cert.detail).toMatch(/stale snapshot/i);
  });

  it('does not claim live for SQLite on an ephemeral filesystem', () => {
    process.env['DB_TYPE'] = 'sqlite';
    process.env['K_CONFIGURATION'] = 'mastyf-agent-gateway-authz';
    process.env['MASTYF_AI_DB_PATH'] = '/tmp/history.db';
    setAgenticContainer(fakeContainer());
    const report = buildCapabilityReport({ requestTokensMode: 'zeroed' });
    expect(byId(report, 'mcp-certification').state).toBe('degraded');
    expect(byId(report, 'mcp-certification').detail).toMatch(/cold start/i);
  });

  it('honours an explicit durability assertion for a persistent volume', () => {
    process.env['DB_TYPE'] = 'sqlite';
    process.env['K_CONFIGURATION'] = 'mastyf-agent-gateway-authz';
    process.env['MASTYF_AI_DB_PATH'] = '/mnt/pvc/history.db';
    process.env['MASTYF_AI_AGENTIC_STATE_DURABLE'] = 'true';
    setAgenticContainer(fakeContainer());
    const report = buildCapabilityReport({ requestTokensMode: 'zeroed' });
    expect(byId(report, 'mcp-certification').state).toBe('live');
  });

  it('reports agentic state as unavailable on an in-memory database', () => {
    process.env['MASTYF_AI_DB_PATH'] = ':memory:';
    setAgenticContainer(fakeContainer());
    const report = buildCapabilityReport({ requestTokensMode: 'zeroed' });
    expect(byId(report, 'mcp-certification').state).toBe('degraded');
  });

  it('distinguishes an operator opt-out from a broken container', () => {
    process.env['MASTYF_AI_AGENTIC_ENABLED'] = 'false';
    setAgenticContainer(fakeContainer());
    const report = buildCapabilityReport({ requestTokensMode: 'zeroed' });
    const cert = byId(report, 'mcp-certification');
    expect(cert.state).toBe('unavailable');
    expect(cert.detail).toMatch(/explicit operator choice/i);
    expect(cert.detail).not.toMatch(/No agentic container/i);
  });
});

describe('startup guard', () => {
  it('rejects startup when a required strategy is not live', () => {
    const report = buildCapabilityReport({ requestTokensMode: 'zeroed' });
    const missing = findMissingRequired(report);
    expect(missing.length).toBeGreaterThan(0);
    expect(missing.map((m) => m.id)).toEqual(
      expect.arrayContaining(['mcp-certification', 'behavioral-biometrics', 'zero-trust']),
    );
    expect(missing[0]?.detail).not.toBe('');
  });

  it('passes once the container is present', () => {
    setAgenticContainer(fakeContainer());
    const report = buildCapabilityReport({ requestTokensMode: 'zeroed' });
    expect(findMissingRequired(report)).toEqual([]);
  });

  it('treats a missing capability entry as a rejection, not a pass', () => {
    expect(findMissingRequired({ capabilities: [] })).toEqual([
      { id: 'mcp-certification', detail: expect.stringMatching(/not present/i) },
      { id: 'behavioral-biometrics', detail: expect.stringMatching(/not present/i) },
      { id: 'zero-trust', detail: expect.stringMatching(/not present/i) },
    ]);
  });
});

describe('shared state (phase 2 groundwork)', () => {
  it('reports the stateful strategies as degraded without Redis', () => {
    const report = buildCapabilityReport({ requestTokensMode: 'zeroed' });
    for (const id of ['session-flow', 'timing-guard', 'idempotency']) {
      const cap = byId(report, id);
      expect(cap.state).toBe('degraded');
      expect(cap.detail).toMatch(/per-process LRU/i);
    }
  });

  it('reports them live with Redis configured', () => {
    process.env['REDIS_URL'] = 'redis://cache:6379';
    const report = buildCapabilityReport({ requestTokensMode: 'zeroed' });
    for (const id of ['session-flow', 'timing-guard', 'idempotency']) {
      const cap = byId(report, id);
      expect(cap.state).toBe('live');
      expect(cap.detail).toMatch(/global across replicas/i);
    }
  });
});

describe('external dependencies fail-closed posture (phase 1 item 6)', () => {
  it('flags OPA as degraded when it would fail open', () => {
    process.env['OPA_URL'] = 'http://opa.internal/v1/data/mastyf_ai';
    const report = buildCapabilityReport({ requestTokensMode: 'zeroed' });
    const opa = byId(report, 'opa');
    expect(opa.state).toBe('degraded');
    expect(opa.detail).toMatch(/fails OPEN and authorizes/i);
  });

  it('reports OPA live only under strict mode', () => {
    process.env['OPA_URL'] = 'http://opa.internal/v1/data/mastyf_ai';
    process.env['MASTYF_AI_STRICT_MODE'] = 'true';
    const report = buildCapabilityReport({ requestTokensMode: 'zeroed' });
    expect(byId(report, 'opa').state).toBe('live');
  });

  it('marks the Redis rate limiter degraded when a fault falls back per-process', () => {
    process.env['REDIS_URL'] = 'redis://cache:6379';
    const report = buildCapabilityReport({ requestTokensMode: 'zeroed' });
    expect(byId(report, 'redis-rate-limit').state).toBe('degraded');
  });
});

describe('request token accounting (phase 1 item 5)', () => {
  it('reports the zeroed mode as unavailable, naming what it disables', () => {
    const report = buildCapabilityReport({ requestTokensMode: 'zeroed' });
    const cap = byId(report, 'request-tokens');
    expect(cap.state).toBe('unavailable');
    expect(cap.detail).toMatch(/maxTokens/);
    expect(cap.detail).toMatch(/without any signal/i);
  });

  it('reports the estimated mode as degraded and never as billing', () => {
    const report = buildCapabilityReport({ requestTokensMode: 'estimated' });
    const cap = byId(report, 'request-tokens');
    expect(cap.state).toBe('degraded');
    expect(cap.detail).toMatch(/not tokenized/i);
    expect(cap.detail).toMatch(/never used for cost accounting/i);
  });
});

describe('honesty invariants', () => {
  it('gives every capability a non-empty reason', () => {
    setAgenticContainer(fakeContainer());
    const report = buildCapabilityReport({ requestTokensMode: 'estimated' });
    for (const cap of report.capabilities) {
      expect(cap.detail, `${cap.id} has no reason`).not.toBe('');
      expect(cap.detail.trim().length).toBeGreaterThan(10);
    }
  });

  it('uses only the three declared enforcement points', () => {
    const report = buildCapabilityReport({ requestTokensMode: 'zeroed' });
    const points = new Set(report.capabilities.map((c) => c.enforcement));
    for (const point of points) {
      expect(['gateway', 'upstream', 'desktop-only']).toContain(point);
    }
  });

  it('assigns agent identity upstream rather than claiming it here', () => {
    const report = buildCapabilityReport({ requestTokensMode: 'zeroed' });
    const identity = byId(report, 'agent-identity');
    expect(identity.enforcement).toBe('upstream');
    expect(identity.detail).toMatch(/IAP/);
  });

  it('marks the desktop-only surfaces as impossible here, not merely off', () => {
    const report = buildCapabilityReport({ requestTokensMode: 'zeroed' });
    for (const id of [
      'local-approval-ui',
      'stdio-sse-websocket-transports',
      'mtls-client-identity',
    ]) {
      const cap = byId(report, id);
      expect(cap.enforcement).toBe('desktop-only');
      expect(cap.state).toBe('unavailable');
    }
  });

  it('renders a report that names the authorized and unauthorized sets', () => {
    const text = formatCapabilityReport(buildCapabilityReport({ requestTokensMode: 'zeroed' }));
    expect(text).toContain('tools/call');
    expect(text).toContain('prompts/get');
    expect(text).toMatch(/capabilities, \d+ live/);
  });
});

describe('machine-readable artifact and drift detection', () => {
  const AGENTIC_IDS = ['mcp-certification', 'behavioral-biometrics', 'zero-trust'] as const;

  function durable() {
    process.env['DB_TYPE'] = 'sqlite';
    process.env['MASTYF_AI_DB_PATH'] = '/var/mastyf/history.db';
  }

  it('is deterministic across builds so it can be committed and diffed', () => {
    durable();
    const a = buildCapabilityArtifact(buildCapabilityReport({ requestTokensMode: 'zeroed' }));
    const b = buildCapabilityArtifact(buildCapabilityReport({ requestTokensMode: 'zeroed' }));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    // Sorted by id: a stable order is what makes the diff readable.
    const ids = a.capabilities.map((c) => c.id);
    expect(ids).toEqual([...ids].sort());
  });

  it('reports no drift against its own baseline', () => {
    durable();
    setAgenticContainer(fakeContainer());
    const report = buildCapabilityReport({ requestTokensMode: 'zeroed' });
    expect(diffCapabilityArtifact(buildCapabilityArtifact(report), report)).toEqual([]);
  });

  it('detects a capability losing live, which is the drift that matters', () => {
    durable();
    setAgenticContainer(fakeContainer());
    const baseline = buildCapabilityArtifact(buildCapabilityReport({ requestTokensMode: 'zeroed' }));
    expect(baseline.capabilities.find((c) => c.id === 'mcp-certification')?.state).toBe('live');

    // Same build, Postgres configured: certification silently stops persisting.
    process.env['DB_TYPE'] = 'postgres';
    const after = buildCapabilityReport({ requestTokensMode: 'zeroed' });
    const drift = diffCapabilityArtifact(baseline, after);
    expect(drift.some((d) => d.startsWith('mcp-certification: live -> degraded'))).toBe(true);
    expect(drift.some((d) => d.includes('returns null'))).toBe(true);
  });

  it('does not fail on detail rewordings', () => {
    durable();
    setAgenticContainer(fakeContainer());
    const report = buildCapabilityReport({ requestTokensMode: 'zeroed' });
    const baseline = buildCapabilityArtifact(report);
    const reworded = {
      ...report,
      capabilities: report.capabilities.map((c) =>
        c.id === 'mcp-certification' ? { ...c, detail: 'completely different wording' } : c,
      ),
    };
    expect(diffCapabilityArtifact(baseline, reworded)).toEqual([]);
  });

  it('flags added and removed capabilities', () => {
    durable();
    const report = buildCapabilityReport({ requestTokensMode: 'zeroed' });
    const baseline = buildCapabilityArtifact(report);

    // Baseline has `opa`, the live report no longer does.
    const withoutOpa = { ...report, capabilities: report.capabilities.filter((c) => c.id !== 'opa') };
    expect(diffCapabilityArtifact(baseline, withoutOpa)).toContain('opa: removed from the report');

    // A baseline that predates a newly added capability is drift too.
    const trimmed = buildCapabilityArtifact(withoutOpa);
    expect(diffCapabilityArtifact(trimmed, report)).toEqual(['opa: added (degraded)']);
  });

  it('flags a schema version change so a stale baseline is not trusted silently', () => {
    durable();
    const report = buildCapabilityReport({ requestTokensMode: 'zeroed' });
    const stale = { ...buildCapabilityArtifact(report), schemaVersion: 0 };
    const drift = diffCapabilityArtifact(stale, report);
    expect(drift.some((d) => d.includes('schemaVersion'))).toBe(true);
  });

  it('drift detection is what makes the startup gate bite', () => {
    durable();
    setAgenticContainer(fakeContainer());
    const baseline = buildCapabilityArtifact(buildCapabilityReport({ requestTokensMode: 'zeroed' }));
    process.env['DB_TYPE'] = 'postgres';
    const report = buildCapabilityReport({ requestTokensMode: 'zeroed' });
    // Non-live already blocks via findMissingRequired; the baseline additionally
    // blocks a silent live -> degraded flip for capabilities nobody marked required.
    expect(diffCapabilityArtifact(baseline, report).length).toBeGreaterThan(0);
    for (const id of AGENTIC_IDS) expect(byId(report, id).state).not.toBe('live');
  });
});
