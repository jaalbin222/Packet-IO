"use client";

import Link from "next/link";
import { FleetMap } from "@/components/fleet-map";
import { StoryBoard } from "@/components/story-board";
import { Telemetry } from "@/components/telemetry";
import { usePacket } from "@/components/packet-provider";
import { paths } from "@/lib/paths";

export default function OverviewPage() {
  const { db } = usePacket();
  const review = db.tags.filter((tag) => tag.status === "pending" || tag.status === "drift").length;
  const inModel = db.tags.filter((tag) => tag.status === "accepted").length;
  const online = db.nodes.filter((node) => node.connectivity === "online").length;
  const featured = [
    { id: "cr-gw-01", label: "Chisholm · AC power", unit: "kW", live: true, caption: "Acquired against the model" },
    { id: "nr-gw-01", label: "North Ridge · SOC", unit: "%", live: false, caption: "Uplink down · buffering locally" },
    { id: "hc-gw-01", label: "Hale Creek · wind speed", unit: "m/s", live: true, caption: "Turbine T3 · 1 s" },
  ];

  return (
    <>
      <header className="hero">
        <p className="eyebrow">
          <b>Packet.io</b>Design-partner fleet
        </p>
        <h1>INV3_ACPWR_L1 is not an asset.</h1>
        <p className="lede">
          The expensive part of every edge project is deciding what a raw tag means. Packet proposes that meaning, a person confirms the ones it is not sure about, and every later application deploys against the confirmed model.
        </p>
        <div className="hero__actions">
          <a className="btn btn--primary" href="#loop">
            Walk the loop
          </a>
          <Link className="btn btn--ghost" href={paths.site("chisholm", "cr-inv3-ac")}>
            Open the ambiguous tag
          </Link>
        </div>
        <dl className="hero__facts">
          <div>
            <dt>Sites</dt>
            <dd>{db.sites.length}</dd>
          </div>
          <div>
            <dt>Gateways up</dt>
            <dd>
              {online}
              <em>/{db.nodes.length}</em>
            </dd>
          </div>
          <div>
            <dt>In the model</dt>
            <dd>{inModel}</dd>
          </div>
          <div>
            <dt>Still unnamed</dt>
            <dd>{review}</dd>
          </div>
        </dl>
      </header>

      <div id="loop">
        <StoryBoard />
      </div>

      <section className="stage">
        <div className="stage__head">
          <h2>Four sites, one address space.</h2>
          <Link href={paths.fleet}>Fleet registry</Link>
        </div>
        <FleetMap sites={db.sites} nodes={db.nodes} tags={db.tags} />
      </section>

      <section className="stage">
        <div className="stage__head">
          <h2>The runtime keeps the trace when the uplink does not.</h2>
          <Link href={paths.node("nr-gw-01")}>North Ridge gateway</Link>
        </div>
        <div className="traces">
          {featured.map((item) => (
            <Telemetry key={item.id} seed={item.id} live={item.live} label={item.label} unit={item.unit} caption={item.caption} />
          ))}
        </div>
      </section>
    </>
  );
}
