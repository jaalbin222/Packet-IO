import Link from "next/link";
import { getDb } from "@/lib/store";

export const metadata = { title: "Sites" };

export default function SitesPage() {
  const db = getDb();
  return (
    <>
      <header className="page-head">
        <p className="eyebrow">
          <b>01</b>Discovery
        </p>
        <h1>Sites</h1>
        <p className="lede">Each site was discovered read-only from the SCADA, historian, and gateways already installed. Nothing here writes to the control network.</p>
      </header>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Site</th>
              <th>Type</th>
              <th>Model</th>
              <th>Review</th>
              <th>Gateways</th>
            </tr>
          </thead>
          <tbody>
            {db.sites.map((site) => {
              const tags = db.tags.filter((tag) => tag.siteId === site.id);
              const review = tags.filter((tag) => tag.status === "pending" || tag.status === "drift").length;
              const nodes = db.nodes.filter((node) => node.siteId === site.id);
              const online = nodes.filter((node) => node.connectivity === "online").length;
              return (
                <tr key={site.id}>
                  <td>
                    <Link href={`/sites/${site.id}`}>
                      <strong>{site.name}</strong>
                    </Link>
                    <div className="muted">{site.region}</div>
                  </td>
                  <td>
                    {site.kind}
                    <div className="muted">{site.capacity}</div>
                  </td>
                  <td className="num">v{site.modelVersion}</td>
                  <td>{review > 0 ? <span className="state state--warn">{review} waiting</span> : <span className="state state--ok">Current</span>}</td>
                  <td className="num">
                    {online}/{nodes.length}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
