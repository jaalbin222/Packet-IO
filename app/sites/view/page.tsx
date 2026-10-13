"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ReviewWorkspace } from "@/components/review-workspace";
import { usePacket } from "@/components/packet-provider";
import { paths } from "@/lib/paths";

export default function SiteViewPage() {
  return (
    <Suspense fallback={<p className="muted">Loading site…</p>}>
      <SiteView />
    </Suspense>
  );
}

function SiteView() {
  const params = useSearchParams();
  const siteId = params.get("site") ?? "";
  const tag = params.get("tag") ?? undefined;
  const { db } = usePacket();
  const site = db.sites.find((item) => item.id === siteId);
  if (!site) {
    return (
      <p className="lede">
        That site is not in this browser’s fleet. <Link href={paths.sites}>Back to sites</Link>
      </p>
    );
  }
  const tags = db.tags.filter((item) => item.siteId === site.id);
  const devices = db.devices.filter((device) => device.siteId === site.id);
  const assets = db.assets.filter((asset) => asset.siteId === site.id);
  const accepted = tags.filter((item) => item.status === "accepted").length;
  const review = tags.filter((item) => item.status === "pending" || item.status === "drift").length;

  return (
    <>
      <header className="page-head">
        <p className="eyebrow">
          <b>Module 01</b>Data unification
        </p>
        <div className="page-head__row">
          <div>
            <div className="page-head__title">
              <h1>{site.name}</h1>
              <span className="chip chip--tint">model v{site.modelVersion}</span>
            </div>
            <p className="lede">
              {site.kind} · {site.capacity} · {site.region}. Discovered from {site.scada} and {site.historian}. High-confidence proposals can be approved together. Anything under 0.90 stays with a person, with the reasoning shown.
            </p>
          </div>
          <Link className="btn btn--ghost" href={paths.model({ site: site.id })}>
            Open model
          </Link>
        </div>
      </header>
      <section className="stats">
        <div className="stat"><span>Discovered</span><b>{tags.length}</b></div>
        <div className="stat"><span>In model</span><b>{accepted}</b></div>
        <div className="stat"><span>Need review</span><b>{review}</b></div>
        <div className="stat"><span>Devices</span><b>{devices.length}</b></div>
      </section>
      <h2 className="subhead">Discovered devices</h2>
      <div className="devices">
        {devices.map((device) => {
          const count = tags.filter((item) => item.deviceId === device.id).length;
          return (
            <article key={device.id} className="card device">
              <span className="label">{device.protocol}</span>
              <b>{device.name}</b>
              <span>
                {device.vendor} · {device.kind} · {count} tags
              </span>
            </article>
          );
        })}
      </div>
      <h2 className="subhead">Map and contextualize</h2>
      <ReviewWorkspace siteId={site.id} tags={tags} assets={assets} devices={devices} initialTagId={tag} />
    </>
  );
}
