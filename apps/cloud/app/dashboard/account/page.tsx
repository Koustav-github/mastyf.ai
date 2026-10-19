import Link from 'next/link';
import { ArrowRight, LogOut } from 'lucide-react';
import { signOutAction } from '@/app/actions';
import { getAccount } from '@/lib/account';
import type { SignInMethod } from '@/lib/account-view';
import { requireDashboard } from '@/lib/dashboard-data';
import { formatDate } from '@/lib/format';

const METHOD_LABEL: Record<SignInMethod, string> = { github: 'GitHub', google: 'Google' };

export default async function AccountPage() {
  const { session } = await requireDashboard();
  const account = await getAccount(session.user.id);

  return (
    <>
      <header className="dhead">
        <div>
          <h1>Account</h1>
          <p>Your profile and how you sign in, as stored for this workspace.</p>
        </div>
        <div className="dhead__actions">
          <form action={signOutAction}>
            <button type="submit" className="btn">
              <LogOut size={14} strokeWidth={1.75} aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      </header>

      {!account ? (
        <p className="notice notice--warn" role="status">
          We couldn&rsquo;t find your account record. Sign out and sign in again to recreate it.
        </p>
      ) : (
        <div className="dstack">
          <section className="panel" aria-labelledby="profile">
            <div className="panel__head">
              <h2 id="profile" className="panel__title">
                Profile
              </h2>
              <span className="panel__meta">From your sign-in provider</span>
            </div>
            <div className="panel__body account">
              {account.image ? (
                // Provider avatars come from many hosts; a plain img avoids allow-listing each one.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={account.image}
                  alt=""
                  width={56}
                  height={56}
                  className="account__avatar"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="account__avatar account__avatar--initial" aria-hidden="true">
                  {(account.name || account.email).charAt(0).toUpperCase()}
                </span>
              )}
              <dl className="kv account__kv">
                <div>
                  <dt>Name</dt>
                  <dd>{account.name || '—'}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{account.email}</dd>
                </div>
                <div>
                  <dt>Member since</dt>
                  <dd>{formatDate(account.joinedAt) ?? '—'}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="panel" aria-labelledby="methods">
            <div className="panel__head">
              <h2 id="methods" className="panel__title">
                Sign-in methods
              </h2>
            </div>
            <div className="panel__body">
              {account.signInMethods.length ? (
                <>
                  <div className="chips" aria-label="Linked providers">
                    {account.signInMethods.map((m) => (
                      <span key={m} className="chip">
                        {METHOD_LABEL[m]}
                      </span>
                    ))}
                  </div>
                  <p className="panel__text" style={{ margin: 'var(--s-3) 0 0' }}>
                    GitHub or Google with the same verified email both open this account.
                  </p>
                </>
              ) : (
                <p className="panel__text" style={{ margin: 0 }}>
                  This is the demo or a local account, so no GitHub or Google sign-in is linked.
                </p>
              )}
            </div>
          </section>

          {account.workspace ? (
            <section className="panel" aria-labelledby="workspace">
              <div className="panel__head">
                <h2 id="workspace" className="panel__title">
                  Workspace
                </h2>
                <Link href="/dashboard/settings" className="link-icon">
                  Settings
                  <ArrowRight size={13} strokeWidth={1.75} aria-hidden="true" />
                </Link>
              </div>
              <div className="panel__body">
                <dl className="kv">
                  <div>
                    <dt>Name</dt>
                    <dd>{account.workspace.name}</dd>
                  </div>
                  <div>
                    <dt>Workspace ID</dt>
                    <dd>
                      <code>{account.workspace.slug}</code>
                    </dd>
                  </div>
                  <div>
                    <dt>Your role</dt>
                    <dd>{account.workspace.role}</dd>
                  </div>
                </dl>
              </div>
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}
