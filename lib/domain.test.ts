import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HIGH_CONFIDENCE } from "./constants";
import {
  advanceDeployment,
  approveDeployment,
  assignWaves,
  bulkApprove,
  createDeployment,
  reconnectNode,
  reviewTag,
  rollbackDeployment,
  siteEligible,
} from "./domain";
import { createSeed } from "./seed";
import type { Db } from "./types";

const at = "2026-10-13T12:00:00.000Z";

function fresh(): Db {
  return createSeed();
}

function tag(db: Db, id: string) {
  const found = db.tags.find((item) => item.id === id);
  assert.ok(found);
  return found;
}

function node(db: Db, id: string) {
  const found = db.nodes.find((item) => item.id === id);
  assert.ok(found);
  return found;
}

function appVersion(db: Db, nodeId: string, name: string) {
  return node(db, nodeId).apps.find((app) => app.name === name)?.version ?? null;
}

describe("seed", () => {
  it("keeps proposals attached to assets on the same site", () => {
    const db = fresh();
    for (const item of db.tags) {
      const asset = db.assets.find((candidate) => candidate.id === item.proposal.assetId);
      assert.ok(asset, item.rawName);
      assert.equal(asset.siteId, item.siteId);
      assert.ok(db.devices.some((device) => device.id === item.deviceId && device.siteId === item.siteId));
    }
    for (const deployment of db.deployments) {
      assert.ok(deployment.approvals.length <= deployment.approvalsRequired);
      for (const target of deployment.nodes) {
        assert.ok(db.nodes.some((gateway) => gateway.id === target.nodeId));
      }
    }
  });
});

describe("tag review", () => {
  it("bulk-approves only high-confidence pending tags and bumps the model once", () => {
    const db = fresh();
    assert.equal(HIGH_CONFIDENCE, 0.9);
    assert.equal(siteEligible(db, "chisholm", "Battery rack"), false);
    const result = bulkApprove(db, "chisholm", "j.okafor", at);
    assert.equal(result.ok, true);
    assert.match(result.message, /4 high-confidence/);
    assert.equal(db.sites.find((site) => site.id === "chisholm")?.modelVersion, "4.13");
    assert.equal(tag(db, "cr-inv3-ac").status, "accepted");
    assert.equal(tag(db, "cr-bess-soc").mapping?.hierarchy, "Battery rack 7 / state of charge");
    assert.equal(tag(db, "cr-ai-0042").status, "pending");
    assert.equal(tag(db, "cr-tmp-cab").status, "pending");
    assert.equal(tag(db, "cr-inv4-freq").status, "drift");
    assert.equal(siteEligible(db, "chisholm", "Battery rack"), true);
    assert.equal(siteEligible(db, "chisholm", "PCS"), true);
  });

  it("corrects an ambiguous tag and records the reviewer's asset", () => {
    const db = fresh();
    const result = reviewTag(
      db,
      { tagId: "cr-ai-0042", decision: "correct", assetId: "cr-inv3", unit: "A", role: "DC current" },
      "a.chen",
      at,
    );
    assert.equal(result.ok, true);
    const corrected = tag(db, "cr-ai-0042");
    assert.equal(corrected.status, "accepted");
    assert.equal(corrected.mapping?.source, "corrected");
    assert.equal(corrected.mapping?.hierarchy, "Inverter 3 / DC current");
    assert.equal(corrected.reviewedBy, "a.chen");
    assert.equal(db.sites.find((site) => site.id === "chisholm")?.modelVersion, "4.13");
  });

  it("rejects a tag without publishing it", () => {
    const db = fresh();
    const result = reviewTag(db, { tagId: "cr-xfmr-tmp", decision: "reject" }, "j.okafor", at);
    assert.equal(result.ok, true);
    assert.equal(tag(db, "cr-xfmr-tmp").status, "rejected");
    assert.equal(tag(db, "cr-xfmr-tmp").mapping, undefined);
    assert.equal(db.sites.find((site) => site.id === "chisholm")?.modelVersion, "4.12");
  });

  it("refuses a correction onto another site's asset", () => {
    const db = fresh();
    const result = reviewTag(
      db,
      { tagId: "cr-ai-0042", decision: "correct", assetId: "nr-rack1", unit: "A", role: "current" },
      "j.okafor",
      at,
    );
    assert.equal(result.ok, false);
    assert.equal(tag(db, "cr-ai-0042").status, "pending");
  });
});

