import { auth } from '@/lib/auth';
import { getUserOrg } from '@/lib/org-context';
import { PolicyEditor } from '@/components/PolicyEditor';
import { redirect } from 'next/navigation';
import { ShieldCheck, FileCode, CheckCircle2 } from 'lucide-react';

export default async function PolicyPage() {
  const session = await auth();
  const ctx = await getUserOrg(session!.user!.id);
  if (!ctx) redirect('/login');

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="pb-6 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Policy as Code Editor
          </h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-bold">
            Live Enforced
          </span>
        </div>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Declarative YAML policy for tool execution boundaries, capability envelopes, and parameter invariants.
        </p>
      </div>

      {/* Policy Editor Container */}
      <div className="rounded-2xl bg-slate-950/80 border border-white/[0.08] backdrop-blur-xl p-6 shadow-2xl">
        <PolicyEditor initialYaml={ctx.policy?.yamlContent ?? ''} />
      </div>

    </div>
  );
}
