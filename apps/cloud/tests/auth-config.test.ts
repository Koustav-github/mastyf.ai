import { describe, expect, it, vi } from 'vitest';
import { isAuthConfigured, resolveAuthSecret } from '@/lib/auth-secret';
import {
  configuredOAuthProviders,
  DEMO_AUTH_PROVIDER_ID,
  DEV_AUTH_PROVIDER_ID,
  oauthEmailVerified,
  oauthProviderStatus,
  pickVerifiedGitHubEmail,
} from '@/lib/oauth-providers';

type AnyProvider = { id?: string; type?: string; options?: { id?: string } };

/** Auth.js keeps a custom provider id in `options` until it merges them at startup. */
function registered(env: Record<string, string | undefined>) {
  return (configuredOAuthProviders(env) as AnyProvider[]).map((p) => ({
    id: p.options?.id ?? p.id,
    type: p.type,
  }));
}

const REAL_OAUTH = {
  AUTH_GOOGLE_ID: 'google-client',
  AUTH_GOOGLE_SECRET: 'google-secret',
  AUTH_GITHUB_ID: 'github-client',
  AUTH_GITHUB_SECRET: 'github-secret',
};

describe('auth secret', () => {
  it('uses AUTH_SECRET when it is set', () => {
    expect(resolveAuthSecret({ NODE_ENV: 'production', AUTH_SECRET: '  s3cret  ' })).toBe('s3cret');
  });

  it('has no fallback in production: sign-in is unavailable', () => {
    expect(resolveAuthSecret({ NODE_ENV: 'production' })).toBeUndefined();
    expect(resolveAuthSecret({ NODE_ENV: 'production', AUTH_SECRET: '   ' })).toBeUndefined();
    expect(isAuthConfigured({ NODE_ENV: 'production' })).toBe(false);
  });

  it('has no fallback in tests either', () => {
    expect(resolveAuthSecret({ NODE_ENV: 'test' })).toBeUndefined();
  });

  it('falls back to a development-only secret in local development', () => {
    const secret = resolveAuthSecret({ NODE_ENV: 'development' });
    expect(secret).toMatch(/development-only/);
    expect(isAuthConfigured({ NODE_ENV: 'development' })).toBe(true);
  });
});

describe('sign-in providers', () => {
  it('production without OAuth apps registers no GitHub/Google stand-ins, only the demo', () => {
    expect(registered({ NODE_ENV: 'production' })).toEqual([{ id: DEMO_AUTH_PROVIDER_ID, type: 'credentials' }]);
  });

  it('AUTH_ALLOW_DEV_OAUTH no longer enables stand-ins in production', () => {
    const ids = registered({ NODE_ENV: 'production', AUTH_ALLOW_DEV_OAUTH: 'true' }).map((p) => p.id);
    expect(ids).not.toContain('google');
    expect(ids).not.toContain('github');
  });

  it('tests get no stand-ins either', () => {
    expect(registered({ NODE_ENV: 'test' }).map((p) => p.id)).toEqual([DEMO_AUTH_PROVIDER_ID]);
  });

  it('configured OAuth apps register the real Google and GitHub providers', () => {
    const providers = registered({ NODE_ENV: 'production', ...REAL_OAUTH });
    expect(providers).toContainEqual({ id: 'google', type: 'oidc' });
    expect(providers).toContainEqual({ id: 'github', type: 'oauth' });
    expect(providers.filter((p) => p.type === 'credentials').map((p) => p.id)).toEqual([DEMO_AUTH_PROVIDER_ID]);
  });

  it('real Google and GitHub link accounts that share an email', () => {
    const providers = configuredOAuthProviders({ NODE_ENV: 'production', ...REAL_OAUTH }) as Array<
      AnyProvider & { options?: { allowDangerousEmailAccountLinking?: boolean } }
    >;
    for (const id of ['google', 'github']) {
      const provider = providers.find((p) => (p.options?.id ?? p.id) === id);
      expect(provider?.options?.allowDangerousEmailAccountLinking, id).toBe(true);
    }
  });

  it('a half-configured app (id without secret) is not registered in production', () => {
    const ids = registered({ NODE_ENV: 'production', AUTH_GOOGLE_ID: 'google-client' }).map((p) => p.id);
    expect(ids).not.toContain('google');
  });

  it('local development without OAuth apps gets stand-in GitHub/Google sign-in', () => {
    const providers = registered({ NODE_ENV: 'development' });
    expect(providers).toContainEqual({ id: 'google', type: 'credentials' });
    expect(providers).toContainEqual({ id: 'github', type: 'credentials' });
  });

  it('local development prefers a real OAuth app when one is configured', () => {
    const providers = registered({ NODE_ENV: 'development', ...REAL_OAUTH });
    expect(providers).toContainEqual({ id: 'google', type: 'oidc' });
    expect(providers).toContainEqual({ id: 'github', type: 'oauth' });
  });

  it('the local developer account needs development and AUTH_DEV_LOGIN=true', () => {
    expect(registered({ NODE_ENV: 'development', AUTH_DEV_LOGIN: 'true' }).map((p) => p.id)).toContain(
      DEV_AUTH_PROVIDER_ID,
    );
    expect(registered({ NODE_ENV: 'development' }).map((p) => p.id)).not.toContain(DEV_AUTH_PROVIDER_ID);
    expect(registered({ NODE_ENV: 'production', AUTH_DEV_LOGIN: 'true' }).map((p) => p.id)).not.toContain(
      DEV_AUTH_PROVIDER_ID,
    );
  });
});

