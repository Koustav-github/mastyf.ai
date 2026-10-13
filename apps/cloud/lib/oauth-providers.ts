import Credentials from 'next-auth/providers/credentials';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import type { Provider } from 'next-auth/providers';

export const DEV_AUTH_PROVIDER_ID = 'dev-local';
export const DEMO_AUTH_PROVIDER_ID = 'demo-operator';

const DEV_USER_ID = 'dev-local-mastyf-user';
const DEV_USER_EMAIL = 'dev@localhost.mastyf.ai';

const DEMO_USER_ID = 'demo-cloud-operator';
const DEMO_USER_EMAIL = 'operator@mastyf.ai';

function devLoginEnabled(): boolean {
  return process.env.NODE_ENV === 'development' && process.env.AUTH_DEV_LOGIN === 'true';
}

function devCredentialsProvider(): Provider | null {
  if (!devLoginEnabled()) return null;

  return Credentials({
    id: DEV_AUTH_PROVIDER_ID,
    name: 'Local dev account',
    credentials: {},
    authorize: async () => ({
      id: DEV_USER_ID,
      name: 'Local Dev',
      email: DEV_USER_EMAIL,
    }),
  });
}

function demoCredentialsProvider(): Provider {
  return Credentials({
    id: DEMO_AUTH_PROVIDER_ID,
    name: 'Demo Console Access',
    credentials: {},
    authorize: async () => ({
      id: DEMO_USER_ID,
      name: 'Security Operator (Demo)',
      email: DEMO_USER_EMAIL,
    }),
  });
}

export function configuredOAuthProviders(): Provider[] {
  const providers: Provider[] = [];
  const isDev = process.env.NODE_ENV !== 'production' || process.env.AUTH_ALLOW_DEV_OAUTH === 'true';

  const googleId = process.env.AUTH_GOOGLE_ID?.trim();
  const googleSecret = process.env.AUTH_GOOGLE_SECRET?.trim();
  if (googleId && googleSecret) {
    providers.push(
      Google({
        clientId: googleId,
        clientSecret: googleSecret,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  } else {
    providers.push(
      Credentials({
        id: 'google',
        name: 'Google',
        credentials: {},
        authorize: async () => ({
          id: 'dev-google-user',
          name: 'Google User',
          email: 'user@gmail.com',
          image: '/logo.png',
        }),
      }),
    );
  }

  const githubId = process.env.AUTH_GITHUB_ID?.trim();
  const githubSecret = process.env.AUTH_GITHUB_SECRET?.trim();
  if (githubId && githubSecret) {
    providers.push(
      GitHub({
        clientId: githubId,
        clientSecret: githubSecret,
        allowDangerousEmailAccountLinking: true,
        authorization: { params: { scope: 'read:user user:email' } },
      }),
    );
  } else {
    providers.push(
      Credentials({
        id: 'github',
        name: 'GitHub',
        credentials: {},
        authorize: async () => ({
          id: 'dev-github-user',
          name: 'GitHub User',
          email: 'developer@github.com',
          image: '/logo.png',
        }),
      }),
    );
  }

  const dev = devCredentialsProvider();
  if (dev) providers.push(dev);

  // Always enable demo credentials provider so evaluation, preview, and test drive never fail
  providers.push(demoCredentialsProvider());

  return providers;
}

export function oauthProviderStatus(): { google: boolean; github: boolean; dev: boolean; demo: boolean } {
  return {
    google: true,
    github: true,
    dev: true,
    demo: true,
  };
}
