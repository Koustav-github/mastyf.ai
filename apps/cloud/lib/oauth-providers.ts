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

type Env = Record<string, string | undefined>;

function devLoginEnabled(env: Env): boolean {
  return env.NODE_ENV === 'development' && env.AUTH_DEV_LOGIN === 'true';
}

/**
 * Stand-in GitHub/Google sign-in: no OAuth app and no password, it signs straight in as a
 * fixed test user. Local development only; never in production or tests.
 */
function simulatedOAuthEnabled(env: Env): boolean {
  return env.NODE_ENV === 'development';
}

function googleCredentials(env: Env) {
  const clientId = env.AUTH_GOOGLE_ID?.trim();
  const clientSecret = env.AUTH_GOOGLE_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

function githubCredentials(env: Env) {
  const clientId = env.AUTH_GITHUB_ID?.trim();
  const clientSecret = env.AUTH_GITHUB_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

// ------------------------------------------------------------------ verified emails
//
// Real Google and GitHub sign-ins link to an existing account with the same email
// (allowDangerousEmailAccountLinking). That is only safe when the provider has verified the
// address, or anyone could add a victim's email to their own GitHub account and land in the
// victim's workspace.

const GITHUB_API = 'https://api.github.com';

type GitHubEmail = { email: string; primary: boolean; verified: boolean };

/** The verified primary address, else any verified one; never an unverified address. */
export function pickVerifiedGitHubEmail(emails: GitHubEmail[]): string | null {
  const verified = emails.filter((e) => e.verified);
  return (verified.find((e) => e.primary) ?? verified[0])?.email ?? null;
}

/**
 * Auth.js's GitHub provider falls back to the primary address without checking that it is
 * verified, so fetch the address list ourselves and report only a verified email, with an
 * `email_verified` claim like Google's for the sign-in check.
 */
async function githubUserinfo({ tokens }: { tokens: { access_token?: string } }) {
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${tokens.access_token}`,
    'User-Agent': 'mastyf-cloud',
  };
  const profile = await fetch(`${GITHUB_API}/user`, { headers }).then((res) => res.json());
  const res = await fetch(`${GITHUB_API}/user/emails`, { headers });
  const emails = res.ok ? ((await res.json()) as GitHubEmail[]) : [];
  const email = pickVerifiedGitHubEmail(Array.isArray(emails) ? emails : []);
  return { ...profile, email, email_verified: email !== null };
}

/** Sign-in check: Google and GitHub must vouch for the email; the demo and local accounts are fixed. */
export function oauthEmailVerified(provider: string | undefined, profile: unknown): boolean {
  if (provider !== 'google' && provider !== 'github') return true;
  return (profile as { email_verified?: unknown } | null | undefined)?.email_verified === true;
}

function devCredentialsProvider(env: Env): Provider | null {
  if (!devLoginEnabled(env)) return null;

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

function simulatedOAuthProvider(id: 'google' | 'github'): Provider {
  const label = id === 'google' ? 'Google' : 'GitHub';
  return Credentials({
    id,
    name: label,
    credentials: {},
    authorize: async () => ({
      id: `dev-${id}-user`,
      name: `${label} User`,
      email: id === 'google' ? 'user@gmail.com' : 'developer@github.com',
      image: '/logo.png',
    }),
  });
}

export function configuredOAuthProviders(env: Env = process.env): Provider[] {
  const providers: Provider[] = [];
  const simulated = simulatedOAuthEnabled(env);

  const google = googleCredentials(env);
  if (google) {
    // Lets someone who first signed in with GitHub also sign in with Google (same email)
    // into the same account. Only with a verified email: see oauthEmailVerified().
    providers.push(Google({ ...google, allowDangerousEmailAccountLinking: true }));
  } else if (simulated) {
    providers.push(simulatedOAuthProvider('google'));
  }

  const github = githubCredentials(env);
  if (github) {
    providers.push(
      GitHub({
        ...github,
        allowDangerousEmailAccountLinking: true,
        authorization: { params: { scope: 'read:user user:email' } },
        userinfo: { url: `${GITHUB_API}/user`, request: githubUserinfo },
      }),
    );
  } else if (simulated) {
    providers.push(simulatedOAuthProvider('github'));
  }

  const dev = devCredentialsProvider(env);
  if (dev) providers.push(dev);

  // The shared demo console stays available everywhere (evaluation, preview, test drive).
  providers.push(demoCredentialsProvider());

  return providers;
}

export type OAuthProviderStatus = {
  /** "Continue with Google" works (a real OAuth app, or the development stand-in). */
  google: boolean;
  /** "Continue with GitHub" works (a real OAuth app, or the development stand-in). */
  github: boolean;
  /** At least one of the two is the development stand-in rather than a real OAuth app. */
  simulated: boolean;
  /** The "Sign in as local developer" account is registered. */
  dev: boolean;
  demo: boolean;
};

/** Mirrors `configuredOAuthProviders()`, so the login page only shows buttons that work. */
export function oauthProviderStatus(env: Env = process.env): OAuthProviderStatus {
  const simulatedAllowed = simulatedOAuthEnabled(env);
  const google = googleCredentials(env) !== null;
  const github = githubCredentials(env) !== null;
  return {
    google: google || simulatedAllowed,
    github: github || simulatedAllowed,
    simulated: simulatedAllowed && (!google || !github),
    dev: devLoginEnabled(env),
    demo: true,
  };
}