describe("deployment", () => {
  it("requires a second operator and will not deploy unbound asset classes", () => {
    const db = fresh();
    const opened = createDeployment(
      db,
      { appId: "bess.imbalance_monitor", version: "1.0.0", siteIds: ["chisholm"], autoRollback: true },
      "j.okafor",
      at,
    );
    assert.equal(opened.ok, false);

    const draft = createDeployment(
      db,
      { appId: "pcs.setpoint_optimiser", version: "0.3.0", siteIds: ["north-ridge"], autoRollback: false },
      "j.okafor",
      at,
    );
    assert.equal(draft.ok, true);
    assert.ok(draft.id);
    const again = approveDeployment(db, draft.id!, "j.okafor", at);
    assert.equal(again.ok, false);
    const blocked = advanceDeployment(db, draft.id!, "j.okafor", at);
    assert.equal(blocked.ok, false);
    const signed = approveDeployment(db, draft.id!, "a.chen", at);
    assert.equal(signed.ok, true);
    assert.equal(advanceDeployment(db, draft.id!, "a.chen", at).message, "Build signed. The artifact is ready for canary.");
  });

  it("queues offline gateways and converges them on reconnect", () => {
    const db = fresh();
    const approved = approveDeployment(db, "dep-bess", "a.chen", at);
    assert.equal(approved.ok, true);
    assert.match(advanceDeployment(db, "dep-bess", "a.chen", at).message, /Build signed/);
    assert.match(advanceDeployment(db, "dep-bess", "a.chen", at).message, /Canary promoted/);
    assert.equal(appVersion(db, "nr-gw-01", "bess.imbalance_monitor"), "1.0.0");
    assert.match(advanceDeployment(db, "dep-bess", "a.chen", at).message, /offline gateway/);
    assert.equal(db.deployments.find((item) => item.id === "dep-bess")?.nodes.find((item) => item.nodeId === "nr-gw-02")?.status, "queued");
    const done = advanceDeployment(db, "dep-bess", "a.chen", at);
    assert.equal(done.ok, true);
    assert.equal(db.deployments.find((item) => item.id === "dep-bess")?.stage, "complete");
    const back = reconnectNode(db, "nr-gw-02", "j.okafor", at);
    assert.match(back.message, /converged/);
    assert.equal(appVersion(db, "nr-gw-02", "bess.imbalance_monitor"), "1.0.0");
    assert.equal(node(db, "nr-gw-02").connectivity, "online");
  });

  it("rolls a failed wave back automatically and restores the previous version", () => {
    const db = fresh();
    assert.equal(appVersion(db, "cr-gw-01", "alarm.correlator"), "2.1.0");
    const result = advanceDeployment(db, "dep-alarm", "j.okafor", at);
    assert.equal(result.tone, "warn");
    assert.match(result.message, /hc-gw-02/);
    assert.match(result.message, /Automatic rollback/);
    const campaign = db.deployments.find((item) => item.id === "dep-alarm");
    assert.equal(campaign?.stage, "rolled_back");
    assert.equal(appVersion(db, "cr-gw-01", "alarm.correlator"), "2.0.4");
    assert.equal(appVersion(db, "nr-gw-01", "alarm.correlator"), "2.0.4");
    assert.equal(appVersion(db, "hc-gw-02", "alarm.correlator"), "2.0.4");
  });

  it("blocks promotion when automatic rollback is off", () => {
    const db = fresh();
    const campaign = db.deployments.find((item) => item.id === "dep-alarm");
    assert.ok(campaign);
    campaign.autoRollback = false;
    const result = advanceDeployment(db, "dep-alarm", "j.okafor", at);
    assert.equal(result.tone, "warn");
    assert.equal(campaign.blocked, true);
    assert.equal(campaign.stage, "wave1");
    assert.equal(appVersion(db, "cr-gw-01", "alarm.correlator"), "2.1.0");
    const stuck = advanceDeployment(db, "dep-alarm", "j.okafor", at);
    assert.equal(stuck.ok, false);
    const rolled = rollbackDeployment(db, "dep-alarm", "a.chen", at);
    assert.equal(rolled.ok, true);
    assert.equal(appVersion(db, "cr-gw-01", "alarm.correlator"), "2.0.4");
  });

  it("publishes the canonical model onto gateways", () => {
    const db = fresh();
    const opened = createDeployment(
      db,
      { appId: "packet.model", siteIds: ["north-ridge"], autoRollback: true },
      "a.chen",
      at,
    );
    assert.equal(opened.ok, true);
    approveDeployment(db, opened.id!, "j.okafor", at);
    advanceDeployment(db, opened.id!, "j.okafor", at);
    const canary = advanceDeployment(db, opened.id!, "j.okafor", at);
    assert.match(canary.message, /Canary promoted/);
    assert.equal(node(db, "nr-gw-01").modelVersion, "3.4");
    advanceDeployment(db, opened.id!, "j.okafor", at);
    assert.equal(db.deployments.find((item) => item.id === opened.id)?.nodes.find((item) => item.nodeId === "nr-gw-02")?.status, "queued");
    reconnectNode(db, "nr-gw-02", "j.okafor", at);
    assert.equal(node(db, "nr-gw-02").modelVersion, "3.4");
  });
});

describe("assignWaves", () => {
  it("puts the first online gateway in canary and splits the rest", () => {
    const waves = assignWaves([
      { id: "b", name: "b", connectivity: "offline" },
      { id: "a", name: "a", connectivity: "online" },
      { id: "c", name: "c", connectivity: "degraded" },
      { id: "d", name: "d", connectivity: "online" },
    ]);
    assert.deepEqual(
      waves.map((wave) => [wave.id, wave.wave]),
      [
        ["a", "canary"],
        ["b", "wave1"],
        ["c", "wave1"],
        ["d", "fleet"],
      ],
    );
  });
});
