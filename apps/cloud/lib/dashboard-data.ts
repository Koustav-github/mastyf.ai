import { and, count, eq, isNull } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { getDb } from './db';
import { apiKeys } from './db/schema';
import { getUserOrg, type UserOrgContext } from './org-context';
import { safeAuth } from './safe-auth';
import { instanceHealth, rowsOf, toNumber, type InstanceHealth } from './dashboard-shared';

export { instanceHealth, type InstanceHealth };

/**
 * Data for the dashboard, read from the tenant's Postgres tables. Every number shown in
 * the dashboard comes from here; nothing is hard-coded.
 */

/** Session + organization for a dashboard page; redirects when either is missing. */
export async function requireDashboard() {
  const session = await safeAuth();
  if (!session?.user?.id) redirect('/login');
  const ctx = await getUserOrg(session.user.id);
  // The layout provisions a first organization; /post-login comes back once it exists.
  if (!ctx) redirect('/post-login');
  return { session, ctx: ctx as UserOrgContext };
}

// ------------------------------------------------------------------ fleet instances

export type FleetInstance = {
  instanceId: string;
  name: string;
  hostname: string | null;
  region: string | null;
  version: string | null;
  lastHeartbeat: string | null;
  health: InstanceHealth;
};

type InstanceRow = {
  instance_id: string;
  instance_name: string | null;
  hostname: string | null;
  region: string | null;
  version: string | null;
  last_heartbeat: string | Date | null;
};

export async function listInstances(orgId: string, limit = 200): Promise<FleetInstance[]> {
  const rows = rowsOf<InstanceRow>(
    await getDb().execute(sql`
      SELECT instance_id, instance_name, hostname, region, version, last_heartbeat
      FROM mastyf_ai_fleet_instances
      WHERE org_id = ${orgId}
      ORDER BY last_heartbeat DESC
      LIMIT ${limit}
    `),
  );
  const now = Date.now();
  return rows.map((r) => ({
    instanceId: r.instance_id,
    name: r.instance_name || r.instance_id,
    hostname: r.hostname,
    region: r.region,
    version: r.version,
    lastHeartbeat: r.last_heartbeat ? new Date(r.last_heartbeat).toISOString() : null,
    health: instanceHealth(r.last_heartbeat, now),
  }));
}

// ------------------------------------------------------------------ traffic (audit pushes)

export type TrafficTotals = {
  total: number;
  blocked: number;
  allowed: number;
  flagged: number;
  periods: number;
};

/** Sums the audit aggregates proxies push; `sinceHours` limits it to recent periods. */
export async function trafficTotals(orgId: string, sinceHours?: number): Promise<TrafficTotals> {
  const window = sinceHours ? sql`AND period_end >= NOW() - (${sinceHours} * INTERVAL '1 hour')` : sql``;
  const [row] = rowsOf<Record<string, unknown>>(
    await getDb().execute(sql`
      SELECT coalesce(sum(total_requests), 0)   AS total,
             coalesce(sum(blocked_requests), 0) AS blocked,
             coalesce(sum(allowed_requests), 0) AS allowed,
             coalesce(sum(flagged_requests), 0) AS flagged,
             count(*)                           AS periods
      FROM fleet_audit_aggregates
      WHERE org_id = ${orgId} ${window}
    `),
  );
  return {
    total: toNumber(row?.total),
    blocked: toNumber(row?.blocked),
    allowed: toNumber(row?.allowed),
    flagged: toNumber(row?.flagged),
    periods: toNumber(row?.periods),
  };
}

// ------------------------------------------------------------------ policy, license, keys

export type PolicyVersion = { version: number; publishedAt: string | null };

export async function policyHistory(orgId: string, limit = 5): Promise<PolicyVersion[]> {
  const rows = rowsOf<{ version: unknown; published_at: string | Date | null }>(
    await getDb().execute(sql`
      SELECT version, published_at FROM policy_versions
      WHERE org_id = ${orgId} ORDER BY version DESC LIMIT ${limit}
    `),
  );
  return rows.map((r) => ({
    version: toNumber(r.version),
    publishedAt: r.published_at ? new Date(r.published_at).toISOString() : null,
  }));
}

export type LicenseTier = 'free' | 'pro' | 'team' | 'enterprise';

export type ActiveLicense = {
  tier: LicenseTier;
  maxInstances: number;
  maxTeams: number;
  maxUsers: number;
  activatedAt: string | null;
  expiresAt: string | null;
};

const FREE_LICENSE: ActiveLicense = {
  tier: 'free',
  maxInstances: 1,
  maxTeams: 0,
  maxUsers: 1,
  activatedAt: null,
  expiresAt: null,
};

