import { describe, expect, it, vi } from 'vitest';

const { authGet } = vi.hoisted(() => ({ authGet: vi.fn(async () => new Response('auth.js', { status: 200 })) }));
vi.mock('@/lib/auth', () => ({ handlers: { GET: authGet, POST: vi.fn() } }));

import { providerErrorRedirect } from '@/lib/oauth-callback-error';
import { GET } from '@/app/api/auth/[...nextauth]/route';

const url = (path: string) => new URL(path, 'http://localhost:3001');

describe('provider errors on the OAuth callback', () => {
  it('sends a denied or cancelled Google/GitHub sign-in back to the login page', () => {
    expect(providerErrorRedirect(url('/api/auth/callback/google?error=access_denied'))).toBe(
      '/login?error=AccessDenied',
    );
    expect(providerErrorRedirect(url('/api/auth/callback/github?error=access_denied&state=x'))).toBe(
      '/login?error=AccessDenied',
    );
  });

  it('reports any other provider error as a callback failure', () => {
    expect(providerErrorRedirect(url('/api/auth/callback/google?error=invalid_request'))).toBe(
      '/login?error=OAuthCallback',
    );
  });

  it('leaves successful callbacks and other auth routes to Auth.js', () => {
    expect(providerErrorRedirect(url('/api/auth/callback/google?code=abc&state=x'))).toBeNull();
    expect(providerErrorRedirect(url('/api/auth/session'))).toBeNull();
    expect(providerErrorRedirect(url('/api/auth/error?error=Configuration'))).toBeNull();
  });
});

describe('GET /api/auth/*', () => {
  it('redirects a provider error to /login instead of the Auth.js "Server error" page', async () => {
    authGet.mockClear();
    const res = await GET(new Request('http://localhost:3001/api/auth/callback/google?error=access_denied') as never);
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(res.headers.get('location')).toBe('http://localhost:3001/login?error=AccessDenied');
    expect(authGet).not.toHaveBeenCalled();
  });

  it('passes everything else to Auth.js', async () => {
    authGet.mockClear();
    const res = await GET(new Request('http://localhost:3001/api/auth/callback/google?code=abc&state=x') as never);
    expect(await res.text()).toBe('auth.js');
    expect(authGet).toHaveBeenCalledOnce();
  });
});
