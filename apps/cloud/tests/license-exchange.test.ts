import { beforeEach, describe, expect, it, vi } from 'vitest';

const { resolveOrgFromApiKey, returning, where, findOrg } = vi.hoisted(() => ({
  resolveOrgFromApiKey: vi.fn(),
  returning: vi.fn(),
  where: vi.fn(),
  findOrg: vi.fn(),
}));

vi.mock('@/lib/org-context', () => ({ resolveOrgFromApiKey }));
vi.mock('@/lib/db', () => ({
  getDb: () => ({
    update: () => ({ set: () => ({ where: (cond: unknown) => (where(cond), { returning }) }) }),
    query: { organizations: { findFirst: findOrg } },
  }),
}));

import { POST } from '@/app/api/v1/license/exchange/route';

const ORG = { id: 'org-1', slug: 'acme-x7k2', name: 'Acme' };

const redeem = (token: unknown, apiKey?: string) =>
  POST(
    new Request('http://localhost:3001/api/v1/license/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
      body: JSON.stringify({ token }),
    }),
  );

beforeEach(() => {
  vi.resetAllMocks();
  process.env.AUTH_SECRET = 'test-secret';
  resolveOrgFromApiKey.mockResolvedValue({ org: ORG, apiKeyId: 'key-1', scopes: [] });
  returning.mockResolvedValue([{ id: 'x-1', orgId: ORG.id }]);
  findOrg.mockResolvedValue(ORG);
});

describe('POST /api/v1/license/exchange', () => {
  it('needs the workspace API key; a token alone is not enough', async () => {
    const res = await redeem('one-time-token');
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/API key/);
    expect(returning).not.toHaveBeenCalled();
  });

  it('rejects an unknown API key without touching the token', async () => {
    resolveOrgFromApiKey.mockResolvedValue(null);
    expect((await redeem('one-time-token', 'gcp_bad')).status).toBe(401);
    expect(returning).not.toHaveBeenCalled();
  });

  it('is 400 without a token', async () => {
    expect((await redeem('', 'gcp_good')).status).toBe(400);
  });

  it('refuses a token that is used, expired, or from another workspace', async () => {
    returning.mockResolvedValue([]);
    expect((await redeem('one-time-token', 'gcp_good')).status).toBe(401);
  });

  it("returns the session claims, with no signed token and no secret, for the key's own workspace", async () => {
    const before = Math.floor(Date.now() / 1000);
    const res = await redeem('one-time-token', 'gcp_good');

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('no-store');
    const body = await res.json();
    expect(body.session).toMatchObject({ tenantSlug: 'acme-x7k2', identity: 'cloud:acme-x7k2', roles: ['tenant-admin'] });
    expect(body.session.exp).toBeGreaterThanOrEqual(before + 86400);
    expect(body).not.toHaveProperty('sessionToken');
    expect(JSON.stringify(body)).not.toContain('test-secret');
    expect(resolveOrgFromApiKey).toHaveBeenCalledWith('gcp_good');
  });
});
