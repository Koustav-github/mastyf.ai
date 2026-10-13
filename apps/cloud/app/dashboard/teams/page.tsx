import { InstancesTable } from '@/components/dashboard/InstancesTable';
import { listInstances, listTeams, requireDashboard, trafficTotals } from '@/lib/dashboard-data';
import { formatCount } from '@/lib/format';

export default async function TeamsPage() {
  const { ctx } = await requireDashboard();
  const orgId = ctx.org.id;

  const [teams, instances, traffic] = await Promise.all([
    listTeams(orgId),
    listInstances(orgId, 50),
    trafficTotals(orgId),
  ]);
  const online = instances.filter((i) => i.health === 'online').length;

  return (
    <>
      <header className="dhead">
        <div>
          <h1>Teams</h1>
          <p>Teams in this workspace and the proxies they run.</p>
        </div>
      </header>

      <div className="dstack">
        <section className="panel" aria-label="Summary">
          <div className="metrics">
            <div className="metric">
              <span className="metric__label">Teams</span>
              <span className="metric__value">{formatCount(teams.length)}</span>
            </div>
            <div className="metric">
              <span className="metric__label">Proxies online</span>
              <span className="metric__value">
                {online}
                <small className="metric__of"> / {instances.length}</small>
              </span>
            </div>
            <div className="metric">
              <span className="metric__label">Tool calls</span>
              <span className="metric__value">{formatCount(traffic.total)}</span>
            </div>
            <div className="metric">
              <span className="metric__label">Blocked</span>
              <span className="metric__value">{formatCount(traffic.blocked)}</span>
            </div>
          </div>
        </section>

        <section className="panel" aria-labelledby="team-list">
          <div className="panel__head">
            <h2 id="team-list" className="panel__title">
              Teams
            </h2>
          </div>
          <div className="panel__body panel__body--flush">
            {teams.length ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Team</th>
                    <th scope="col" className="num">
                      Members
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team) => (
                    <tr key={team.id}>
                      <td>
                        {team.name}
                        {team.description ? <span className="cell-sub">{team.description}</span> : null}
                      </td>
                      <td className="num dim">{formatCount(team.memberCount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="empty">
                <strong>No teams yet</strong>
                Create teams with the <code>/api/v1/teams</code> API.
              </p>
            )}
          </div>
        </section>

        <section className="panel" aria-labelledby="team-instances">
          <div className="panel__head">
            <h2 id="team-instances" className="panel__title">
              Proxies
            </h2>
          </div>
          <div className="panel__body panel__body--flush">
            {instances.length ? (
              <InstancesTable instances={instances} />
            ) : (
              <p className="empty">
                <strong>No proxies linked yet</strong>
              </p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
