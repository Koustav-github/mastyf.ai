import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DashboardNav } from '@/components/DashboardNav';
import { ensureAuthUser } from '@/lib/ensure-auth-user';
import { getUserOrg } from '@/lib/org-context';
import { provisionFreeOrganization } from '@/lib/provision';
import { safeAuth } from '@/lib/safe-auth';
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/lib/support';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // The middleware already sends signed-out visitors to /login with their callbackUrl;
  // this is the fallback (and never throws when sign-in is unavailable).
  const session = await safeAuth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  // First visit after signing up: create the user's free organization.
  let ctx = await getUserOrg(session.user.id);
  if (!ctx) {
    const email = session.user.email?.trim() || `${session.user.id}@oauth.mastyf-ai.local`;
    try {
      await ensureAuthUser({ id: session.user.id, email, name: session.user.name });
      await provisionFreeOrganization({ userId: session.user.id, email, name: session.user.name });
      ctx = await getUserOrg(session.user.id);
    } catch (err) {
      console.error('[dashboard] provision failed', err);
      return (
        <main className="auth">
          <div className="auth__card">
            <h1>We couldn&rsquo;t set up your workspace</h1>
            <p className="auth__lead">
              You&rsquo;re signed in, but creating your organization needs the database, and it isn&rsquo;t
              reachable right now. Try again in a minute, or email{' '}
              <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>.
            </p>
            <pre className="envblock">{err instanceof Error ? err.message : String(err)}</pre>
            <div className="btn-row" style={{ marginTop: 'var(--s-5)' }}>
              <Link href="/dashboard" className="btn btn-primary">
                Try again
              </Link>
              <Link href="/" className="btn">
                Back to mastyf.ai
              </Link>
            </div>
          </div>
        </main>
      );
    }
  }

  if (!ctx) {
    redirect('/login?error=ProvisionFailed');
  }

  return (
    <div className="app">
      <DashboardNav orgName={ctx.org.name} orgSlug={ctx.org.slug} email={session.user.email} />
      <div className="app__main">
        <main id="main" className="app__content">
          {children}
        </main>
      </div>
    </div>
  );
}
