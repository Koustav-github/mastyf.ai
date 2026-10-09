import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getUserOrg } from '@/lib/org-context';
import { sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';

const GRADE_COLORS: Record<string, string> = {
  'A+': 'var(--ok)', 'A': 'var(--ok)', 'B': 'var(--info)', 'C': 'var(--accent)', 'D': 'var(--warn)', 'F': 'var(--critical)',
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
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 40 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Trust Score Leaderboard</h1>
      <p style={{ color: 'var(--ink-2)', marginBottom: 32 }}>MCP package security scores scanned from the community</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {scores.map((s: any, i: number) => (
          <div key={s.package_name} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink-2)', minWidth: 28 }}>#{i + 1}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{s.package_name}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                {s.cve_count} CVEs ({s.critical_cve_count} critical) · {s.report_count} reports
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: GRADE_COLORS[s.trust_grade] || 'var(--ink-2)' }}>
              {s.trust_grade}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', minWidth: 40, textAlign: 'right' }}>
              {s.trust_score}/100
            </div>
          </div>
        ))}
        {scores.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--ink-2)', fontSize: 14 }}>
            No trust scores scanned yet.<br />
            <span style={{ fontSize: 12 }}>Submit via POST /api/v1/trust-scores or scan from your proxy dashboard.</span>
          </div>
        )}
      </div>

      <div style={{ marginTop: 32, padding: 16, background: 'var(--bg-sunken)', borderRadius: 8, fontSize: 13, color: 'var(--ink-2)' }}>
        <strong>How trust scores are computed:</strong><br />
        Eight dimensions — CVE posture, auth strength, transport security, tool risk surface, supply chain integrity, attack history, response hygiene, configuration freshness. Each scored 0-100, averaged to produce the final grade.
      </div>
    </div>
  );
}
