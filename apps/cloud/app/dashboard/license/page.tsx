import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getUserOrg } from '@/lib/org-context';
import { sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { KeyRound, Shield, Check, ArrowRight, Zap, Building } from 'lucide-react';

export default async function LicensePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const ctx = await getUserOrg(session.user.id);
  if (!ctx) redirect('/post-login');
  const db = getDb();

  const licResult: any = await db.execute(sql`
    SELECT * FROM licenses WHERE org_id = ${ctx.org.id} AND revoked_at IS NULL
    ORDER BY activated_at DESC LIMIT 1
  `);
  const lic = ((licResult?.rows || licResult || [])[0]) || {};

  const tier = (lic.tier || 'free').toLowerCase();
  const tiers = [
    { 
      id: 'free', 
      name: 'Community (Free)', 
      price: '$0',
      instances: '1 instance', 
      teams: 'Single team', 
      users: '1 user', 
      features: 'Policy Engine, Local Audit Logs, AGPL-3.0 Self-Hosted Runtime' 
    },
    { 
      id: 'pro', 
      name: 'Developer Pro', 
      price: '$49/mo',
      instances: '5 instances', 
      teams: '3 teams', 
      users: '10 users', 
      features: 'Mastyf Shield Desktop (macOS / Linux), Hardware Reference Monitor (<4.8µs)' 
    },
    { 
      id: 'team', 
      name: 'Team Pass', 
      price: '$499/mo',
      instances: '25 instances', 
      teams: '10 teams', 
      users: '50 users', 
      features: 'Cloud Control Plane, Mastyf Swarm CI/CD, Threat Lab Mutation Queue' 
    },
    { 
      id: 'enterprise', 
      name: 'Enterprise Fleet', 
      price: 'Custom',
      instances: 'Unlimited', 
      teams: 'Unlimited', 
      users: 'Unlimited', 
      features: 'Full On-Premises Air-Gapped Deployment, Domain-Fine-Tuned Guard Weights, Custom SLA' 
    },
  ];

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="pb-6 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <KeyRound className="w-4 h-4" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Commercial Licensing
          </h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase font-bold">
            Fleet Tier
          </span>
        </div>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Manage your organization's subscription tier, active instances, and runtime capability licenses.
        </p>
      </div>

      {/* Active License Banner */}
      <div className="p-6 md:p-8 rounded-2xl bg-slate-950/80 border border-white/[0.08] backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-mono text-slate-400 block mb-1">Current Active Plan:</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono uppercase tracking-tight flex items-center gap-3">
            <span>{tier}</span>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold lowercase">
              active
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs font-mono text-slate-400">
            {lic.activated_at && (
              <span>Activated: {new Date(lic.activated_at).toLocaleDateString()}</span>
            )}
            {lic.expires_at ? (
              <span>Expires: {new Date(lic.expires_at).toLocaleDateString()}</span>
            ) : (
              <span>Term: Never Expires (Community Free Tier)</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/pilot"
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-md shadow-amber-500/20 flex items-center gap-2"
          >
            <span>Upgrade Fleet License</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Plan Comparison Grid */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Available Fleet Tiers</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tiers.map((t) => {
            const isCurrent = tier === t.id;
            return (
              <div
                key={t.id}
                className={`p-5 rounded-2xl flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'bg-slate-900/90 border-2 border-amber-500 shadow-xl shadow-amber-500/10'
                    : 'bg-slate-950/70 border border-white/[0.08] hover:border-white/[0.14]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white">{t.name}</span>
                    {isCurrent && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold uppercase">
                        Current
                      </span>
                    )}
                  </div>

                  <div className="text-lg font-bold text-amber-400 font-mono mb-4">{t.price}</div>

                  <div className="space-y-1.5 text-xs text-slate-300 font-mono mb-4">
                    <div>• {t.instances}</div>
                    <div>• {t.teams}</div>
                    <div>• {t.users}</div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed border-t border-white/[0.06] pt-3">
                    {t.features}
                  </p>
                </div>

                <div className="mt-6">
                  {isCurrent ? (
                    <div className="w-full py-2 rounded-xl bg-white/[0.04] text-center text-xs font-mono text-slate-400 border border-white/[0.06]">
                      Active Subscription
                    </div>
                  ) : (
                    <Link
                      href="/pilot"
                      className="w-full py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-center text-xs font-semibold text-white border border-white/[0.08] transition-colors block"
                    >
                      Select Plan
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
