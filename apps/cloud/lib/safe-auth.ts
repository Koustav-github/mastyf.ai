import { auth } from './auth';
import { isAuthConfigured as authSecretAvailable } from './auth-secret';

/**
 * Returns the session, or null when sign-in is unavailable on this deployment (no
 * AUTH_SECRET outside local development) or the token cannot be read. Uses the same
 * secret rule as `auth()` itself, so pages and the dashboard agree on who is signed in.
 */
export async function safeAuth() {
  if (!authSecretAvailable()) return null;
  try {
    return await auth();
  } catch {
    return null;
  }
}

export function isAuthConfigured(): boolean {
  return authSecretAvailable();
}
