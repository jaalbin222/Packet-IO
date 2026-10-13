"use client";

import Link from "next/link";
import { usePacket } from "@/components/packet-provider";
import { operatorName } from "@/lib/constants";
import { formatWhen, stageLabel } from "@/lib/format";
import { paths } from "@/lib/paths";

export default function OverviewPage() {
  const { db } = usePacket();
  const online = db.nodes.filter((node) => node.connectivity === "online").length;
  const degraded = db.nodes.filter((node) => node.connectivity === "degraded").length;
  const offline = db.nodes.filter((node) => node.connectivity === "offline").length;
  const review = db.tags.filter((tag) => tag.status === "pending" || tag.status === "drift").length;
  const inModel = db.tags.filter((tag) => tag.status === "accepted").length;
  const open = db.deployments.filter((item) => item.stage !== "complete" && item.stage !== "rolled_back");
  const behind = db.nodes.filter((node) => {
    const site = db.sites.find((item) => item.id === node.siteId);
    return site && site.modelVersion !== node.modelVersion;
  });

  return (
    <>
      <header className="page-head">
        <p className="eyebrow">
          <b>Fleet</b>Control plane
        </p>
        <h1>One model for every site.</h1>
        <p className="lede">
          Raw tags are proposed with a confidence score, a person confirms them, and applications deploy against that canonical model.
        </p>
      </header>
      <section className="stats">
        <div className="stat">
          <span>Sites</span>
          <b>{db.sites.length}</b>
        </div>
        <div className="stat">
          <span>Gateways</span>
          <b>
            {online}
            <em style={{ fontSize: 16, color: "var(--muted)", fontFamily: "var(--body)" }}> / {db.nodes.length}</em>
          </b>
        </div>
        <div className="stat">
          <span>Tags in model</span>
          <b>{inModel}</b>
        </div>
        <div className="stat">
          <span>Need review</span>
          <b>{review}</b>
        </div>
      </section>
      <p className="muted" style={{ marginTop: -12, marginBottom: 22 }}>
        {online} online · {degraded} degraded · {offline} offline
        {behind.length > 0 ? ` · ${behind.length} gateways behind the canonical model` : ""}
      </p>
      <div className="grid-2">
        <section className="panel">
          <div className="panel__head">
            <h2>Sites</h2>
            <Link href={paths.sites}>All sites</Link>
          </div>
          {db.sites.map((site) => {
            const waiting = db.tags.filter((tag) => tag.siteId === site.id && (tag.status === "pending" || tag.status === "drift")).length;
            const nodes = db.nodes.filter((node) => node.siteId === site.id);
            const up = nodes.filter((node) => node.connectivity === "online").length;
            return (
              <Link key={site.id} href={paths.site(site.id)} className="list-link">
                <span>
                  <strong>{site.name}</strong>
                  <br />
                  <small>
                    {site.kind} · {site.capacity} · model v{site.modelVersion}
                  </small>
                </span>
                <small>
                  {up}/{nodes.length} online
                  {waiting > 0 ? ` · ${waiting} to review` : ""}
                </small>
              </Link>
            );
          })}
        </section>
        <section className="panel">
          <div className="panel__head">
            <h2>Open campaigns</h2>
            <Link href={paths.deployments}>All</Link>
          </div>
          {open.length === 0 ? <p className="empty">No campaign is in flight.</p> : null}
          {open.map((campaign) => (
            <Link key={campaign.id} href={paths.deployment(campaign.id)} className="list-link">
              <span>
                <strong>{campaign.appName}</strong>
                <br />
                <small>
                  {campaign.version} · {stageLabel(campaign.stage)} · {campaign.approvals.length}/{campaign.approvalsRequired} approvals
                </small>
              </span>
            </Link>
          ))}
        </section>
      </div>
      <h2 className="subhead">Recent changes</h2>
      <ul className="timeline">
        {db.audit.slice(0, 6).map((event) => (
          <li key={event.id}>
            <time dateTime={event.at}>{formatWhen(event.at)}</time>
            <span>{operatorName(event.actor)}</span>
            {event.href ? <Link href={event.href}>{event.message}</Link> : <span>{event.message}</span>}
          </li>
        ))}
      </ul>
    </>
  );
}
