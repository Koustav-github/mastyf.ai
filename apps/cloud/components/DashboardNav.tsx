'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShieldCheck, 
  Server, 
  Users, 
  Flame, 
  Award, 
  KeyRound, 
  Settings, 
  Link2, 
  Shield, 
  ExternalLink,
  ChevronRight,
  Activity
} from 'lucide-react';
import { CLOUD_NAME } from '@/lib/product-links';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/policy', label: 'Policy Engine', icon: ShieldCheck },
  { href: '/dashboard/fleet', label: 'Fleet Hub', icon: Server },
  { href: '/dashboard/teams', label: 'Teams & RBAC', icon: Users },
  { href: '/dashboard/threat-feed', label: 'Threat Feed', icon: Flame },
  { href: '/dashboard/trust-scores', label: 'Trust Scores', icon: Award },
  { href: '/dashboard/license', label: 'Commercial License', icon: KeyRound },
  { href: '/dashboard/settings', label: 'Settings & API Keys', icon: Settings },
  { href: '/dashboard/connect', label: 'Link Proxy', icon: Link2 },
];

export function DashboardNav({ orgName, orgSlug }: { orgName?: string; orgSlug?: string }) {
  const pathname = usePathname();

  return (
    <aside className="w-full lg:w-64 bg-slate-950 border-b lg:border-b-0 lg:border-r border-white/[0.08] flex flex-col justify-between shrink-0">
      <div>
        {/* Brand / Organization Header */}
        <div className="p-5 border-b border-white/[0.08]">
          <Link href="/dashboard" className="flex items-center gap-2.5 mb-3 group">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/20 transition-colors">
              <Shield className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <span className="text-sm font-extrabold text-white font-mono tracking-tight block">
                mastyf<span className="text-amber-400">.ai</span> <span className="text-slate-400 font-normal text-xs">Cloud</span>
              </span>
            </div>
          </Link>

          {/* Org details pill */}
          <div className="p-2 rounded-lg bg-slate-900/80 border border-white/[0.04] flex items-center justify-between">
            <div className="truncate pr-2">
              <span className="text-xs font-semibold text-white truncate block">{orgName || 'Primary Org'}</span>
              <span className="text-[10px] text-slate-500 font-mono block">slug: {orgSlug || 'default'}</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" title="Active Organization" />
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-slate-950" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info in Sidebar */}
      <div className="p-4 border-t border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>Control Plane:</span>
          <span className="text-emerald-400 font-semibold">v2.2 ACTIVE</span>
        </div>

        <Link
          href="/"
          className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 text-[11px] text-slate-400 hover:text-white transition-colors border border-white/[0.04]"
        >
          <span>Return to Homepage</span>
          <ExternalLink className="w-3 h-3 text-slate-500" />
        </Link>
      </div>
    </aside>
  );
}
