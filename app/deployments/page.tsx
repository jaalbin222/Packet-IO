import Link from "next/link";
import { operatorName } from "@/lib/constants";
import { formatWhen, stageLabel } from "@/lib/format";
import { getDb } from "@/lib/store";

export const metadata = { title: "Deployments" };

export default function DeploymentsPage() {
  const db = getDb();
  return (
    <>
      <header className="page-head">
        <div className="page-head__row">
          <div>
            <p className="eyebrow">
              <b>Module 03</b>Fleet orchestration
            </p>
            <h1>Campaigns</h1>
            <p className="lede">
              A change is expressed once against the canonical model, then rolled out canary, wave, fleet. Every campaign keeps its author, approvals, diff, and result.
            </p>
          </div>
          <Link className="btn btn--primary" href="/deployments/new">
            New campaign
          </Link>
        </div>
      </header>
      <div className="cards">
        {db.deployments.map((campaign) => {
          const sites = campaign.siteIds
            .map((id) => db.sites.find((site) => site.id === id)?.name)
            .filter(Boolean)
            .join(", ");
          return (
            <Link key={campaign.id} href={`/deployments/${campaign.id}`} className="card campaign">
              <span>
                <strong>{campaign.appName}</strong> <span className="num">{campaign.version}</span>
                <p>{campaign.diff.summary}</p>
              </span>
              <span className="muted">
                {sites}
                <br />
                {operatorName(campaign.author)} · {formatWhen(campaign.createdAt)}
              </span>
              <span className={`state ${campaign.stage === "rolled_back" ? "state--warn" : campaign.stage === "complete" ? "state--ok" : "state--ok"}`}>
                {stageLabel(campaign.stage)}
                <div className="muted">
                  {campaign.approvals.length}/{campaign.approvalsRequired} approvals
                </div>
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
