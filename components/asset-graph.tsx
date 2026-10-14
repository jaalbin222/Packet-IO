"use client";

import { useRouter } from "next/navigation";
import { paths } from "@/lib/paths";
import type { Asset, Tag } from "@/lib/types";

export function AssetGraph({
  assets,
  tags,
  siteId,
  activeId,
}: {
  assets: Asset[];
  tags: Tag[];
  siteId: string;
  activeId?: string;
}) {
  const router = useRouter();
  const local = assets.filter((asset) => asset.siteId === siteId);
  if (local.length === 0) {
    return <p className="empty">This site has no assets in the model yet.</p>;
  }

  const depthOf = new Map<string, number>();
  const depth = (asset: Asset): number => {
    const cached = depthOf.get(asset.id);
    if (cached !== undefined) return cached;
    const parent = asset.parentId ? local.find((item) => item.id === asset.parentId) : undefined;
    const value = parent ? depth(parent) + 1 : 0;
    depthOf.set(asset.id, value);
    return value;
  };
  local.forEach(depth);

  const columns = new Map<number, Asset[]>();
  for (const asset of local) {
    const column = depthOf.get(asset.id) ?? 0;
    const list = columns.get(column) ?? [];
    list.push(asset);
    columns.set(column, list);
  }
  const colCount = Math.max(1, ...columns.keys()) + 1;
  const rowCount = Math.max(...[...columns.values()].map((list) => list.length));
  const colW = 168;
  const rowH = 78;
  const width = colCount * colW + 24;
  const height = rowCount * rowH + 16;
  const pos = new Map<string, { x: number; y: number }>();
  columns.forEach((list, column) => {
    list.forEach((asset, row) => {
      pos.set(asset.id, { x: 16 + column * colW, y: 12 + row * rowH });
    });
  });

  return (
    <div className="graph-scroll">
      <svg className="graph" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Asset hierarchy">
        {local.map((asset) => {
          if (!asset.parentId) return null;
          const from = pos.get(asset.parentId);
          const to = pos.get(asset.id);
          if (!from || !to) return null;
          const x1 = from.x + 140;
          const y1 = from.y + 28;
          const x2 = to.x;
          const y2 = to.y + 28;
          const mid = (x1 + x2) / 2;
          return <path key={`${asset.parentId}-${asset.id}`} className="graph__edge" d={`M${x1} ${y1} C${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`} />;
        })}
        {local.map((asset) => {
          const at = pos.get(asset.id);
          if (!at) return null;
          const count = tags.filter((tag) => tag.status === "accepted" && tag.mapping?.assetId === asset.id).length;
          const active = asset.id === activeId;
          return (
            <g
              key={asset.id}
              className={`graph__node ${active ? "is-active" : ""}`}
              role="link"
              tabIndex={0}
              onClick={() => router.push(paths.model({ asset: asset.id, site: siteId }))}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  router.push(paths.model({ asset: asset.id, site: siteId }));
                }
              }}
            >
              <rect x={at.x} y={at.y} width={144} height={56} rx={10} />
              <text x={at.x + 12} y={at.y + 22}>
                {asset.name}
              </text>
              <text className="graph__meta" x={at.x + 12} y={at.y + 42}>
                {asset.assetClass}
                {count > 0 ? ` · ${count}` : ""}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
