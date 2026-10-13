import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, LogOut } from 'lucide-react';
import { SignInButtons } from '@/components/SignInButtons';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteNav } from '@/components/SiteNav';
import { isAuthConfigured, safeAuth } from '@/lib/safe-auth';
import { oauthProviderStatus } from '@/lib/oauth-providers';
import { GITHUB_REPO_URL } from '@/lib/github-links';
import { SUPPORT_EMAIL } from '@/lib/support';
import { signOutAction } from '@/app/actions';

type Props = {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

const supportHint = `Contact ${SUPPORT_EMAIL} if this persists.`;

const ERROR_MESSAGES: Record<string, string> = {
  Configuration: `Sign-in isn't available on this deployment right now. Try again later, or contact ${SUPPORT_EMAIL}.`,
  AccessDenied: `Access was denied. Try another account or contact ${SUPPORT_EMAIL}.`,
  EmailNotVerified:
    'Your GitHub or Google account has no verified email address. Verify one with that provider, then sign in again.',
  Verification: 'Sign-in link expired. Try again.',
  OAuthAccountNotLinked:
    'This email is already linked to another sign-in method. Use the same provider you used before.',
  OAuthSignin: 'Could not start OAuth. Try again.',
  OAuthCallback: 'OAuth callback failed. Confirm redirect URIs in Google/GitHub app settings.',
  OAuthCreateAccount: 'Could not create your account. Check database logs.',
  CallbackRouteError: 'Sign-in callback error. Try again.',
  Default: 'Sign-in failed. Try again.',
  ProvisionFailed: `Signed in, but organization setup failed. Try again or contact ${SUPPORT_EMAIL}.`,
};

export default async function LoginPage({ searchParams }: Props) {
  const session = await safeAuth();
  const params = await searchParams;
  // Only same-site paths: anything else collapses to its path on this site.
  let callbackUrl = params.callbackUrl ?? '/dashboard';
  try {
    const parsed = new URL(callbackUrl, 'http://local');
    if (parsed.pathname.startsWith('/')) {
      callbackUrl = `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    callbackUrl = '/dashboard';
  }
  const errorCode = params.error;
  const errorMessage = errorCode ? (ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.Default) : null;

  const signInAvailable = isAuthConfigured();
  const oauth = oauthProviderStatus();
  const oauthReady = oauth.google || oauth.github;
  const signedIn = Boolean(session?.user?.id);
  // Signing in with GitHub or Google for the first time creates the account (see
  // lib/ensure-auth-user.ts) and the dashboard then provisions a free workspace.
  const lead = !signInAvailable
    ? "Sign-in isn't available on this deployment right now. Shield downloads and security scores still work without an account."
    : oauthReady
      ? 'Continue with GitHub or Google. New here? Your account and a free workspace are created the first time you sign in.'
      : "GitHub and Google sign-in aren't set up on this deployment yet. You can still preview the console with the demo.";

  return (
    <>
      <SiteNav session={signedIn} />
      <main className="auth">
        <div className="auth__card">
          <Link href="/" className="app__brand" style={{ padding: 0 }}>
            <Image src="/brand/mark-64.png" alt="" width={26} height={26} className="brand-mark" />
            <span>mastyf.ai</span>
          </Link>

          <h1>Sign in or create an account</h1>
          <p className="auth__lead">{lead}</p>

          {signedIn ? (
            <div className="notice notice--ok">
              <p style={{ margin: '0 0 var(--s-3)' }}>
                You&rsquo;re signed in as{' '}
                <strong>{session?.user?.email || session?.user?.name || 'the demo account'}</strong>.
              </p>
              <div className="btn-row">
                <Link href={callbackUrl} className="btn btn-primary btn-sm">
                  Continue
                  <ArrowRight size={13} strokeWidth={2} aria-hidden="true" />
                </Link>
                <form action={signOutAction}>
                  <button type="submit" className="btn btn-sm">
                    <LogOut size={13} strokeWidth={1.75} aria-hidden="true" />
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="notice notice--error" role="alert">
              <p style={{ margin: 0 }}>{errorMessage}</p>
              {errorCode && !['AccessDenied', 'ProvisionFailed', 'EmailNotVerified'].includes(errorCode) ? (
                <p className="auth__note">{supportHint}</p>
              ) : null}
              {errorCode ? <p className="auth__note">Code: {errorCode}</p> : null}
            </div>
          ) : null}

          {signInAvailable ? (
            <SignInButtons
              callbackUrl={callbackUrl}
              googleEnabled={oauth.google}
              githubEnabled={oauth.github}
              devEnabled={oauth.dev}
              simulated={oauth.simulated}
            />
          ) : null}

          <div className="auth__aside">
            <p>
              Only want the desktop app? <Link href="/download">Download Mastyf Shield</Link>; no account needed.
            </p>
            <p>
              Checking an MCP server? <Link href="/certified">Security scores</Link> are public.
            </p>
            <p>
              Prefer to run it yourself?{' '}
              <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
                Self-host from GitHub
              </a>
              .
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