describe('provider status for the login page', () => {
  it('reports nothing usable in production without OAuth apps', () => {
    expect(oauthProviderStatus({ NODE_ENV: 'production' })).toEqual({
      google: false,
      github: false,
      simulated: false,
      dev: false,
      demo: true,
    });
  });

  it('reports real providers when configured', () => {
    expect(oauthProviderStatus({ NODE_ENV: 'production', ...REAL_OAUTH })).toMatchObject({
      google: true,
      github: true,
      simulated: false,
    });
  });

  it('flags development stand-ins as simulated', () => {
    expect(oauthProviderStatus({ NODE_ENV: 'development' })).toMatchObject({
      google: true,
      github: true,
      simulated: true,
    });
  });

  it('matches what is actually registered in every environment', () => {
    const envs = [
      { NODE_ENV: 'production' },
      { NODE_ENV: 'production', ...REAL_OAUTH },
      { NODE_ENV: 'development' },
      { NODE_ENV: 'development', AUTH_DEV_LOGIN: 'true' },
      { NODE_ENV: 'test' },
    ];
    for (const env of envs) {
      const ids = registered(env).map((p) => p.id);
      const status = oauthProviderStatus(env);
      expect(status.google, JSON.stringify(env)).toBe(ids.includes('google'));
      expect(status.github, JSON.stringify(env)).toBe(ids.includes('github'));
      expect(status.dev, JSON.stringify(env)).toBe(ids.includes(DEV_AUTH_PROVIDER_ID));
      expect(status.demo, JSON.stringify(env)).toBe(ids.includes(DEMO_AUTH_PROVIDER_ID));
    }
  });
});

describe('accounts are only linked through a verified email', () => {
  const emails = (...list: Array<[string, boolean, boolean]>) =>
    list.map(([email, primary, verified]) => ({ email, primary, verified }));

  it('uses the verified primary GitHub email', () => {
    expect(pickVerifiedGitHubEmail(emails(['a@x.dev', false, true], ['me@x.dev', true, true]))).toBe('me@x.dev');
  });

  it('never uses an unverified GitHub email, even the primary one', () => {
    expect(pickVerifiedGitHubEmail(emails(['victim@corp.com', true, false], ['me@x.dev', false, true]))).toBe(
      'me@x.dev',
    );
    expect(pickVerifiedGitHubEmail(emails(['victim@corp.com', true, false]))).toBeNull();
    expect(pickVerifiedGitHubEmail([])).toBeNull();
  });

  it('the real GitHub provider reports only a verified email', async () => {
    const github = (configuredOAuthProviders({ NODE_ENV: 'production', ...REAL_OAUTH }) as AnyProvider[]).find(
      (p) => p.id === 'github',
    ) as unknown as {
      options: { userinfo: { request: (ctx: { tokens: { access_token: string } }) => Promise<Record<string, unknown>> } };
    };
    const fetchMock = vi.fn(async (url: string) => {
      const body = url.endsWith('/user/emails')
        ? emails(['victim@corp.com', true, false])
        : { id: 7, login: 'octo', email: null };
      return new Response(JSON.stringify(body), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    try {
      const profile = await github.options.userinfo.request({ tokens: { access_token: 'token' } });
      expect(profile.email).toBeNull();
      expect(profile.email_verified).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  const google = { provider: 'google', type: 'oidc' };
  const github = { provider: 'github', type: 'oauth' };

  it('GitHub and Google sign-in need the provider to vouch for the email', () => {
    expect(oauthEmailVerified(google, { email_verified: true })).toBe(true);
    expect(oauthEmailVerified(google, { email_verified: false })).toBe(false);
    expect(oauthEmailVerified(google, {})).toBe(false);
    expect(oauthEmailVerified(github, { email_verified: true })).toBe(true);
    expect(oauthEmailVerified(github, undefined)).toBe(false);
  });

  it('the demo and local accounts are not affected', () => {
    expect(oauthEmailVerified({ provider: DEMO_AUTH_PROVIDER_ID, type: 'credentials' }, undefined)).toBe(true);
    expect(oauthEmailVerified({ provider: DEV_AUTH_PROVIDER_ID, type: 'credentials' }, undefined)).toBe(true);
  });

  it('the local-development GitHub/Google stand-ins (credentials, no profile) still sign in', () => {
    expect(oauthEmailVerified({ provider: 'github', type: 'credentials' }, undefined)).toBe(true);
    expect(oauthEmailVerified({ provider: 'google', type: 'credentials' }, undefined)).toBe(true);
  });
});
