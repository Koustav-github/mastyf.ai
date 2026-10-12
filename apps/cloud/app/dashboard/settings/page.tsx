import { auth } from '@/lib/auth';
import { getUserOrg } from '@/lib/org-context';
import { SettingsClient } from '@/components/SettingsClient';
import { signOutAction } from '@/app/actions';
import { redirect } from 'next/navigation';
import { Settings, User, LogOut, Key } from 'lucide-react';

export default async function SettingsPage() {
  const session = await auth();
  const ctx = await getUserOrg(session!.user!.id);
  if (!ctx) redirect('/login');

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="pb-6 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Settings className="w-4 h-4" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Settings & API Keys
          </h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-slate-400 border border-white/[0.08] uppercase font-bold">
            Organization Config
          </span>
        </div>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Manage your organization name, rotate cloud API keys, and configure access tokens.
        </p>
      </div>

      {/* Main Settings Client */}
      <div className="space-y-6">
        <SettingsClient orgName={ctx.org.name} />

        {/* Account Info Card */}
        <div className="p-6 rounded-2xl bg-slate-950/70 border border-white/[0.08] backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <User className="w-4 h-4 text-amber-400" />
              Authenticated User Account
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Signed in as: <span className="text-slate-200 font-semibold">{session?.user?.email}</span>
            </p>
          </div>

          <form action={signOutAction}>
            <button 
              type="submit" 
              className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-colors flex items-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}
