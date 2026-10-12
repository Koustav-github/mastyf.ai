import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getUserOrg } from '@/lib/org-context';
import { sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Flame, ShieldAlert, Radio, Terminal, Calendar, Activity, Check } from 'lucide-react';

export default async function ThreatFeedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const ctx = await getUserOrg(session.user.id);
  if (!ctx) redirect('/post-login');

  const result: any = await getDb().execute(sql`
    SELECT * FROM public_threat_feed_entries
    ORDER BY last_seen DESC LIMIT 200
  `);
  const entries = (result?.rows || []) as any[];

  const catResult: any = await getDb().execute(sql`
    SELECT category, count(*)::int as count FROM public_threat_feed_entries
    GROUP BY category ORDER BY count DESC
  `);
  const categories = (catResult?.rows || []) as any[];

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="pb-6 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Flame className="w-4 h-4" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Community Threat Feed
          </h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase font-bold">
            Live Stream
          </span>
        </div>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Anonymized MCP attack signatures & evasion probes harvested across the distributed fleet.
        </p>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-mono text-slate-500 mr-2">Categories:</span>
        {categories.map((c: any) => (
          <span 
            key={c.category} 
            className="px-3 py-1 rounded-lg bg-slate-900 border border-white/[0.06] text-xs font-mono text-cyan-300 font-medium flex items-center gap-1.5"
          >
            <span>{c.category}</span>
            <span className="text-[10px] text-slate-500 bg-white/[0.04] px-1.5 py-0.5 rounded">
              {c.count}
            </span>
          </span>
        ))}
        {categories.length === 0 && (
          <span className="text-xs text-slate-500 font-mono">No category filters available.</span>
        )}
      </div>

      {/* Entries List */}
      <div className="rounded-2xl bg-slate-950/80 border border-white/[0.08] overflow-hidden shadow-2xl">
        <div className="px-5 py-3.5 bg-slate-900/60 border-b border-white/[0.06] flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Tool Pattern & Interception Reason</span>
          <span>Category · Reports · Last Seen</span>
        </div>

        <div className="divide-y divide-white/[0.04] max-h-[500px] overflow-y-auto font-mono text-xs">
          {entries.map((e: any) => (
            <div 
              key={e.signature_hash} 
              className="p-4 hover:bg-white/[0.02] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="font-bold text-white mb-0.5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span>{e.tool_pattern}</span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  {e.block_reason || e.category}
                </div>
              </div>

              <div className="flex items-center gap-3 text-[11px]">
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                  {e.category}
                </span>
                <span className="text-slate-400">{e.report_count} reports</span>
                <span className="text-slate-500 text-[10px]">
                  {new Date(e.last_seen).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}

          {entries.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-xs font-mono">
              No public threat feed entries currently recorded. Subscribe your proxy to feed signatures.
            </div>
          )}
        </div>
      </div>

      {/* Proxy Subscription Documentation Card */}
      <div className="p-6 rounded-2xl bg-slate-950/60 border border-white/[0.08] backdrop-blur-xl space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
          <Radio className="w-4 h-4 text-cyan-400" />
          Automated Threat Feed Subscription
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Set <code className="text-amber-300">MASTYF_AI_THREAT_FEED_URL</code> in your self-hosted proxy environment to automatically stream and ingest live community block signatures into your local regression cache.
        </p>
        <div className="p-3 rounded-lg bg-black/80 border border-white/[0.04] text-xs font-mono text-slate-300">
          <span className="text-slate-500">API Endpoint: </span>
          <span className="text-emerald-400">GET /api/v1/threat-feed?action=entries</span>
        </div>
      </div>

    </div>
  );
}
