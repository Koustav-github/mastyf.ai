import { auth } from '@/lib/auth';
import { getUserOrg } from '@/lib/org-context';
import { CLOUD_NAME, SITE_NAME } from '@/lib/product-links';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Terminal, 
  Server, 
  Key, 
  Award, 
  ArrowRight, 
  Copy, 
  CheckCircle2, 
  Lock, 
  Activity, 
  FileCode,
  Zap
} from 'lucide-react';

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? 'http://localhost:3001').replace(
    /\/$/,
    '',
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const ctx = await getUserOrg(session!.user!.id);
  if (!ctx) return null;

  const envBlock = `# ${SITE_NAME} Cloud — your tenant configuration
MASTYF_AI_TENANT_ID=${ctx.org.slug}
MASTYF_AI_CONTROL_PLANE_URL=${appUrl()}
# Create or rotate in Settings → API keys:
MASTYF_AI_CLOUD_API_KEY=<your-api-key>

# Pull policy from ${SITE_NAME} Cloud:
# curl -H "Authorization: Bearer <api-key>" ${appUrl()}/api/v1/policy
`;

  return (
    <div className="space-y-8">
      
      {/* Overview Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
              {ctx.org.name}
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase">
              Tenant Active
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            {CLOUD_NAME} · Tenant Slug: <span className="text-slate-200">{ctx.org.slug}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/policy"
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Edit Policy</span>
          </Link>

          <Link
            href="/dashboard/connect"
            className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-semibold border border-white/[0.08] transition-colors flex items-center gap-1.5"
          >
            <Server className="w-3.5 h-3.5 text-slate-400" />
            <span>Link Proxy</span>
          </Link>
        </div>
      </div>

      {/* 4 Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-950/70 border border-white/[0.08] backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
            <span>Enforcement Mode</span>
            <Lock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 font-mono">Fail-Closed</div>
          <span className="text-[11px] text-slate-500 block mt-1">0 backend bytes on non-ALLOW</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950/70 border border-white/[0.08] backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
            <span>Fast-Path Latency</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400 font-mono">17.3 µs</div>
          <span className="text-[11px] text-slate-500 block mt-1">P50 deterministic fast-path</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950/70 border border-white/[0.08] backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
            <span>Audit Integrity</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">Ed25519</div>
          <span className="text-[11px] text-slate-500 block mt-1">Cryptographic execution receipts</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950/70 border border-white/[0.08] backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
            <span>Neural Auditor</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-purple-300 font-mono">V6 Frozen</div>
          <span className="text-[11px] text-slate-500 block mt-1">Boundary-sharpened 1.5B model</span>
        </div>
      </div>

      {/* Tenant Setup & Environment Variables Card */}
      <div className="p-6 md:p-8 rounded-2xl bg-slate-950/80 border border-white/[0.08] backdrop-blur-xl shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Tenant Environment Configuration</h2>
              <p className="text-xs text-slate-400 font-mono">
                Connect your local coding agents or Kubernetes sidecars to this organization
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/settings"
            className="text-xs font-mono text-amber-400 hover:underline flex items-center gap-1"
          >
            <span>Manage API Keys</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <pre className="p-4 rounded-xl bg-black/80 border border-white/[0.06] text-slate-200 text-xs font-mono overflow-x-auto leading-relaxed mb-6">
          <code>{envBlock}</code>
        </pre>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/policy"
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Configure Policy YAML</span>
          </Link>

          <Link
            href="/dashboard/settings"
            className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 text-xs font-semibold border border-white/[0.08] transition-colors flex items-center gap-1.5"
          >
            <Key className="w-3.5 h-3.5 text-slate-400" />
            <span>Generate Cloud API Key</span>
          </Link>

          <Link
            href="/certified"
            className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 text-xs font-semibold border border-white/[0.08] transition-colors flex items-center gap-1.5"
          >
            <Award className="w-3.5 h-3.5 text-cyan-400" />
            <span>Public MCP Security Scores</span>
          </Link>
        </div>
      </div>

      {/* Quick Navigation Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Policy & Enforcement */}
        <div className="p-6 rounded-2xl bg-slate-950/70 border border-white/[0.08] flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Policy as Code
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Declarative YAML policy engine with live hot-reload, capability scoping, and path containment envelopes.
            </p>
            <ul className="space-y-2 text-xs text-slate-300 font-mono">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Audit → Warn → Block phased rollout</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Four relational invariants active</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 mt-6 border-t border-white/[0.06]">
            <Link
              href="/dashboard/policy"
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              <span>Open Policy Editor</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Fleet & Sidecar Sync */}
        <div className="p-6 rounded-2xl bg-slate-950/70 border border-white/[0.08] flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              Fleet & Self-Hosted Sidecars
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Manage distributed agent sidecars across Kubernetes, Docker, and developer desktops in real time.
            </p>
            <ul className="space-y-2 text-xs text-slate-300 font-mono">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>Multi-cluster instance discovery</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span>Real-time telemetry and health monitoring</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 mt-6 border-t border-white/[0.06]">
            <Link
              href="/dashboard/fleet"
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>View Fleet Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
