/**
 * When Google or GitHub refuses a sign-in (the person cancels, or the OAuth app is still in
 * testing and they are not a test user), the provider redirects back with `?error=…` and no
 * `iss`. Auth.js then fails issuer validation and reports it as a server "Configuration"
 * error on its own bare page. Catch it first and send the person back to /login with a
 * message that matches what actually happened.
 */
const CALLBACK_PATH = /^\/api\/auth\/callback\/[^/]+\/?$/;

export function providerErrorRedirect(url: URL): string | null {
  if (!CALLBACK_PATH.test(url.pathname)) return null;
  const error = url.searchParams.get('error');
  if (!error) return null;
  return error === 'access_denied' ? '/login?error=AccessDenied' : '/login?error=OAuthCallback';
}
