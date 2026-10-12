import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getUserOrg } from '@/lib/org-context';
import { sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { Award, ShieldCheck, AlertTriangle, Layers, Info } from 'lucide-react';

const GRADE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'A+': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  'A': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  'B': { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  'C': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  'D': { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  'F': { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
};

export default async function TrustScoresPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const ctx = await getUserOrg(session.user.id);
  if (!ctx) redirect('/post-login');

  const result: any = await getDb().execute(sql`
    SELECT * FROM public_trust_scores ORDER BY trust_score DESC LIMIT 100
  `);
  const scores = (result?.rows || []) as any[];

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="pb-6 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Award className="w-4 h-4" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Trust Score Leaderboard
          </h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase font-bold">
            MCP Intelligence
          </span>
        </div>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Scanned security scores for Model Context Protocol servers and npm packages based on 8 security dimensions.
        </p>
      </div>

      {/* Leaderboard Cards List */}
      <div className="rounded-2xl bg-slate-950/80 border border-white/[0.08] overflow-hidden shadow-2xl">
        <div className="px-5 py-3.5 bg-slate-900/60 border-b border-white/[0.06] flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Rank & Package Identification</span>
          <span>Security Grade & Trust Score</span>
        </div>

        <div className="divide-y divide-white/[0.04] max-h-[550px] overflow-y-auto font-mono text-xs">
          {scores.map((s: any, i: number) => {
            const style = GRADE_STYLES[s.trust_grade] || { bg: 'bg-slate-800', text: 'text-slate-400', border: 'border-white/10' };
            return (
              <div 
                key={s.package_name} 
                className="p-4 hover:bg-white/[0.02] transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-slate-500 min-w-[24px]">#{i + 1}</span>
                  <div>
                    <div className="font-bold text-white text-sm tracking-tight mb-0.5">{s.package_name}</div>
                    <div className="text-[11px] text-slate-400">
                      {s.cve_count} CVEs ({s.critical_cve_count} critical) · {s.report_count} telemetry reports
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-lg ${style.bg} ${style.text} ${style.border}`}>
                    {s.trust_grade}
                  </div>
                  <div className="text-right min-w-[50px]">
                    <div className="font-bold text-white text-sm">{s.trust_score}/100</div>
                    <div className="text-[10px] text-slate-500">Trust Score</div>
                  </div>
                </div>
              </div>
            );
          })}

          {scores.length === 0 && (
            <div className="text-center py-16 text-slate-500 text-xs font-mono">
              No trust scores scanned yet in this environment.
              <span className="block mt-1 text-[11px] text-slate-600">Scan any MCP server via CLI: npx @mastyf/cli check &lt;package-name&gt;</span>
            </div>
          )}
        </div>
      </div>

      {/* Methodology Card */}
      <div className="p-6 rounded-2xl bg-slate-950/60 border border-white/[0.08] backdrop-blur-xl space-y-2">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5 text-amber-400">
          <Info className="w-3.5 h-3.5" />
          Scoring Methodology
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Scores evaluate eight distinct dimensions: CVE vulnerability posture, authentication strength, transport wire security, tool risk blast radius, software supply-chain integrity, verified attack history, response hygiene, and configuration freshness.
        </p>
      </div>

    </div>
  );
}
