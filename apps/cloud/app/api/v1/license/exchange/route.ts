import { and, eq, gt, isNull } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { licenseExchangeTokens, organizations } from '@/lib/db/schema';
import { cloudSsoFeatures, hashExchangeToken } from '@/lib/license';
import { extractBearerToken } from '@/lib/api-keys';
import { resolveOrgFromApiKey } from '@/lib/org-context';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** How long the self-hosted dashboard session lasts. */
const SESSION_TTL_SECONDS = 86400;

const NO_STORE = { 'Cache-Control': 'private, no-store' };

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: NO_STORE });
}

/**
 * POST /api/v1/license/exchange { token } — a self-hosted Mastyf dashboard redeems the
 * one-time token from "Launch dashboard" for who is signing in.
 *
 * The proxy authenticates with its workspace API key (MASTYF_AI_CLOUD_API_KEY) and the token
 * must belong to that workspace. The claims come back over this HTTPS response, so the proxy
 * needs no shared secret: it used to verify an HMAC-signed session with the cloud's
 * AUTH_SECRET / LICENSE_JWT_SECRET, which meant handing every customer the key that signs
 * every user's session and every license.
 */
export async function POST(request: Request) {
  const apiKey = extractBearerToken(request.headers.get('authorization'));
  if (!apiKey) {
    return fail(
      "Send this workspace's API key as a Bearer token (MASTYF_AI_CLOUD_API_KEY). Shared cloud secrets are no longer used.",
      401,
    );
  }

  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  const token = typeof body?.token === 'string' ? body.token.trim() : '';
  if (!token) return fail('token required', 400);

  const caller = await resolveOrgFromApiKey(apiKey);
  if (!caller) return fail('Invalid API key', 401);

  // Single use: claim the token in the same statement that checks it, so two redemptions
  // racing each other can't both succeed. Only the caller's own workspace's tokens match.
  const [row] = await getDb()
    .update(licenseExchangeTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(licenseExchangeTokens.tokenHash, hashExchangeToken(token)),
        eq(licenseExchangeTokens.orgId, caller.org.id),
        isNull(licenseExchangeTokens.usedAt),
        gt(licenseExchangeTokens.expiresAt, new Date()),
      ),
    )
    .returning();
  if (!row) return fail('Invalid or expired token', 401);

  const org = await getDb().query.organizations.findFirst({ where: eq(organizations.id, row.orgId) });
  if (!org) return fail('Organization not found', 404);

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? '').replace(/\/$/, '');

  return NextResponse.json(
    {
      session: {
        tenantSlug: org.slug,
        identity: `cloud:${org.slug}`,
        roles: ['tenant-admin'],
        exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
      },
      tenantSlug: org.slug,
      features: cloudSsoFeatures(),
      cloudBillingUrl: appUrl ? `${appUrl}/dashboard` : '',
      licensed: true,
    },
    { headers: NO_STORE },
  );
}
