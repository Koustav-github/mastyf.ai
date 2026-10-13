import Link from 'next/link';
import { ArrowRight, FileCode, Link2 } from 'lucide-react';
import { InstancesTable } from '@/components/dashboard/InstancesTable';
import { PLAN_FOR_TIER } from '@/components/dashboard/plans';
import { overviewMetrics, requireDashboard } from '@/lib/dashboard-data';
import { formatCount, formatShare, timeAgo } from '@/lib/format';
import { SITE_NAME } from '@/lib/product-links';

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? 'http://localhost:3001').replace(/\/$/, '');
}

export default async function DashboardPage() {
  const { ctx } = await requireDashboard();
  const m = await overviewMetrics(ctx);
  const plan = PLAN_FOR_TIER[m.license.tier];
  const linked = m.instances.total > 0;

  const envBlock = `# ${SITE_NAME} Cloud: your tenant configuration
MASTYF_AI_TENANT_ID=${ctx.org.slug}
MASTYF_AI_CONTROL_PLANE_URL=${appUrl()}
# Create or rotate in Settings, API keys:
MASTYF_AI_CLOUD_API_KEY=<your-api-key>

# Pull policy from ${SITE_NAME} Cloud:
# curl -H "Authorization: Bearer <api-key>" ${appUrl()}/api/v1/policy
`;

  return (
    <>
      <header className="dhead">
        <div>
          <h1>{ctx.org.name}</h1>
          <p>
            {plan.name} plan, workspace <code>{ctx.org.slug}</code>
          </p>
        </div>
        <div className="dhead__actions">
          <Link href="/dashboard/policy" className="btn">
            <FileCode size={14} strokeWidth={1.75} aria-hidden="true" />
            Edit policy
          </Link>
          <Link href="/dashboard/connect" className="btn btn-primary">
            <Link2 size={14} strokeWidth={2} aria-hidden="true" />
            Link a proxy
          </Link>
        </div>
      </header>

      <div className="dstack">
        <section className="panel" aria-labelledby="last-day">
          <div className="panel__head">
            <h2 id="last-day" className="panel__title">
              Last 24 hours
            </h2>
            <span className="panel__meta">
              {m.instances.lastHeartbeat ? `Last report ${timeAgo(m.instances.lastHeartbeat)}` : 'No reports yet'}
            </span>
          </div>
          <div className="metrics">
            <div className="metric">
              <span className="metric__label">Proxies online</span>
              <span className="metric__value">
                {m.instances.online}
                <small className="metric__of"> / {m.instances.total}</small>
              </span>
              <span className="metric__note">{linked ? 'Reported within 5 minutes' : 'None linked yet'}</span>
            </div>
            <div className="metric">
              <span className="metric__label">Tool calls</span>
              <span className="metric__value">{formatCount(m.traffic24h.total)}</span>
              <span className="metric__note">{formatCount(m.traffic7d.total)} in 7 days</span>
            </div>
            <div className="metric">
              <span className="metric__label">Blocked</span>
              <span className="metric__value">{formatCount(m.traffic24h.blocked)}</span>
              <span className="metric__note">
                {formatShare(m.traffic24h.blocked, m.traffic24h.total)
                  ? `${formatShare(m.traffic24h.blocked, m.traffic24h.total)} of calls`
                  : 'No calls checked yet'}
              </span>
            </div>
            <div className="metric">
              <span className="metric__label">Policy</span>
              <span className="metric__value">{m.policy.version ? `v${m.policy.version}` : '—'}</span>
              <span className="metric__note">
                {m.policy.updatedAt ? `Updated ${timeAgo(m.policy.updatedAt)}` : 'Default policy'}
              </span>
            </div>
          </div>
        </section>

        {linked ? (
          <section className="panel" aria-labelledby="instances">
            <div className="panel__head">
              <h2 id="instances" className="panel__title">
                Linked proxies
              </h2>
              <Link href="/dashboard/fleet" className="link-icon">
                Fleet
                <ArrowRight size={13} strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </div>
            <div className="panel__body panel__body--flush">
              <InstancesTable instances={m.instances.recent} />
            </div>
          </section>
        ) : null}

        <section className="panel" aria-labelledby="connect">
          <div className="panel__head">
            <h2 id="connect" className="panel__title">
              {linked ? 'Tenant configuration' : 'Link your first proxy'}
            </h2>
            <Link href="/dashboard/settings" className="link-icon">
              API keys
              <ArrowRight size={13} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </div>
          <div className="panel__body">
            {linked ? null : (
              <ol className="step-row" style={{ marginBottom: 'var(--s-5)' }}>
                <li>
                  <span className="step-row__n">1</span>
                  <span>
                    <strong>Create an API key</strong>
                    In Settings. It&rsquo;s shown once, so copy it then.
                  </span>
                </li>
                <li>
                  <span className="step-row__n">2</span>
                  <span>
                    <strong>Set these variables</strong>
                    On the host running your self-hosted proxy.
                  </span>
                </li>
                <li>
                  <span className="step-row__n">3</span>
                  <span>
                    <strong>Restart the proxy</strong>
                    It registers here and pulls this policy within a minute.
                  </span>
                </li>
              </ol>
            )}
            <pre className="envblock">{envBlock}</pre>
          </div>
        </section>
      </div>
    </>
  );
}
