import type { NextAuthConfig } from 'next-auth';
import { resolveAuthSecret, warnIfAuthUnconfigured } from './auth-secret';
import { ensureAuthUser } from './ensure-auth-user';
import {
  configuredOAuthProviders,
  DEV_AUTH_PROVIDER_ID,
  DEMO_AUTH_PROVIDER_ID,
  oauthEmailVerified,
} from './oauth-providers';

warnIfAuthUnconfigured();

export const authConfig = {
  // No fallback outside local development: see lib/auth-secret.ts.
  secret: resolveAuthSecret(),
  providers: configuredOAuthProviders(),
  // Errors land on /login?error=… (our messages) instead of Auth.js's bare error page.
  pages: { signIn: '/login', error: '/login' },
  trustHost: true,
  // JWT sessions: same token in middleware (edge) and server components (adapter still stores users/accounts).
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user?.id) return false;
      // Runs before Auth.js links accounts by email, so an unverified address never links.
      if (!oauthEmailVerified(account, profile)) return '/login?error=EmailNotVerified';
      if (
        account?.provider === DEV_AUTH_PROVIDER_ID ||
        account?.provider === DEMO_AUTH_PROVIDER_ID ||
        account?.provider === 'github' ||
        account?.provider === 'google'
      ) {
        await ensureAuthUser({
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        });
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
        token.email = user.email ?? token.email;
        token.name = user.name ?? token.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        if (typeof token.email === 'string') session.user.email = token.email;
        if (typeof token.name === 'string') session.user.name = token.name;
      }
      return session;
    },
    // Not what guards the dashboard: Auth.js ignores this result when middleware passes its
    // own handler, as middleware.ts does. The guard lives there; this stays consistent with it.
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      if (path.startsWith('/dashboard')) {
        return !!auth?.user;
      }
      return true;
    },
  },
} satisfies NextAuthConfig;

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
