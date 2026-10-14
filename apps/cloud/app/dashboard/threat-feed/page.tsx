import { requireDashboard, threatFeed } from '@/lib/dashboard-data';
import { formatCount, formatDate, timeAgo } from '@/lib/format';

export default async function ThreatFeedPage() {
  await requireDashboard();
  const { entries, categories } = await threatFeed();

  return (
    <>
      <header className="dhead">
        <div>
          <h1>Threat feed</h1>
          <p>Anonymised attack signatures reported across the community fleet, newest first.</p>
        </div>
      </header>

      <div className="dstack">
        {categories.length ? (
          <div className="chips" aria-label="Categories">
            {categories.map((c) => (
              <span key={c.category} className="chip">
                {c.category} <b>{formatCount(c.count)}</b>
              </span>
            ))}
          </div>
        ) : null}

        <section className="panel" aria-labelledby="entries">
          <div className="panel__head">
            <h2 id="entries" className="panel__title">
              Signatures
            </h2>
            <span className="panel__meta">{formatCount(entries.length)} shown</span>
          </div>
          <div className="panel__body panel__body--flush">
            {entries.length ? (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Tool pattern</th>
                      <th scope="col" className="col-opt">
                        Category
                      </th>
                      <th scope="col" className="num">
                        Reports
                      </th>
                      <th scope="col" className="num">
                        Last seen
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e.signatureHash}>
                        <td>
                          <code>{e.toolPattern}</code>
                          {e.blockReason ? <span className="cell-sub">{e.blockReason}</span> : null}
                        </td>
                        <td className="dim col-opt">{e.category}</td>
                        <td className="num">{formatCount(e.reportCount)}</td>
                        <td className="num dim" title={formatDate(e.lastSeen) ?? undefined}>
                          {timeAgo(e.lastSeen) ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty">
                <strong>No signatures recorded yet</strong>
                Entries appear as proxies contribute blocked-call signatures.
              </p>
            )}
          </div>
        </section>

        <section className="panel" aria-labelledby="subscribe">
          <div className="panel__head">
            <h2 id="subscribe" className="panel__title">
              Use the feed in your proxy
            </h2>
          </div>
          <div className="panel__body">
            <p className="panel__text">
              Set <code>MASTYF_AI_THREAT_FEED_URL</code> on your self-hosted proxy to pull these signatures into its
              local regression cache.
            </p>
            <pre className="envblock">GET /api/v1/threat-feed?action=entries</pre>
          </div>
        </section>
      </div>
    </>
  );
}
