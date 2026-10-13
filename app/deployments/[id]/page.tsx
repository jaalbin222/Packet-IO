import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { advanceDeploymentAction, approveDeploymentAction, rollbackDeploymentAction } from "@/lib/actions";
import { operatorName } from "@/lib/constants";
import { advanceLabel, formatWhen, readNotice, stageLabel, stepState } from "@/lib/format";
import { getOperator } from "@/lib/session";
import { getDb } from "@/lib/store";
import type { Wave } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = getDb().deployments.find((item) => item.id === id);
  return { title: campaign ? `${campaign.appName} ${campaign.version}` : "Campaign" };
}

const steps = [
  ["build", "Build"],
  ["canary", "Canary"],
  ["wave1", "Wave 1"],
  ["fleet", "Fleet"],
] as const;

export default async function DeploymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; tone?: string }>;
}) {
  const { id } = await params;
  const notice = readNotice(await searchParams);
  const operator = await getOperator();
  const db = getDb();
  const campaign = db.deployments.find((item) => item.id === id);
  if (!campaign) notFound();
  const signed = campaign.approvals.some((approval) => approval.by === operator.id);
  const label = advanceLabel(campaign);
  const sites = campaign.siteIds.map((siteId) => db.sites.find((site) => site.id === siteId)?.name).filter(Boolean);

  return (
    <>
      <Notice notice={notice} />
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
              <Link key={target.nodeId} href={`/fleet/${target.nodeId}`} className={`node-tile is-${target.status}`}>
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
          <form action={approveDeploymentAction}>
            <input type="hidden" name="id" value={campaign.id} />
            <SubmitButton>Approve as {operator.name}</SubmitButton>
          </form>
        ) : null}
        {label ? (
          <form action={advanceDeploymentAction}>
            <input type="hidden" name="id" value={campaign.id} />
            <SubmitButton>{label}</SubmitButton>
          </form>
        ) : null}
        {campaign.stage !== "rolled_back" ? (
          <form action={rollbackDeploymentAction}>
            <input type="hidden" name="id" value={campaign.id} />
            <SubmitButton variant="danger">Roll back</SubmitButton>
          </form>
        ) : null}
        <Link className="btn btn--ghost" href="/deployments">
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

function waveName(wave: Wave) {
  if (wave === "wave1") return "Wave 1";
  if (wave === "canary") return "Canary";
  return "Fleet";
}
