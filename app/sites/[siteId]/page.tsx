import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice } from "@/components/notice";
import { ReviewWorkspace } from "@/components/review-workspace";
import { readNotice } from "@/lib/format";
import { getDb } from "@/lib/store";

export async function generateMetadata({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const site = getDb().sites.find((item) => item.id === siteId);
  return { title: site?.name ?? "Site" };
}

export default async function SitePage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ notice?: string; tone?: string; tag?: string }>;
}) {
  const { siteId } = await params;
  const sp = await searchParams;
  const db = getDb();
  const site = db.sites.find((item) => item.id === siteId);
  if (!site) notFound();
  const tags = db.tags.filter((tag) => tag.siteId === site.id);
  const devices = db.devices.filter((device) => device.siteId === site.id);
  const assets = db.assets.filter((asset) => asset.siteId === site.id);
  const accepted = tags.filter((tag) => tag.status === "accepted").length;
  const review = tags.filter((tag) => tag.status === "pending" || tag.status === "drift").length;

  return (
    <>
      <Notice notice={readNotice(sp)} />
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
          <Link className="btn btn--ghost" href={`/model?site=${site.id}`}>
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
          const count = tags.filter((tag) => tag.deviceId === device.id).length;
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
      <ReviewWorkspace
        key={`${sp.tag ?? ""}-${sp.notice ?? ""}`}
        siteId={site.id}
        tags={tags}
        assets={assets}
        devices={devices}
        initialTagId={sp.tag}
      />
    </>
  );
}
