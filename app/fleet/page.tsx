import Link from "next/link";
import { certTone, formatDay } from "@/lib/format";
import { getDb } from "@/lib/store";

export const metadata = { title: "Fleet" };

export default function FleetPage() {
  const db = getDb();
  return (
    <>
      <header className="page-head">
        <p className="eyebrow">
          <b>Module 03</b>Node registry
        </p>
        <h1>What is running where.</h1>
        <p className="lede">
          Every gateway reports identity, connectivity, and the versions of runtime, model, and certificates. Offline nodes keep their last record.
        </p>
      </header>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Gateway</th>
              <th>Site</th>
              <th>Link</th>
              <th>Runtime</th>
              <th>Model</th>
              <th>Certificate</th>
              <th>Apps</th>
            </tr>
          </thead>
          <tbody>
            {db.nodes.map((node) => {
              const site = db.sites.find((item) => item.id === node.siteId);
              const behind = site && site.modelVersion !== node.modelVersion;
              const cert = certTone(node.certExpires);
              return (
                <tr key={node.id}>
                  <td>
                    <Link href={`/fleet/${node.id}`}>
                      <strong>{node.name}</strong>
                    </Link>
                  </td>
                  <td>{site?.name}</td>
                  <td>
                    <span className={`dot ${node.connectivity === "online" ? "" : node.connectivity === "degraded" ? "dot--warn" : "dot--off"}`} />{" "}
                    {node.connectivity}
                    {node.uplink === "down" ? <div className="state state--warn">Uplink down</div> : null}
                  </td>
                  <td className="num">{node.runtimeVersion}</td>
                  <td className="num">
                    v{node.modelVersion}
                    {behind ? <div className="state state--warn">Site is v{site?.modelVersion}</div> : null}
                  </td>
                  <td className={cert === "ok" ? "num" : `num state state--${cert === "bad" ? "bad" : "warn"}`}>
                    {formatDay(node.certExpires)}
                  </td>
                  <td className="num">{node.apps.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
