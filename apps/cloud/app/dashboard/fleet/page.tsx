import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { InstancesTable } from '@/components/dashboard/InstancesTable';
import { listInstances, policyHistory, requireDashboard, trafficTotals } from '@/lib/dashboard-data';
import { queryFleetThreatGraph, type FleetThreatGraphResult } from '@/lib/fleet-threat-graph';
import { formatCount, formatDateTime, formatShare, timeAgo } from '@/lib/format';

export default async function FleetPage() {
  const { ctx } = await requireDashboard();
  const orgId = ctx.org.id;

  const [instances, traffic, policies] = await Promise.all([
    listInstances(orgId),
    trafficTotals(orgId),
    policyHistory(orgId),
  ]);
  let threats: FleetThreatGraphResult | null = null;
  try {
    threats = await queryFleetThreatGraph(orgId, 24);
  } catch {
    threats = null;
  }
  const online = instances.filter((i) => i.health === 'online').length;

  return (
    <>
      <header className="dhead">
        <div>
          <h1>Fleet</h1>
          <p>
            Self-hosted proxies linked to this workspace, and what they have reported. {online} of {instances.length}{' '}
            online.
          </p>
        </div>
        <div className="dhead__actions">
          <Link href="/dashboard/connect" className="btn">
            Link a proxy
            <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <div className="dstack">
        <section className="panel" aria-labelledby="traffic">
          <div className="panel__head">
            <h2 id="traffic" className="panel__title">
              All reported traffic
            </h2>
            <span className="panel__meta">
              {traffic.periods ? `${formatCount(traffic.periods)} audit reports` : 'No audit reports yet'}
            </span>
          </div>
          <div className="metrics">
            <div className="metric">
              <span className="metric__label">Tool calls</span>
              <span className="metric__value">{formatCount(traffic.total)}</span>
            </div>
            <div className="metric">
              <span className="metric__label">Blocked</span>
              <span className="metric__value">{formatCount(traffic.blocked)}</span>
              <span className="metric__note">{formatShare(traffic.blocked, traffic.total) ?? '—'} of calls</span>
            </div>
            <div className="metric">
              <span className="metric__label">Allowed</span>
              <span className="metric__value">{formatCount(traffic.allowed)}</span>
            </div>
            <div className="metric">
              <span className="metric__label">Flagged</span>
              <span className="metric__value">{formatCount(traffic.flagged)}</span>
              <span className="metric__note">Allowed, marked for review</span>
            </div>
          </div>
        </section>

        <section className="panel" aria-labelledby="instances">
          <div className="panel__head">
            <h2 id="instances" className="panel__title">
              Instances
            </h2>
            <span className="panel__meta">Online means a heartbeat in the last 5 minutes</span>
          </div>
          <div className="panel__body panel__body--flush">
            {instances.length ? (
              <InstancesTable instances={instances} />
            ) : (
              <p className="empty">
                <strong>No proxies linked yet</strong>
                Set <code>MASTYF_AI_CLOUD_API_KEY</code> and <code>MASTYF_AI_CONTROL_PLANE_URL</code> on your proxy
                host. <Link href="/dashboard/connect">How to link a proxy</Link>
              </p>
            )}
          </div>
        </section>

        <div className="dgrid">
          <section className="panel" aria-labelledby="signatures">
            <div className="panel__head">
              <h2 id="signatures" className="panel__title">
                Threat signatures, last 24 hours
              </h2>
            </div>
            <div className="panel__body panel__body--flush">
              {threats?.signatures.length ? (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th scope="col">Rule and tool</th>
                        <th scope="col" className="num">
                          Events
                        </th>
                        <th scope="col" className="num">
                          Instances
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {threats.signatures.slice(0, 12).map((s) => (
                        <tr key={`${s.signature_id}-${s.region ?? ''}`}>
                          <td>
                            {s.rule_name}
                            <span className="cell-sub">
                              {s.tool_name}, {s.category}
                              {s.region ? `, ${s.region}` : ''}
                            </span>
                          </td>
                          <td className="num">{formatCount(Number(s.event_count))}</td>
                          <td className="num dim">{formatCount(Number(s.instance_count))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="empty">
                  <strong>Nothing reported</strong>
                  Signatures of blocked calls appear here when your proxies report them.
                </p>
              )}
            </div>
            {threats?.alerts.length ? (
              <div className="panel__foot">{threats.alerts[0].message}</div>
            ) : null}
          </section>

          <section className="panel" aria-labelledby="policy-history">
            <div className="panel__head">
              <h2 id="policy-history" className="panel__title">
                Published policy versions
              </h2>
              <Link href="/dashboard/policy" className="link-icon">
                Policy
                <ArrowRight size={13} strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </div>
            <div className="panel__body panel__body--flush">
              {policies.length ? (
                <table className="data-table">
                  <tbody>
                    {policies.map((p) => (
                      <tr key={p.version}>
                        <td>v{p.version}</td>
                        <td className="num dim" title={formatDateTime(p.publishedAt) ?? undefined}>
                          {timeAgo(p.publishedAt) ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="empty">
                  <strong>No versions published</strong>
                  Proxies use the policy saved on the Policy page.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
