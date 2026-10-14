"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePacket } from "@/components/packet-provider";
import { OPERATORS, operatorName } from "@/lib/constants";
import { advanceLabel, formatWhen, stageLabel, stepState } from "@/lib/format";
import { paths } from "@/lib/paths";
import type { DeploymentNode, DeploymentStage, GatewayNode, Wave } from "@/lib/types";

const steps = [
  ["build", "Build"],
  ["canary", "Canary"],
  ["wave1", "Wave 1"],
  ["fleet", "Fleet"],
] as const;

export default function DeploymentViewPage() {
  return (
    <Suspense fallback={<p className="muted">Loading campaign…</p>}>
      <DeploymentView />
    </Suspense>
  );
}

function DeploymentView() {
  const id = useSearchParams().get("id") ?? "";
  const { db, operatorId, approve, advance, rollback } = usePacket();
  const campaign = db.deployments.find((item) => item.id === id);
  const operator = OPERATORS.find((item) => item.id === operatorId) ?? OPERATORS[0];
  if (!campaign) {
    return (
      <p className="lede">
        That campaign is not in this browser’s fleet. <Link href={paths.deployments}>Back to campaigns</Link>
      </p>
    );
  }
  const signed = campaign.approvals.some((approval) => approval.by === operator.id);
  const label = advanceLabel(campaign);
  const sites = campaign.siteIds.map((siteId) => db.sites.find((site) => site.id === siteId)?.name).filter(Boolean);

  return (
    <>
      <header className="page-head">
        <p className="eyebrow">
          <b>Campaign</b>
          {campaign.kind === "model" ? "Model publish" : campaign.assetClass ?? "All assets"}
        </p>
        <div className="page-head__title">
          <h1>{campaign.appName}</h1>
          <span className="chip chip--tint">{campaign.version}</span>
          <span className="chip">{sites.length} sites</span>
        </div>
        <p className="lede">{campaign.diff.summary}</p>
      </header>
      <Rollout nodes={campaign.nodes} names={db.nodes} stage={campaign.stage} />
      <section className="panel" style={{ overflow: "hidden" }}>
        <ol className="rail" aria-label="Rollout stages">
          {steps.map(([step, name]) => {
            const state = stepState(campaign, step);
            return (
              <li key={step} className={`is-${state}`}>
                <div className="mark" aria-hidden>
                  {state === "done" ? "✓" : state === "failed" ? "!" : ""}
                </div>
                {name}
              </li>
            );
          })}
        </ol>
        <div className="node-grid">
          {campaign.nodes.map((target) => {
            const node = db.nodes.find((item) => item.id === target.nodeId);
            return (
              <Link key={target.nodeId} href={paths.node(target.nodeId)} className={`node-tile is-${target.status}`}>
                <b>{node?.name ?? target.nodeId}</b>
                <span>
                  {waveName(target.wave)} · {target.status}
                </span>
              </Link>
            );
          })}
        </div>
        <div className="legend">
          <span><i className="is-ok" /> deployed</span>
          <span><i className="is-queue" /> offline · queued</span>
          <span><i className="is-fail" /> health failed</span>
        </div>
        <div className="campaign-foot">
          <span>
            author {campaign.author} · approvals {campaign.approvals.length}/{campaign.approvalsRequired}
          </span>
          <span>
            diff +{campaign.diff.added} −{campaign.diff.removed} · auto-rollback {campaign.autoRollback ? "on" : "off"}
          </span>
        </div>
      </section>
      <div className="actions">
        {!signed && campaign.approvals.length < campaign.approvalsRequired && campaign.stage !== "rolled_back" && campaign.stage !== "complete" ? (
          <button className="btn btn--primary" type="button" onClick={() => approve(campaign.id)}>
            Approve as {operator.name}
          </button>
        ) : null}
        {label ? (
          <button className="btn btn--primary" type="button" onClick={() => advance(campaign.id)}>
            {label}
          </button>
        ) : null}
        {campaign.stage !== "rolled_back" ? (
          <button className="btn btn--danger" type="button" onClick={() => rollback(campaign.id)}>
            Roll back
          </button>
        ) : null}
        <Link className="btn btn--ghost" href={paths.deployments}>
          All campaigns
        </Link>
      </div>
      {campaign.stage === "draft" && campaign.approvals.length < campaign.approvalsRequired ? (
        <p className="muted" style={{ marginTop: 12 }}>
          Switch the operator in the header to collect the second signature. {operator.name} has {signed ? "already signed" : "not signed"}.
        </p>
      ) : null}
      <h2 className="subhead">Change record</h2>
      <ul className="timeline">
        {[...campaign.events].reverse().map((event, index) => (
          <li key={`${event.at}-${index}`}>
            <time dateTime={event.at}>{formatWhen(event.at)}</time>
            <span>{operatorName(event.actor)}</span>
            <span>{event.message}</span>
          </li>
        ))}
      </ul>
      <p className="muted" style={{ marginTop: 18 }}>
        Stage {stageLabel(campaign.stage)}
        {campaign.blocked ? " · blocked on a failed health check" : ""}
        {campaign.siteVersions
          ? ` · ${Object.entries(campaign.siteVersions)
              .map(([siteId, version]) => `${db.sites.find((site) => site.id === siteId)?.name} v${version}`)
              .join(", ")}`
          : ""}
      </p>
    </>
  );
}

function Rollout({
  nodes,
  names,
  stage,
}: {
  nodes: DeploymentNode[];
  names: GatewayNode[];
  stage: DeploymentStage;
}) {
  const waves: Wave[] = ["canary", "wave1", "fleet"];
  return (
    <section className="rollout" aria-label="Gateways in this rollout">
      {waves.map((wave) => {
        const group = nodes.filter((node) => node.wave === wave);
        if (group.length === 0) return null;
        return (
          <div key={wave} className={`rollout__wave ${stage === wave ? "is-hot" : ""}`}>
            <span>{wave === "wave1" ? "Wave 1" : wave}</span>
            <div>
              {group.map((target, index) => {
                const node = names.find((item) => item.id === target.nodeId);
                return (
                  <Link
                    key={target.nodeId}
                    href={paths.node(target.nodeId)}
                    className={`orb is-${target.status}`}
                    style={{ animationDelay: `${index * 90}ms` }}
                  >
                    <b>{node?.name ?? target.nodeId}</b>
                    <small>{target.status.replace("_", " ")}</small>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function waveName(wave: Wave) {
  if (wave === "wave1") return "Wave 1";
  if (wave === "canary") return "Canary";
  return "Fleet";
}
