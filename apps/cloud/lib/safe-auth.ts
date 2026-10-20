import { connection } from 'next/server';
import { auth } from './auth';
import { isAuthConfigured as authSecretAvailable } from './auth-secret';

/**
 * Returns the session, or null when sign-in is unavailable on this deployment (no
 * AUTH_SECRET outside local development) or the token cannot be read. Uses the same
 * secret rule as `auth()` itself, so pages and the dashboard agree on who is signed in.
 */
export async function safeAuth() {
  // Who is signed in depends on the request, so a page that asks must never be prerendered.
  // Without this, a build that runs without AUTH_SECRET returns null before reading any
  // cookie, and Next.js bakes "signed out" into the page: /dashboard became a static
  // redirect to /login that every visitor got, signed in or not. It must also run before
  // the try below, which would otherwise swallow Next's dynamic-rendering signal.
  await connection();
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
