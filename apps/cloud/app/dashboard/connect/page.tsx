import { GitHubGettingStarted } from '@/components/GitHubGettingStarted';
import { LaunchDashboard } from '@/components/LaunchDashboard';
import { auth } from '@/lib/auth';
import { getUserOrg } from '@/lib/org-context';
import { CLOUD_NAME, SITE_NAME } from '@/lib/product-links';
import Link from 'next/link';
import { Link2, ArrowLeft, Terminal, Server, Shield } from 'lucide-react';

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? 'http://localhost:3001').replace(
    /\/$/,
    '',
  );
}

export default async function ConnectMastyfAiPage() {
  const session = await auth();
  const ctx = await getUserOrg(session!.user!.id);
  if (!ctx) return null;

  const envBlock = `# Link a self-hosted proxy to ${SITE_NAME} Cloud (for policy sync & fleet telemetry)
MASTYF_AI_MULTI_TENANT_ENABLED=true
MASTYF_AI_TENANT_ID=${ctx.org.slug}
MASTYF_AI_CONTROL_PLANE_URL=${appUrl()}
# Same value as AUTH_SECRET in ${SITE_NAME} Cloud:
MASTYF_AI_CLOUD_JWT_SECRET=<paste-cloud-AUTH_SECRET>
DASHBOARD_JWT_SECRET=<same-as-MASTYF_AI_CLOUD_JWT_SECRET>
`;

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="pb-6 border-b border-white/[0.08]">
        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Overview</span>
        </Link>
        
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Link2 className="w-4 h-4" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Connect Self-Hosted Proxy
          </h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase font-bold">
            Sidecar Sync
          </span>
        </div>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Synchronize policy and stream telemetry between local agent proxies and your cloud control plane.
        </p>
      </div>

      {/* Configuration Card */}
      <div className="p-6 md:p-8 rounded-2xl bg-slate-950/80 border border-white/[0.08] backdrop-blur-xl shadow-2xl space-y-4">
        <div className="flex items-center gap-2.5">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h2 className="text-base font-bold text-white">Proxy Environment Variables</h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Configure these environment variables on your Kubernetes sidecar or Docker host. The proxy will automatically register with this tenant and download active YAML policies on boot.
        </p>
        <pre className="p-4 rounded-xl bg-black/80 border border-white/[0.06] text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
          <code>{envBlock}</code>
        </pre>
      </div>

      {/* Integration components */}
      <div className="space-y-6">
        <LaunchDashboard />
        <GitHubGettingStarted />
      </div>

    </div>
  );
}
