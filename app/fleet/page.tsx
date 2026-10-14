"use client";

import Link from "next/link";
import { FleetMap } from "@/components/fleet-map";
import { Telemetry } from "@/components/telemetry";
import { usePacket } from "@/components/packet-provider";
import { certTone, formatDay } from "@/lib/format";
import { paths } from "@/lib/paths";

export default function FleetPage() {
  const { db } = usePacket();
  const spotlight = db.nodes.filter((node) => node.connectivity === "online").slice(0, 3);
  return (
    <>
      <header className="page-head">
        <p className="eyebrow">
          <b>Runtime</b>Node registry
        </p>
        <h1>What is running where.</h1>
        <p className="lede">
          Every gateway reports identity, connectivity, and the versions of runtime, model, and certificates. Offline nodes keep their last record and queue the next campaign.
        </p>
      </header>
      <FleetMap sites={db.sites} nodes={db.nodes} tags={db.tags} />
      {spotlight.length > 0 ? (
        <div className="traces traces--tight">
          {spotlight.map((node) => (
            <Link key={node.id} href={paths.node(node.id)} className="trace-link">
              <Telemetry
                seed={node.id}
                live={node.uplink === "up" && node.connectivity === "online"}
                label={node.name}
                unit={node.siteId === "north-ridge" ? "%" : "kW"}
                caption={node.uplink === "down" ? "Uplink down · buffering locally" : db.sites.find((site) => site.id === node.siteId)?.name}
              />
            </Link>
          ))}
        </div>
      ) : (
        <p className="empty">No gateway is online. The last records are still in the registry below.</p>
      )}
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
                    <Link href={paths.node(node.id)}>
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
