import { createHmac, randomBytes } from 'crypto';
import { allLicensedFeatures } from './entitlements';

/**
 * Who signs in to a self-hosted dashboard through "Launch dashboard", as returned by
 * POST /api/v1/license/exchange. Not signed: it reaches the proxy over its own
 * authenticated HTTPS call, so no secret is shared with self-hosted proxies.
 */
export type CloudSessionPayload = {
  tenantSlug: string;
  identity: string;
  roles: string[];
  exp: number;
};

export function generateExchangeToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashExchangeToken(token: string): string {
  const secret = process.env.AUTH_SECRET ?? 'dev';
  return createHmac('sha256', secret).update(token).digest('hex');
}

export function cloudSsoFeatures(): string[] {
  return allLicensedFeatures();
}
