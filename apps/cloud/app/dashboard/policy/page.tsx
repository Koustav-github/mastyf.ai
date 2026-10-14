import { PolicyEditor } from '@/components/PolicyEditor';
import { requireDashboard } from '@/lib/dashboard-data';
import { timeAgo } from '@/lib/format';

export default async function PolicyPage() {
  const { ctx } = await requireDashboard();
  const updated = ctx.policy?.updatedAt ? timeAgo(new Date(ctx.policy.updatedAt).toISOString()) : null;

  return (
    <>
      <header className="dhead">
        <div>
          <h1>Policy</h1>
          <p>
            The rules every linked proxy enforces before a tool call runs.
            {ctx.policy ? ` Version ${ctx.policy.version}${updated ? `, updated ${updated}` : ''}.` : ''}
          </p>
        </div>
      </header>
      <PolicyEditor initialYaml={ctx.policy?.yamlContent ?? ''} />
    </>
  );
}