/** The organization's license row; organizations without one are on the free tier (the table's defaults). */
export async function activeLicense(orgId: string): Promise<ActiveLicense> {
  const [row] = rowsOf<Record<string, unknown>>(
    await getDb().execute(sql`
      SELECT tier, max_instances, max_teams, max_users, activated_at, expires_at
      FROM licenses WHERE org_id = ${orgId} AND revoked_at IS NULL
      ORDER BY activated_at DESC LIMIT 1
    `),
  );
  if (!row) return FREE_LICENSE;
  const tier = String(row.tier ?? 'free').toLowerCase();
  return {
    tier: (['free', 'pro', 'team', 'enterprise'].includes(tier) ? tier : 'free') as LicenseTier,
    maxInstances: toNumber(row.max_instances),
    maxTeams: toNumber(row.max_teams),
    maxUsers: toNumber(row.max_users),
    activatedAt: row.activated_at ? new Date(row.activated_at as string).toISOString() : null,
    expiresAt: row.expires_at ? new Date(row.expires_at as string).toISOString() : null,
  };
}

export async function activeApiKeyCount(orgId: string): Promise<number> {
  const [row] = await getDb()
    .select({ n: count() })
    .from(apiKeys)
    .where(and(eq(apiKeys.orgId, orgId), isNull(apiKeys.revokedAt)));
  return toNumber(row?.n);
}

// ------------------------------------------------------------------ teams

export type TeamRow = { id: string; name: string; description: string | null; memberCount: number };

export async function listTeams(orgId: string): Promise<TeamRow[]> {
  const rows = rowsOf<Record<string, unknown>>(
    await getDb().execute(sql`
      SELECT t.id, t.name, t.description, count(tm.user_id) AS member_count
      FROM teams t
      LEFT JOIN team_members tm ON t.org_id = tm.org_id AND t.id = tm.team_id
      WHERE t.org_id = ${orgId}
      GROUP BY t.org_id, t.id
      ORDER BY t.name
    `),
  );
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name ?? ''),
    description: (r.description as string | null) ?? null,
    memberCount: toNumber(r.member_count),
  }));
}

// ------------------------------------------------------------------ public intelligence

export type ThreatFeedEntry = {
  signatureHash: string;
  toolPattern: string;
  category: string;
  blockReason: string | null;
  reportCount: number;
  lastSeen: string | null;
};

export async function threatFeed(limit = 200): Promise<{
  entries: ThreatFeedEntry[];
  categories: Array<{ category: string; count: number }>;
}> {
  const db = getDb();
  const [entryRows, categoryRows] = await Promise.all([
    db.execute(sql`SELECT * FROM public_threat_feed_entries ORDER BY last_seen DESC LIMIT ${limit}`),
    db.execute(sql`
      SELECT category, count(*) AS count FROM public_threat_feed_entries
      GROUP BY category ORDER BY count DESC
    `),
  ]);
  return {
    entries: rowsOf<Record<string, unknown>>(entryRows).map((e) => ({
      signatureHash: String(e.signature_hash),
      toolPattern: String(e.tool_pattern ?? ''),
      category: String(e.category ?? 'uncategorised'),
      blockReason: (e.block_reason as string | null) ?? null,
      reportCount: toNumber(e.report_count),
      lastSeen: e.last_seen ? new Date(e.last_seen as string).toISOString() : null,
    })),
    categories: rowsOf<Record<string, unknown>>(categoryRows).map((c) => ({
      category: String(c.category ?? 'uncategorised'),
      count: toNumber(c.count),
    })),
  };
}

export type TrustScore = {
  packageName: string;
  score: number;
  grade: string;
  cveCount: number;
  criticalCveCount: number;
  reportCount: number;
};

export async function trustScores(limit = 100): Promise<TrustScore[]> {
  const rows = rowsOf<Record<string, unknown>>(
    await getDb().execute(sql`SELECT * FROM public_trust_scores ORDER BY trust_score DESC LIMIT ${limit}`),
  );
  return rows.map((s) => ({
    packageName: String(s.package_name),
    score: toNumber(s.trust_score),
    grade: String(s.trust_grade ?? '?'),
    cveCount: toNumber(s.cve_count),
    criticalCveCount: toNumber(s.critical_cve_count),
    reportCount: toNumber(s.report_count),
  }));
}

// ------------------------------------------------------------------ overview

export type OverviewMetrics = {
  instances: { online: number; total: number; lastHeartbeat: string | null; recent: FleetInstance[] };
  traffic24h: TrafficTotals;
  traffic7d: TrafficTotals;
  policy: { version: number | null; updatedAt: string | null };
  license: ActiveLicense;
  apiKeys: number;
};

export async function overviewMetrics(ctx: UserOrgContext): Promise<OverviewMetrics> {
  const orgId = ctx.org.id;
  const [instances, traffic24h, traffic7d, license, keys] = await Promise.all([
    listInstances(orgId),
    trafficTotals(orgId, 24),
    trafficTotals(orgId, 24 * 7),
    activeLicense(orgId),
    activeApiKeyCount(orgId),
  ]);
  return {
    instances: {
      online: instances.filter((i) => i.health === 'online').length,
      total: instances.length,
      lastHeartbeat: instances[0]?.lastHeartbeat ?? null,
      recent: instances.slice(0, 5),
    },
    traffic24h,
    traffic7d,
    policy: {
      version: ctx.policy?.version ?? null,
      updatedAt: ctx.policy?.updatedAt ? new Date(ctx.policy.updatedAt).toISOString() : null,
    },
    license,
    apiKeys: keys,
  };
}
