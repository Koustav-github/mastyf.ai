/**
 * The secret that signs and encrypts login tokens (JWT sessions).
 *
 * Whoever holds it can mint a valid session for any user, so it must come from the
 * environment (AUTH_SECRET). Without it, sign-in is unavailable and the dashboard stays
 * closed (fail closed); there is deliberately no built-in fallback outside local
 * development, where a fixed development-only value keeps `pnpm dev` working.
 */
const DEVELOPMENT_ONLY_SECRET = 'mastyf-local-development-only-auth-secret-never-deploy';

type Env = Record<string, string | undefined>;

export function resolveAuthSecret(env: Env = process.env): string | undefined {
  const configured = env.AUTH_SECRET?.trim();
  if (configured) return configured;
  if (env.NODE_ENV === 'development') return DEVELOPMENT_ONLY_SECRET;
  return undefined;
}

/** True when login tokens can be issued and read on this deployment. */
export function isAuthConfigured(env: Env = process.env): boolean {
  return resolveAuthSecret(env) !== undefined;
}

let warned = false;

/** Logs once, at runtime (not during `next build`), when sign-in is disabled for lack of a secret. */
export function warnIfAuthUnconfigured(env: Env = process.env): void {
  if (warned || isAuthConfigured(env) || env.NEXT_PHASE === 'phase-production-build') return;
  warned = true;
  console.error(
    '[auth] AUTH_SECRET is not set: sign-in is disabled and the dashboard is closed. ' +
      'Set AUTH_SECRET (e.g. `openssl rand -base64 32`) in this deployment.',
  );
}
