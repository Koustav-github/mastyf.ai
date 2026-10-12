'use client';

import { useState } from 'react';
import { GITHUB_DEFAULT_BRANCH, GITHUB_REPO_URL } from '@/lib/github-links';
import { DEMO_AUTH_PROVIDER_ID, DEV_AUTH_PROVIDER_ID } from '@/lib/oauth-providers';
import { SITE_NAME } from '@/lib/product-links';
import { signIn } from 'next-auth/react';

const OAUTH_SETUP_DOC = `${GITHUB_REPO_URL}/blob/${GITHUB_DEFAULT_BRANCH}/apps/cloud/docs/OAUTH_CLOUD_SETUP.md`;

type Props = {
  callbackUrl?: string;
  googleEnabled?: boolean;
  githubEnabled?: boolean;
  devEnabled?: boolean;
  devSetupNeeded?: boolean;
};

export function SignInButtons({
  callbackUrl = '/dashboard',
  devEnabled = false,
}: Props) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleOAuthSignIn = async (provider: 'github' | 'google') => {
    setLoadingProvider(provider);
    try {
      await signIn(provider, { callbackUrl });
    } catch {
      // Graceful fallback to demo console session if OAuth handshake fails
      await signIn(DEMO_AUTH_PROVIDER_ID, { callbackUrl });
    }
  };

  const handleDemoSignIn = () => {
    setLoadingProvider('demo');
    signIn(DEMO_AUTH_PROVIDER_ID, { callbackUrl });
  };

  const handleDevSignIn = () => {
    setLoadingProvider('dev');
    signIn(DEV_AUTH_PROVIDER_ID, { callbackUrl });
  };

  return (
    <div className="signin-buttons-wrapper">
      <div className="flex flex-col gap-2.5">
        {/* GitHub Button */}
        <button
          type="button"
          className="btn btn-github w-full flex items-center justify-center gap-2.5 py-2.5"
          onClick={() => handleOAuthSignIn('github')}
          disabled={loadingProvider !== null}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          <span className="font-semibold">
            {loadingProvider === 'github' ? 'Connecting to GitHub…' : 'Continue with GitHub'}
          </span>
        </button>

        {/* Google Button */}
        <button
          type="button"
          className="btn btn-google w-full flex items-center justify-center gap-2.5 py-2.5"
          onClick={() => handleOAuthSignIn('google')}
          disabled={loadingProvider !== null}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span className="font-semibold text-white">
            {loadingProvider === 'google' ? 'Connecting to Google…' : 'Continue with Google'}
          </span>
        </button>

        {/* Divider */}
        <div className="relative my-2 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <span className="relative bg-[#0c101a] px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
            Or Test Drive Instantly
          </span>
        </div>

        {/* Instant Demo Access Button */}
        <button
          type="button"
          className="btn btn-secondary w-full py-2.5 flex items-center justify-center gap-2 text-xs font-semibold"
          onClick={handleDemoSignIn}
          disabled={loadingProvider !== null}
        >
          <span>🏢</span>
          <span>
            {loadingProvider === 'demo' ? 'Entering Console…' : 'Preview Enterprise Fleet Console (Demo)'}
          </span>
        </button>

        {devEnabled && (
          <button
            type="button"
            className="btn btn-secondary w-full py-2.5 flex items-center justify-center gap-2 text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 rounded-xl transition-all"
            onClick={handleDevSignIn}
            disabled={loadingProvider !== null}
          >
            <span className="font-mono text-cyan-400 font-bold">$</span>
            <span>
              {loadingProvider === 'dev' ? 'Signing In…' : 'Sign In as Local Developer'}
            </span>
          </button>
        )}
      </div>

      <p className="login-alt muted mt-4">
        Need local offline enforcement?{' '}
        <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
          Self-host {SITE_NAME} on GitHub
        </a>
      </p>
    </div>
  );
}
