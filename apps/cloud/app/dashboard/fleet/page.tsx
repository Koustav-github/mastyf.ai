import { LaunchDashboard } from '@/components/LaunchDashboard';
import RugPullSection from '@/components/RugPullSection';
import AutoCorpusControlPanel from '@/components/AutoCorpusControlPanel';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getUserOrg } from '@/lib/org-context';
import { queryFleetThreatGraph } from '@/lib/fleet-threat-graph';
import { sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { Server, Activity, ShieldAlert, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default async function FleetPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const ctx = await getUserOrg(session.user.id);
  if (!ctx) redirect('/post-login');

  const db = getDb();

  const result: any = await db.execute(sql`
    SELECT instance_id, instance_name, region, version, hostname, status,
           metrics_snapshot, last_heartbeat
    FROM mastyf_ai_fleet_instances
    WHERE org_id = ${ctx.org.id}
    ORDER BY last_heartbeat DESC LIMIT 200
  `);
  const instances = (result?.rows || []) as any[];

  const auditResult: any = await db.execute(sql`
    SELECT coalesce(sum(total_requests),0)::int as total,
           coalesce(sum(blocked_requests),0)::int as blocked,
           coalesce(sum(allowed_requests),0)::int as "allowed",
           coalesce(sum(flagged_requests),0)::int as flagged,
           count(*)::int as periods
    FROM fleet_audit_aggregates WHERE org_id = ${ctx.org.id}
  `);
  const audit = ((auditResult?.rows || [])[0]) || { total: 0, blocked: 0, allowed: 0, flagged: 0, periods: 0 };

  const policyResult: any = await db.execute(sql`
    SELECT version, published_at FROM policy_versions
    WHERE org_id = ${ctx.org.id} ORDER BY version DESC LIMIT 5
  `);
  const policyVersions = (policyResult?.rows || []) as any[];

  let threatGraph: any = null;
  try { threatGraph = await queryFleetThreatGraph(ctx.org.id, 24); } catch {}

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="pb-6 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Server className="w-4 h-4" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Fleet Hub & Instances
          </h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase font-bold">
            {instances.length} Registered
          </span>
        </div>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Self-hosted proxy sidecars registered via cryptographic heartbeat across distributed Kubernetes and Docker clusters.
        </p>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-950/70 border border-white/[0.08] backdrop-blur-xl">
          <div className="text-xs font-mono text-slate-400 mb-1">Total Requests</div>
          <div className="text-2xl font-bold text-white font-mono">{audit.total}</div>
          <span className="text-[10px] text-slate-500 font-mono">Cumulative traffic</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950/70 border border-white/[0.08] backdrop-blur-xl">
          <div className="text-xs font-mono text-slate-400 mb-1">Blocked Attacks</div>
          <div className="text-2xl font-bold text-rose-400 font-mono">{audit.blocked}</div>
          <span className="text-[10px] text-rose-400/80 font-mono">0 backend bytes</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950/70 border border-white/[0.08] backdrop-blur-xl">
          <div className="text-xs font-mono text-slate-400 mb-1">Allowed Calls</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{audit.allowed}</div>
          <span className="text-[10px] text-emerald-400/80 font-mono">Valid capability scope</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950/70 border border-white/[0.08] backdrop-blur-xl">
          <div className="text-xs font-mono text-slate-400 mb-1">Audit Periods</div>
          <div className="text-2xl font-bold text-cyan-400 font-mono">{audit.periods}</div>
          <span className="text-[10px] text-slate-500 font-mono">Verified sync cycles</span>
        </div>
      </div>

      {/* Instances Table */}
      <div className="rounded-2xl bg-slate-950/80 border border-white/[0.08] overflow-hidden shadow-2xl">
        <div className="px-6 py-4 bg-slate-900/60 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="text-sm font-bold text-white font-mono flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            Registered Sidecar Instances
          </h2>
          <span className="text-xs font-mono text-slate-400">{instances.length} active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/[0.06] text-slate-400 bg-slate-950/40">
                <th className="py-3 px-6">Instance</th>
                <th className="py-3 px-4">Region</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Version</th>
                <th className="py-3 px-6 text-right">Last Heartbeat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-slate-300">
              {instances.map((i) => (
                <tr key={i.instance_id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-6">
                    <strong className="text-white block font-sans">{i.instance_name || i.instance_id}</strong>
                    <span className="text-[11px] text-slate-500">{i.hostname}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{i.region || '—'}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {i.status || 'ONLINE'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{i.version || 'v2.2'}</td>
                  <td className="py-3 px-6 text-right text-slate-400">
                    {new Date(i.last_heartbeat).toLocaleString()}
                  </td>
                </tr>
              ))}
              {instances.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No instances registered yet. Configure <code className="text-amber-300">MASTYF_AI_CLOUD_API_KEY</code> and <code className="text-amber-300">MASTYF_AI_CONTROL_PLANE_URL</code> on your proxy host.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Policy Versions Table */}
      {policyVersions.length > 0 && (
        <div className="rounded-2xl bg-slate-950/80 border border-white/[0.08] overflow-hidden shadow-2xl">
          <div className="px-6 py-4 bg-slate-900/60 border-b border-white/[0.06]">
            <h2 className="text-sm font-bold text-white font-mono">Published Policy History</h2>
          </div>
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/[0.06] text-slate-400">
                <th className="py-3 px-6">Version</th>
                <th className="py-3 px-6 text-right">Published Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-slate-300">
              {policyVersions.map((pv: any) => (
                <tr key={pv.version} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-6 text-amber-400 font-bold">v{pv.version}</td>
                  <td className="py-3 px-6 text-right text-slate-400">{new Date(pv.published_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Rug-Pull Detection & Auto-Corpus Control Panels */}
      <div className="space-y-6 pt-4">
        <RugPullSection />
        <AutoCorpusControlPanel />
      </div>

      <LaunchDashboard />
    </div>
  );
}
