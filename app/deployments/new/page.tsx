"use client";

import { DeploymentForm } from "@/components/deployment-form";
import { usePacket } from "@/components/packet-provider";
import { siteAssetClasses } from "@/lib/domain";

export default function NewDeploymentPage() {
  const { db } = usePacket();
  const sites = db.sites.map((site) => ({
    id: site.id,
    name: site.name,
    kind: site.kind,
    modelVersion: site.modelVersion,
    assetClasses: siteAssetClasses(db, site.id),
  }));
  const nodes = db.nodes.map((node) => ({
    id: node.id,
    name: node.name,
    siteId: node.siteId,
    connectivity: node.connectivity,
  }));
  return (
    <>
      <header className="page-head">
        <p className="eyebrow">
          <b>Deploy</b>Model-addressed
        </p>
        <h1>Express the change once.</h1>
        <p className="lede">
          Pick an application and the sites whose canonical model already contains the asset class it binds to. Packet resolves the gateways. It does not ask you to touch each node.
        </p>
      </header>
      <DeploymentForm apps={db.apps} sites={sites} nodes={nodes} />
    </>
  );
}
