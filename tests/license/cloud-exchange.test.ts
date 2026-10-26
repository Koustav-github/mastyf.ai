import { afterEach, describe, expect, it, vi } from 'vitest';
import { cloudSessionFromClaims } from '../../src/license/cloud-session.js';
import { cloudApiKey, LicenseClient } from '../../src/license/license-client.js';

const now = () => Math.floor(Date.now() / 1000);
const claims = (over: Record<string, unknown> = {}) => ({
  tenantSlug: 'acme',
  identity: 'cloud:acme',
  roles: ['tenant-admin'],
  exp: now() + 3600,
  ...over,
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('cloud session claims (no shared secret)', () => {
  it('accepts well-formed, unexpired claims', () => {
    expect(cloudSessionFromClaims(claims(), undefined)).toMatchObject({ tenantSlug: 'acme', identity: 'cloud:acme' });
  });

  it('rejects expired or malformed claims', () => {
    expect(cloudSessionFromClaims(claims({ exp: now() - 1 }), undefined)).toBeNull();
    expect(cloudSessionFromClaims(claims({ tenantSlug: '' }), undefined)).toBeNull();
    expect(cloudSessionFromClaims(claims({ identity: 42 }), undefined)).toBeNull();
    expect(cloudSessionFromClaims('nope', undefined)).toBeNull();
  });

  it('rejects claims for another workspace when this host is pinned to one', () => {
    expect(cloudSessionFromClaims(claims(), 'other-co')).toBeNull();
    expect(cloudSessionFromClaims(claims(), 'acme')).not.toBeNull();
  });

  it('drops non-string roles', () => {
    expect(cloudSessionFromClaims(claims({ roles: ['viewer', 7] }), undefined)?.roles).toEqual(['viewer']);
  });
});

describe('workspace API key for the control plane', () => {
  it('prefers MASTYF_AI_CLOUD_API_KEY, then a gcp_ license key, else none', () => {
    expect(cloudApiKey({ MASTYF_AI_CLOUD_API_KEY: ' gcp_a ', MASTYF_AI_LICENSE_KEY: 'gcp_b' })).toBe('gcp_a');
    expect(cloudApiKey({ MASTYF_AI_LICENSE_KEY: 'gcp_b' })).toBe('gcp_b');
    expect(cloudApiKey({ MASTYF_AI_LICENSE_KEY: 'MG-NOT-A-CLOUD-KEY' })).toBeNull();
    expect(cloudApiKey({})).toBeNull();
  });
});

describe('LicenseClient.exchangeCloudToken', () => {
  const client = (fetchFn: typeof fetch) =>
    new LicenseClient({
      controlPlaneUrl: 'https://www.mastyf.ai',
      requireLicense: false,
      refreshSeconds: 300,
      graceSeconds: 900,
      fetchFn,
    });

  it('authenticates with the workspace API key and returns the claims', async () => {
    vi.stubEnv('MASTYF_AI_CLOUD_API_KEY', 'gcp_workspace_key');
    const fetchFn = vi.fn(async () => Response.json({ session: claims(), tenantSlug: 'acme', features: [], cloudBillingUrl: '' }));

    const result = await client(fetchFn as unknown as typeof fetch).exchangeCloudToken('one-time');

    expect(result?.session?.tenantSlug).toBe('acme');
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://www.mastyf.ai/api/v1/license/exchange');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer gcp_workspace_key');
    expect(JSON.parse(String(init.body))).toEqual({ token: 'one-time' });
  });

  it('does not call the control plane without an API key', async () => {
    vi.stubEnv('MASTYF_AI_CLOUD_API_KEY', '');
    vi.stubEnv('MASTYF_AI_LICENSE_KEY', '');
    const fetchFn = vi.fn();
    expect(await client(fetchFn as unknown as typeof fetch).exchangeCloudToken('one-time')).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('returns null when the control plane refuses', async () => {
    vi.stubEnv('MASTYF_AI_CLOUD_API_KEY', 'gcp_workspace_key');
    const fetchFn = vi.fn(async () => Response.json({ error: 'Invalid or expired token' }, { status: 401 }));
    expect(await client(fetchFn as unknown as typeof fetch).exchangeCloudToken('one-time')).toBeNull();
  });
});
