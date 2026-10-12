import { DashboardNav } from '@/components/DashboardNav';
import { auth } from '@/lib/auth';
import { getUserOrg } from '@/lib/org-context';
import { provisionFreeOrganization } from '@/lib/provision';
import { ensureAuthUser } from '@/lib/ensure-auth-user';
import { signOutAction } from '@/app/actions';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ShieldCheck, LogOut, Bell, Terminal, User } from 'lucide-react';
import './dashboard.css';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  let ctx = await getUserOrg(session.user.id);
  if (!ctx) {
    const email =
      session.user.email?.trim()
      || `${session.user.id}@oauth.mastyf-ai.local`;
    try {
      await ensureAuthUser({
        id: session.user.id,
        email,
        name: session.user.name,
      });
      await provisionFreeOrganization({
        userId: session.user.id,
        email,
        name: session.user.name,
      });
      ctx = await getUserOrg(session.user.id);
    } catch (err) {
      console.error('[dashboard] provision failed', err);
      return (
        <main className="min-h-screen bg-[#030509] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full p-8 rounded-2xl bg-slate-950 border border-white/[0.08] shadow-2xl">
            <h1 className="text-xl font-bold text-white mb-2">Setup Required</h1>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Your account is signed in, but organization provisioning requires database connectivity.
            </p>
            <pre className="p-3 rounded-lg bg-black text-rose-400 text-xs font-mono mb-6 overflow-x-auto">
              {err instanceof Error ? err.message : String(err)}
            </pre>
            <Link 
              href="/login" 
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center"
            >
              Back to Sign In
            </Link>
          </div>
        </main>
      );
    }
  }

  if (!ctx) {
    redirect('/login?error=ProvisionFailed');
  }

  return (
    <div className="min-h-screen bg-[#030509] text-slate-100 flex flex-col lg:flex-row antialiased">
      {/* Sidebar Navigation */}
      <DashboardNav orgName={ctx.org.name} orgSlug={ctx.org.slug} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header Bar */}
        <header className="h-16 px-6 md:px-8 border-b border-white/[0.08] bg-slate-950/60 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-medium text-slate-400">
              Fleet: <span className="text-white font-semibold">{ctx.org.name}</span>
            </span>
            <span className="hidden sm:inline text-slate-600">/</span>
            <span className="hidden sm:inline text-xs font-mono text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Gateway Synced
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-white/[0.04]">
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span className="truncate max-w-[180px]">{session.user.email}</span>
            </div>

            <form action={signOutAction}>
              <button 
                type="submit" 
                className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors border border-white/[0.06] flex items-center gap-1.5 text-xs font-medium"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto">
          {children}
        </main>

      </div>
    </div>
  );
}
