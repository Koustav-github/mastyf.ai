import { GitHubGettingStarted } from '@/components/GitHubGettingStarted';
import { LaunchDashboard } from '@/components/LaunchDashboard';
import { requireDashboard } from '@/lib/dashboard-data';
import { SITE_NAME } from '@/lib/product-links';

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? 'http://localhost:3001').replace(/\/$/, '');
}

export default async function ConnectMastyfAiPage() {
  const { ctx } = await requireDashboard();

  const envBlock = `# Link a self-hosted proxy to ${SITE_NAME} Cloud (for policy sync & fleet telemetry)
MASTYF_AI_MULTI_TENANT_ENABLED=true
MASTYF_AI_TENANT_ID=${ctx.org.slug}
MASTYF_AI_CONTROL_PLANE_URL=${appUrl()}
# This workspace's API key: create one under Settings → API key.
MASTYF_AI_CLOUD_API_KEY=<your-workspace-api-key>
# A random secret of this host's own, for its dashboard sessions: openssl rand -base64 32
DASHBOARD_JWT_SECRET=<random-secret-for-this-host>
`;

  return (
    <>
      <header className="dhead">
        <div>
          <h1>Link a proxy</h1>
          <p>Connect a self-hosted proxy so it syncs this workspace&rsquo;s policy and reports its traffic here.</p>
        </div>
      </header>

      <div className="dstack">
        <section className="panel" aria-labelledby="env">
          <div className="panel__head">
            <h2 id="env" className="panel__title">
              Environment variables
            </h2>
          </div>
          <div className="panel__body">
            <p className="panel__text">
              Set these on the host or Kubernetes sidecar running the proxy. On start it registers with this workspace
              and downloads the current policy.
            </p>
            <pre className="envblock">{envBlock}</pre>
            <p className="notice notice--warn" style={{ marginTop: 'var(--s-3)' }}>
              The proxy only ever needs this workspace&rsquo;s API key. Never give a proxy {SITE_NAME} Cloud&rsquo;s own
              secrets (<code>AUTH_SECRET</code>, <code>LICENSE_JWT_SECRET</code>): they would let it sign in as anyone.
              If an older setup used <code>MASTYF_AI_CLOUD_JWT_SECRET</code>, remove it.
            </p>
          </div>
        </section>

        <LaunchDashboard />
        <GitHubGettingStarted />
      </div>
    </>
  );
}
