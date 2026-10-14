"use client";

import Link from "next/link";
import { LINKS, PLACES } from "@/lib/atlas";
import { paths } from "@/lib/paths";
import type { GatewayNode, Site, Tag } from "@/lib/types";

export function FleetMap({
  sites,
  nodes,
  tags,
  activeId,
}: {
  sites: Site[];
  nodes: GatewayNode[];
  tags: Tag[];
  activeId?: string;
}) {
  return (
    <div className="map-wrap">
    <div className="map" aria-label="Design-partner fleet">
      <svg className="map__mesh" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {Array.from({ length: 6 }, (_, i) => (
          <line key={`v${i}`} x1={12 + i * 14} y1={8} x2={12 + i * 14} y2={92} />
        ))}
        {Array.from({ length: 4 }, (_, i) => (
          <line key={`h${i}`} x1={6} y1={18 + i * 20} x2={94} y2={18 + i * 20} />
        ))}
        {LINKS.map(([a, b]) => {
          const from = PLACES[a];
          const to = PLACES[b];
          if (!from || !to) return null;
          return <line key={`${a}-${b}`} className="map__link" x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
        })}
      </svg>
      {sites.map((site) => {
        const place = PLACES[site.id] ?? { x: 50, y: 50 };
        const siteNodes = nodes.filter((node) => node.siteId === site.id);
        const online = siteNodes.filter((node) => node.connectivity === "online").length;
        const trouble = siteNodes.some((node) => node.connectivity !== "online" || node.uplink === "down");
        const waiting = tags.filter((tag) => tag.siteId === site.id && (tag.status === "pending" || tag.status === "drift")).length;
        return (
          <Link
            key={site.id}
            href={paths.site(site.id)}
            className={`map-pin ${activeId === site.id ? "is-active" : ""} ${trouble ? "is-warn" : ""} ${place.x > 68 ? "is-east" : ""}`}
            style={{ left: `${place.x}%`, top: `${place.y}%` }}
          >
            <span className="map-pin__dot" />
            <span className="map-pin__card">
              <b>{site.name}</b>
              <small>
                {site.kind} · {online}/{siteNodes.length} up
                {waiting > 0 ? ` · ${waiting} to review` : ""}
              </small>
            </span>
          </Link>
        );
      })}
      <p className="map__caption">Design-partner fleet · read-only on the control network</p>
    </div>
    <ul className="map__legend">
      {sites.map((site) => (
        <li key={site.id}>
          <Link href={paths.site(site.id)}>{site.name}</Link>
        </li>
      ))}
    </ul>
    </div>
  );
}
