"use client";

import { useMemo, useState } from "react";
import { bulkApproveAction, reviewTagAction } from "@/lib/actions";
import { HIGH_CONFIDENCE, operatorName } from "@/lib/constants";
import type { Asset, Device, Tag, TagStatus } from "@/lib/types";
import { Confidence } from "./confidence";
import { SubmitButton } from "./submit-button";

type Filter = "all" | "review" | "high" | "model" | "rejected";

function stateOf(tag: Tag): { label: string; tone: string } {
  if (tag.status === "accepted") return { label: "In model", tone: "ok" };
  if (tag.status === "rejected") return { label: "Rejected", tone: "faint" };
  if (tag.status === "drift") return { label: "Drift", tone: "warn" };
  if (tag.proposal.confidence >= HIGH_CONFIDENCE) return { label: "High confidence", tone: "ok" };
  return { label: "Needs review", tone: "warn" };
}

function matches(tag: Tag, filter: Filter) {
  if (filter === "review") {
    return tag.status === "drift" || (tag.status === "pending" && tag.proposal.confidence < HIGH_CONFIDENCE);
  }
  if (filter === "high") return tag.status === "pending" && tag.proposal.confidence >= HIGH_CONFIDENCE;
  if (filter === "model") return tag.status === "accepted";
  if (filter === "rejected") return tag.status === "rejected";
  return true;
}

export function ReviewWorkspace({
  siteId,
  tags,
  assets,
  devices,
  initialTagId,
}: {
  siteId: string;
  tags: Tag[];
  assets: Asset[];
  devices: Device[];
  initialTagId?: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(initialTagId ?? null);
  const [correcting, setCorrecting] = useState(false);
  const visible = useMemo(() => tags.filter((tag) => matches(tag, filter)), [tags, filter]);
  const selected = tags.find((tag) => tag.id === selectedId) ?? visible[0] ?? null;
  const high = tags.filter((tag) => tag.status === "pending" && tag.proposal.confidence >= HIGH_CONFIDENCE).length;
  const assetName = (id: string) => assets.find((asset) => asset.id === id)?.name ?? id;

  return (
    <div className="workspace">
      <div>
        <div className="split">
          <div className="filters" role="tablist" aria-label="Tag filter">
            {(
              [
                ["all", "All"],
                ["high", "High confidence"],
                ["review", "Needs review"],
                ["model", "In model"],
                ["rejected", "Rejected"],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" className={filter === id ? "is-on" : undefined} onClick={() => setFilter(id)}>
                {label}
              </button>
            ))}
          </div>
          <form action={bulkApproveAction}>
            <input type="hidden" name="siteId" value={siteId} />
            <SubmitButton disabled={high === 0} pendingLabel="Approving…">
              {high === 0 ? "No high-confidence tags" : `Approve ${high} high-confidence`}
            </SubmitButton>
          </form>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Raw tag</th>
                <th>Proposed meaning</th>
                <th>Conf.</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty">
                    Nothing in this filter.
                  </td>
                </tr>
              ) : (
                visible.map((tag) => {
                  const state = stateOf(tag);
                  const active = selected?.id === tag.id;
                  return (
                    <tr key={tag.id} className={active ? "is-selected" : undefined}>
                      <td>
                        <button type="button" className="tag-btn" onClick={() => { setSelectedId(tag.id); setCorrecting(false); }}>
                          <code>{tag.rawName}</code>
                        </button>
                      </td>
                      <td>{tag.status === "accepted" ? tag.mapping?.hierarchy : tag.proposal.hierarchy}</td>
                      <td>
                        <Confidence value={tag.proposal.confidence} />
                      </td>
                      <td>
                        <span className={`state state--${state.tone}`}>{state.label}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <aside className="drawer" aria-live="polite">
        {selected ? (
          <TagDrawer
            tag={selected}
            siteId={siteId}
            assets={assets.filter((asset) => asset.siteId === siteId)}
            device={devices.find((device) => device.id === selected.deviceId)}
            assetName={assetName(selected.mapping?.assetId ?? selected.proposal.assetId)}
            correcting={correcting}
            onCorrect={() => setCorrecting(true)}
            onCancel={() => setCorrecting(false)}
          />
        ) : (
          <p>Select a tag to see why it was proposed.</p>
        )}
      </aside>
    </div>
  );
}

function TagDrawer({
  tag,
  siteId,
  assets,
  device,
  assetName,
  correcting,
  onCorrect,
  onCancel,
}: {
  tag: Tag;
  siteId: string;
  assets: Asset[];
  device?: Device;
  assetName: string;
  correcting: boolean;
  onCorrect: () => void;
  onCancel: () => void;
}) {
  const meaning = tag.status === "accepted" && tag.mapping ? tag.mapping : tag.proposal;
  const closed = tag.status === "accepted";
  return (
    <>
      <p className="label">{tag.protocol} · {tag.sample}{device ? ` · ${device.name}` : ""}</p>
      <h2><code>{tag.rawName}</code></h2>
      <Confidence value={tag.proposal.confidence} />
      <p className="reason">
        <strong style={{ color: "var(--ink)" }}>{meaning.hierarchy}</strong>
        <br />
        {meaning.unit} · {assetName} · {meaning.role}
      </p>
      {tag.proposal.template ? <p className="callout callout--tint">Template · {tag.proposal.template}</p> : null}
      {tag.status === "drift" && tag.driftReason ? <p className="callout">{tag.driftReason}</p> : null}
      <p className="reason">{tag.proposal.reasoning}</p>
      <div className="signals">
        {tag.proposal.signals.map((signal) => (
          <span className="chip" key={signal}>{signal}</span>
        ))}
      </div>
      {tag.reviewedBy ? (
        <p className="reason">
          {statusLine(tag.status)} by {operatorName(tag.reviewedBy)}
          {tag.mapping?.source === "corrected" ? " · corrected" : ""}
        </p>
      ) : null}
      {correcting ? (
        <form action={reviewTagAction}>
          <input type="hidden" name="tagId" value={tag.id} />
          <input type="hidden" name="siteId" value={siteId} />
          <input type="hidden" name="decision" value="correct" />
          <label className="field">
            <span>Asset</span>
            <select name="assetId" defaultValue={tag.proposal.assetId}>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name} · {asset.assetClass}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Role</span>
            <input name="role" defaultValue={tag.proposal.role} required />
          </label>
          <label className="field">
            <span>Unit</span>
            <input name="unit" defaultValue={tag.proposal.unit} required />
          </label>
          <div className="actions">
            <SubmitButton>Save correction</SubmitButton>
            <button className="btn btn--ghost" type="button" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      ) : closed ? null : (
        <div className="actions">
          <form action={reviewTagAction}>
            <input type="hidden" name="tagId" value={tag.id} />
            <input type="hidden" name="siteId" value={siteId} />
            <input type="hidden" name="decision" value="accept" />
            <SubmitButton>{tag.status === "drift" ? "Reaffirm mapping" : "Accept proposal"}</SubmitButton>
          </form>
          <button className="btn btn--ghost" type="button" onClick={onCorrect}>
            Correct
          </button>
          <form action={reviewTagAction}>
            <input type="hidden" name="tagId" value={tag.id} />
            <input type="hidden" name="siteId" value={siteId} />
            <input type="hidden" name="decision" value="reject" />
            <SubmitButton variant="danger">Reject</SubmitButton>
          </form>
        </div>
      )}
    </>
  );
}

function statusLine(status: TagStatus) {
  if (status === "accepted") return "Confirmed";
  if (status === "rejected") return "Rejected";
  if (status === "drift") return "Previously confirmed";
  return "Proposed";
}
