import type { FleetInstance, InstanceHealth } from '@/lib/dashboard-data';
import { formatDateTime, timeAgo } from '@/lib/format';

const HEALTH_LABEL: Record<InstanceHealth, string> = {
  online: 'Online',
  delayed: 'Delayed',
  offline: 'Offline',
};

export function Health({ health }: { health: InstanceHealth }) {
  return <span className={`health health--${health}`}>{HEALTH_LABEL[health]}</span>;
}

/** Linked proxies, newest heartbeat first, with health worked out from that heartbeat. */
export function InstancesTable({ instances }: { instances: FleetInstance[] }) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Instance</th>
            <th scope="col" className="col-opt">
              Region
            </th>
            <th scope="col" className="col-opt">
              Version
            </th>
            <th scope="col">Health</th>
            <th scope="col" className="num">
              Last heartbeat
            </th>
          </tr>
        </thead>
        <tbody>
          {instances.map((i) => (
            <tr key={i.instanceId}>
              <td>
                {i.name}
                {i.hostname ? <span className="cell-sub">{i.hostname}</span> : null}
              </td>
              <td className="dim col-opt">{i.region || '—'}</td>
              <td className="dim col-opt">{i.version || '—'}</td>
              <td>
                <Health health={i.health} />
              </td>
              <td className="num dim" title={formatDateTime(i.lastHeartbeat) ?? undefined}>
                {timeAgo(i.lastHeartbeat) ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
