import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toAccountView } from '@/lib/account-view';

const { safeAuth, getAccount } = vi.hoisted(() => ({ safeAuth: vi.fn(), getAccount: vi.fn() }));
vi.mock('@/lib/safe-auth', () => ({ safeAuth }));
vi.mock('@/lib/account', () => ({ getAccount }));

import { GET } from '@/app/api/me/route';

const USER = {
  id: 'user-1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  image: 'https://avatars.githubusercontent.com/u/1',
  createdAt: new Date('2026-10-01T09:30:00Z'),
};

const CTX = {
  org: { id: 'org-1', slug: 'ada-x7k2', name: 'Ada Lovelace' },
  membership: { role: 'owner' },
};

describe('account view', () => {
  it('describes the user, their sign-in methods and their workspace', () => {
    expect(toAccountView(USER, ['github'], CTX)).toEqual({
      id: 'user-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      image: 'https://avatars.githubusercontent.com/u/1',
      joinedAt: '2026-10-01T09:30:00.000Z',
      signInMethods: ['github'],
      workspace: { id: 'org-1', slug: 'ada-x7k2', name: 'Ada Lovelace', role: 'owner' },
    });
  });

  it('lists each sign-in method once, in a stable order, and ignores unknown providers', () => {
    expect(toAccountView(USER, ['google', 'github', 'google', 'demo-operator'], CTX).signInMethods).toEqual([
      'github',
      'google',
    ]);
  });

  it('has no workspace before one is provisioned', () => {
    expect(toAccountView(USER, [], null).workspace).toBeNull();
  });
});

describe('GET /api/me', () => {
  beforeEach(() => {
    safeAuth.mockReset();
    getAccount.mockReset();
  });

  it('is 401 when nobody is signed in, without touching the database', async () => {
    safeAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(getAccount).not.toHaveBeenCalled();
  });

  it("returns the signed-in user's account, never cached", async () => {
    const account = toAccountView(USER, ['github'], CTX);
    safeAuth.mockResolvedValue({ user: { id: 'user-1' } });
    getAccount.mockResolvedValue(account);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(getAccount).toHaveBeenCalledWith('user-1');
    expect(res.headers.get('cache-control')).toContain('no-store');
    expect(await res.json()).toEqual({ account });
  });

  it('is 404 when the session has no user row', async () => {
    safeAuth.mockResolvedValue({ user: { id: 'gone' } });
    getAccount.mockResolvedValue(null);
    expect((await GET()).status).toBe(404);
  });

  it('is 503 when the database cannot be reached', async () => {
    safeAuth.mockResolvedValue({ user: { id: 'user-1' } });
    getAccount.mockRejectedValue(new Error('connect ECONNREFUSED'));
    const res = await GET();
    expect(res.status).toBe(503);
    expect(JSON.stringify(await res.json())).not.toContain('ECONNREFUSED');
  });
});
