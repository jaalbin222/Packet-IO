"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AssetGraph } from "@/components/asset-graph";
import { usePacket } from "@/components/packet-provider";
import { operatorName } from "@/lib/constants";
import { formatWhen } from "@/lib/format";
import { paths } from "@/lib/paths";
import type { Asset } from "@/lib/types";

export default function ModelPage() {
  return (
    <Suspense fallback={<p className="muted">Loading model…</p>}>
      <ModelView />
    </Suspense>
  );
}

function ModelView() {
  const params = useSearchParams();
  const { db } = usePacket();
  const accepted = db.tags.filter((tag) => tag.status === "accepted" && tag.mapping);
  const siteFilter = params.get("site") ?? undefined;
  const first = accepted.find((tag) => (siteFilter ? tag.siteId === siteFilter : true));
  const activeId = params.get("asset") ?? first?.mapping?.assetId ?? db.assets[0]?.id;
  const asset = db.assets.find((item) => item.id === activeId) ?? db.assets[0];
  const site = db.sites.find((item) => item.id === asset?.siteId);
  const tags = accepted.filter((tag) => tag.mapping?.assetId === asset?.id);

  return (
    <>
      <header className="page-head">
        <p className="eyebrow">
          <b>Model</b>Canonical asset model
        </p>
        <h1>What the fleet agrees a tag means.</h1>
        <p className="lede">
          Confirmed mappings are one versioned model, with lineage back to the raw tag name. Applications bind to this, not to INV3_ACPWR_L1.
        </p>
      </header>
      {site ? (
        <section className="panel graph-panel">
          <div className="panel__head">
            <h2>{site.name}</h2>
            <span className="num">v{site.modelVersion}</span>
          </div>
          <AssetGraph assets={db.assets} tags={db.tags} siteId={site.id} activeId={asset?.id} />
        </section>
      ) : (
        <p className="empty">The model is empty until a tag is confirmed.</p>
      )}
      <div className="model">
        <nav className="panel" aria-label="Assets">
          <ul className="tree">
            {db.sites.map((item) => (
              <li key={item.id}>
                <div className="site-label">
                  {item.name}
                  <span>v{item.modelVersion}</span>
                </div>
                <AssetTree assets={db.assets} tags={accepted} siteId={item.id} activeId={asset?.id} />
              </li>
            ))}
          </ul>
        </nav>
        {asset && site ? (
          <section className="panel" style={{ padding: 18 }}>
            <p className="label">
              {site.name} · {asset.assetClass} · {asset.oem}
            </p>
            <h2 style={{ marginTop: 8 }}>{assetPath(db.assets, asset)}</h2>
            <p className="muted" style={{ margin: "8px 0 16px" }}>
              Model v{site.modelVersion}. {tags.length} confirmed tag{tags.length === 1 ? "" : "s"}.
            </p>
            {tags.length === 0 ? (
              <p className="empty">
                No confirmed tags on this asset. <Link href={paths.site(site.id)}>Review proposals</Link>
              </p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Raw tag</th>
                      <th>Canonical</th>
                      <th>Unit</th>
                      <th>Lineage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tags.map((tag) => (
                      <tr key={tag.id}>
                        <td>
                          <Link href={paths.site(tag.siteId, tag.id)}>
                            <code>{tag.rawName}</code>
                          </Link>
                        </td>
                        <td>
                          {tag.mapping?.role}
                          {tag.mapping?.source === "corrected" ? <div className="muted">Corrected by a reviewer</div> : null}
                        </td>
                        <td className="num">{tag.mapping?.unit}</td>
                        <td className="muted">
                          {tag.reviewedBy ? operatorName(tag.reviewedBy) : "—"}
                          {tag.reviewedAt ? ` · ${formatWhen(tag.reviewedAt)}` : ""}
                          <div>{tag.protocol} · {tag.sample}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}
      </div>
    </>
  );
}

function AssetTree({
  assets,
  tags,
  siteId,
  activeId,
}: {
  assets: Asset[];
  tags: { mapping?: { assetId: string } }[];
  siteId: string;
  activeId?: string;
}) {
  const roots = assets.filter((asset) => asset.siteId === siteId && !asset.parentId);
  const render = (asset: Asset, depth: number) => {
    const children = assets.filter((item) => item.parentId === asset.id);
    const count = tags.filter((tag) => tag.mapping?.assetId === asset.id).length;
    return (
      <li key={asset.id}>
        <Link
          href={paths.model({ asset: asset.id })}
          className={asset.id === activeId ? "is-active" : undefined}
          style={{ paddingLeft: 10 + depth * 14 }}
        >
          <span>{asset.name}</span>
          <span className="num">{count || ""}</span>
        </Link>
        {children.length > 0 ? <ul className="tree">{children.map((child) => render(child, depth + 1))}</ul> : null}
      </li>
    );
  };
  return <ul className="tree">{roots.map((asset) => render(asset, 0))}</ul>;
}

function assetPath(assets: Asset[], asset: Asset): string {
  const names = [asset.name];
  let parentId = asset.parentId;
  while (parentId) {
    const parent = assets.find((item) => item.id === parentId);
    if (!parent) break;
    names.unshift(parent.name);
    parentId = parent.parentId;
  }
  return names.join(" / ");
}
