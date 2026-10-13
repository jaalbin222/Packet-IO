"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePacket } from "@/components/packet-provider";
import { certTone, formatDay, stageLabel } from "@/lib/format";
import { paths } from "@/lib/paths";

export default function NodeViewPage() {
  return (
    <Suspense fallback={<p className="muted">Loading gateway…</p>}>
      <NodeView />
    </Suspense>
  );
}

function NodeView() {
  const nodeId = useSearchParams().get("node") ?? "";
  const { db, reconnect } = usePacket();
  const node = db.nodes.find((item) => item.id === nodeId);
  if (!node) {
    return (
      <p className="lede">
        That gateway is not in this browser’s fleet. <Link href={paths.fleet}>Back to the fleet</Link>
      </p>
    );
  }
  const site = db.sites.find((item) => item.id === node.siteId);
  const behind = site && site.modelVersion !== node.modelVersion;
  const queued = db.deployments.flatMap((deployment) =>
    deployment.nodes
      .filter((target) => target.nodeId === node.id && target.status === "queued")
      .map((target) => ({ deployment, target })),
  );
  const needsLink = node.connectivity !== "online" || node.uplink === "down";

  return (
    <>
      <header className="page-head">
        <p className="eyebrow">
          <b>Module 02</b>On-site runtime
        </p>
        <div className="page-head__row">
          <div>
            <div className="page-head__title">
              <h1>{node.name}</h1>
              <span className="chip">{node.runtimeVersion}</span>
            </div>
            <p className="lede">
              {site?.name} · {site?.kind}. The runtime is headless. It acquires by canonical meaning, runs each application in its own sandbox, and keeps going when the uplink drops.
            </p>
          </div>
          {needsLink ? (
            <button className="btn btn--primary" type="button" onClick={() => reconnect(node.id)}>
              {node.connectivity === "offline" ? "Mark reconnected" : "Restore link"}
            </button>
          ) : null}
        </div>
      </header>
      <article className="panel runtime">
        <div className="panel__head">
          <strong>{site?.name} runtime</strong>
          <span className="num">config {node.configVersion}</span>
        </div>
        <section>
          <div className={`uplink ${node.uplink === "down" ? "uplink--down" : "uplink--up"}`}>
            <span>
              <span className={`dot ${node.uplink === "down" ? "dot--warn" : ""}`} />{" "}
              {node.uplink === "down" ? "Uplink down · buffering locally" : "Uplink up"}
            </span>
            <span>{node.connectivity === "offline" ? "Runtime last seen offline" : "Analytics running"}</span>
          </div>
        </section>
        <section>
          <span className="label">Acquisition</span>
          {node.acquisition.map((lane) => (
            <div className="lane" key={lane.protocol}>
              <b>{lane.protocol}</b>
              <div className="wave" />
              <span>{lane.rate}</span>
            </div>
          ))}
        </section>
        <section>
          <span className="label">Sandboxed applications</span>
          {node.apps.length === 0 ? <p className="muted">No application is loaded.</p> : null}
          {node.apps.map((app) => (
            <div className="sandbox" key={app.name}>
              <b>{app.name}</b>
              <span className="num">{app.version}</span>
              <span className="meter" title={`${app.cpu}%`}>
                <i style={{ width: `${Math.min(100, app.cpu)}%` }} />
              </span>
            </div>
          ))}
        </section>
        <section>
          <div className="kv">
            <span>Connectivity</span>
            <b>{node.connectivity}</b>
            <span>Canonical model</span>
            <b>
              v{node.modelVersion}
              {behind ? ` · site is v${site?.modelVersion}` : ""}
            </b>
            <span>Certificate</span>
            <b className={certTone(node.certExpires) === "ok" ? undefined : "state state--warn"}>{formatDay(node.certExpires)}</b>
          </div>
          {behind ? (
            <p className="actions">
              <Link className="btn btn--ghost" href={paths.newDeployment}>
                Publish the model
              </Link>
            </p>
          ) : null}
        </section>
      </article>
      {queued.length > 0 ? (
        <>
          <h2 className="subhead">Queued until this gateway reconnects</h2>
          <div className="cards">
            {queued.map(({ deployment }) => (
              <Link key={deployment.id} href={paths.deployment(deployment.id)} className="card campaign">
                <span>
                  <strong>{deployment.appName}</strong>
                  <p>
                    {deployment.version} · {stageLabel(deployment.stage)}
                  </p>
                </span>
                <span className="muted">Converges on reconnect</span>
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
