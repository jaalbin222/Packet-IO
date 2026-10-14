"use client";

import Link from "next/link";
import { usePacket } from "@/components/packet-provider";
import { paths } from "@/lib/paths";

const FEATURED = "cr-inv3-ac";

export function StoryBoard() {
  const { db, review, bulkApprove } = usePacket();
  const tag = db.tags.find((item) => item.id === FEATURED);
  const site = db.sites.find((item) => item.id === tag?.siteId);
  const high = db.tags.filter(
    (item) => item.siteId === "chisholm" && item.status === "pending" && item.proposal.confidence >= 0.9,
  ).length;
  const campaign = db.deployments.find((item) => item.id === "dep-bess");
  const confirmed = tag?.status === "accepted";

  return (
    <section className="story" aria-label="From a raw tag to a fleet deployment">
      <div className="story__intro">
        <p className="eyebrow">
          <b>The loop</b>One site, then the fleet
        </p>
        <h2>A name becomes an address. The address deploys everywhere.</h2>
      </div>
      <ol className="beats">
        <li className="beat">
          <span className="beat__n">01</span>
          <h3>Raw SCADA</h3>
          <p className="beat__raw">{tag?.rawName ?? "INV3_ACPWR_L1"}</p>
          <p>
            {site?.name ?? "Chisholm Ridge"} · {tag?.protocol ?? "Modbus"} · sample {tag?.sample ?? "1 s"}. No unit, no asset, no place in a hierarchy.
          </p>
        </li>
        <li className={`beat ${confirmed ? "is-done" : "is-now"}`}>
          <span className="beat__n">02</span>
          <h3>Proposed meaning</h3>
          <p className="beat__meaning">{tag?.proposal.hierarchy ?? "Inverter 3 / AC power / L1"}</p>
          <p className="beat__conf">{Math.round((tag?.proposal.confidence ?? 0.94) * 100)}% · {tag?.proposal.unit ?? "kW"}</p>
          <p>{tag?.proposal.reasoning}</p>
          <div className="signals">
            {(tag?.proposal.signals ?? []).map((signal) => (
              <span className="chip" key={signal}>{signal}</span>
            ))}
          </div>
          {tag && !confirmed ? (
            <div className="actions">
              <button className="btn btn--primary" type="button" onClick={() => review({ tagId: tag.id, decision: "accept" })}>
                Confirm this meaning
              </button>
              {high > 0 ? (
                <button className="btn btn--ghost" type="button" onClick={() => bulkApprove("chisholm")}>
                  Approve {high} like it
                </button>
              ) : null}
            </div>
          ) : (
            <p className="beat__ok">Confirmed into {site?.name} model v{site?.modelVersion}.</p>
          )}
        </li>
        <li className={`beat ${confirmed ? "is-now" : ""}`}>
          <span className="beat__n">03</span>
          <h3>Canonical model</h3>
          <p className="beat__meaning">{confirmed ? tag?.mapping?.hierarchy : "Waiting on a person"}</p>
          <p>
            Applications bind to Inverter 3, not to the string the OEM wrote. Lineage stays attached: who confirmed it, and which raw tag it came from.
          </p>
          <div className="actions">
            <Link className="btn btn--ghost" href={paths.model({ asset: "cr-inv3", site: "chisholm" })}>
              Open the model
            </Link>
          </div>
        </li>
        <li className="beat">
          <span className="beat__n">04</span>
          <h3>One deployment</h3>
          <p className="beat__meaning">{campaign?.appName ?? "bess.imbalance_monitor"}</p>
          <p>
            The campaign addresses the asset class. Gateways that are offline queue and catch up. A failed health check can roll the fleet back.
          </p>
          <div className="actions">
            <Link className="btn btn--primary" href={campaign ? paths.deployment(campaign.id) : paths.deployments}>
              {campaign && campaign.approvals.length < campaign.approvalsRequired ? "Collect the second signature" : "Watch the rollout"}
            </Link>
          </div>
        </li>
      </ol>
    </section>
  );
}
