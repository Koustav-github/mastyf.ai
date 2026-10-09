import { CAPABILITY_MATRIX } from '@/components/landing/stats';

/** How Mastyf's architecture compares with publicly documented alternatives. */
export function CompareTable() {
  return (
    <>
      <div className="table-scroll">
        <table className="data-table compare">
          <thead>
            <tr>
              <th scope="col">Capability</th>
              <th scope="col" className="compare__us">
                Mastyf
              </th>
              <th scope="col">Microsoft Agent Toolkit</th>
              <th scope="col">Noma Security</th>
              <th scope="col">Obsidian</th>
              <th scope="col">Nightfall</th>
            </tr>
          </thead>
          <tbody>
            {CAPABILITY_MATRIX.map((row) => (
              <tr key={row.feature}>
                <th scope="row">{row.feature}</th>
                <td className="compare__us">{row.mastyf}</td>
                <td className="dim">{row.microsoft}</td>
                <td className="dim">{row.noma}</td>
                <td className="dim">{row.obsidian}</td>
                <td className="dim">{row.nightfall}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="doc-note">
        Based on publicly documented product architectures as of 2026, including Microsoft Agent Governance Toolkit,
        Noma, Obsidian Security, and Nightfall MCP Gateway.
      </p>
    </>
  );
}
