import { LogOut } from 'lucide-react';
import { signOutAction } from '@/app/actions';
import { SettingsClient } from '@/components/SettingsClient';
import { activeApiKeyCount, requireDashboard } from '@/lib/dashboard-data';

export default async function SettingsPage() {
  const { session, ctx } = await requireDashboard();
  const activeKeys = await activeApiKeyCount(ctx.org.id);

  return (
    <>
      <header className="dhead">
        <div>
          <h1>Settings</h1>
          <p>Your organization, its API key, and your account.</p>
        </div>
      </header>

      <div className="dstack">
        <section className="panel" aria-labelledby="org">
          <div className="panel__head">
            <h2 id="org" className="panel__title">
              Organization
            </h2>
          </div>
          <div className="panel__body">
            <dl className="kv">
              <div>
                <dt>Name</dt>
                <dd>{ctx.org.name}</dd>
              </div>
              <div>
                <dt>Workspace ID</dt>
                <dd>
                  <code>{ctx.org.slug}</code>
                </dd>
              </div>
              <div>
                <dt>Your role</dt>
                <dd>{ctx.membership.role}</dd>
              </div>
            </dl>
          </div>
        </section>

        <SettingsClient activeKeys={activeKeys} />

        <section className="panel" aria-labelledby="account">
          <div className="panel__head">
            <h2 id="account" className="panel__title">
              Account
            </h2>
          </div>
          <div className="panel__body btn-row" style={{ justifyContent: 'space-between' }}>
            <p className="panel__text" style={{ margin: 0 }}>
              Signed in as <strong>{session.user.email ?? session.user.name ?? 'this account'}</strong>
            </p>
            <form action={signOutAction}>
              <button type="submit" className="btn">
                <LogOut size={14} strokeWidth={1.75} aria-hidden="true" />
                Sign out
              </button>
            </form>
          </div>
        </section>
      </div>
    </>
  );
}
