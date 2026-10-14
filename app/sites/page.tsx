"use client";

import Link from "next/link";
import { FleetMap } from "@/components/fleet-map";
import { usePacket } from "@/components/packet-provider";
import { paths } from "@/lib/paths";

export default function SitesPage() {
  const { db } = usePacket();
  return (
    <>
      <header className="page-head">
        <p className="eyebrow">
          <b>Discovery</b>Read-only
        </p>
        <h1>The fleet as it was found.</h1>
        <p className="lede">
          Each site was inventoried from the SCADA, historian, and gateways already installed. Nothing on this page writes to the control network.
        </p>
      </header>
      <FleetMap sites={db.sites} nodes={db.nodes} tags={db.tags} />
      <div className="site-cards">
        {db.sites.map((site) => {
          const tags = db.tags.filter((tag) => tag.siteId === site.id);
          const review = tags.filter((tag) => tag.status === "pending" || tag.status === "drift").length;
          const accepted = tags.filter((tag) => tag.status === "accepted").length;
          const nodes = db.nodes.filter((node) => node.siteId === site.id);
          const online = nodes.filter((node) => node.connectivity === "online").length;
          const pct = tags.length === 0 ? 0 : Math.round((accepted / tags.length) * 100);
          return (
            <Link key={site.id} href={paths.site(site.id)} className="card site-card">
              <span className="label">{site.kind}</span>
              <strong>{site.name}</strong>
              <span>
                {site.region} · {site.capacity}
              </span>
              <span className="meter meter--wide" title={`${pct}% in the model`}>
                <i style={{ width: `${pct}%` }} />
              </span>
              <span className="site-card__meta">
                <em>model v{site.modelVersion}</em>
                <em>
                  {online}/{nodes.length} up
                </em>
                <em className={review > 0 ? "is-warn" : ""}>{review > 0 ? `${review} to review` : "Model current"}</em>
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
