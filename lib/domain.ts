import { HIGH_CONFIDENCE } from "./constants";
import type {
  Asset,
  AssetClass,
  Connectivity,
  CreateDeploymentInput,
  Db,
  Deployment,
  DeploymentNode,
  GatewayNode,
  Result,
  ReviewDecision,
  Tag,
  Wave,
} from "./types";

const fail = (message: string): Result => ({ ok: false, tone: "bad", message });
const ok = (message: string): Result => ({ ok: true, tone: "ok", message });
const warn = (message: string): Result => ({ ok: true, tone: "warn", message });

export function bumpVersion(version: string): string {
  const [major, minor = "0"] = version.split(".");
  return `${major}.${Number(minor) + 1}`;
}

export function assetById(db: Db, id: string): Asset | undefined {
  return db.assets.find((asset) => asset.id === id);
}

export function siteAssetClasses(db: Db, siteId: string): AssetClass[] {
  const classes = new Set<AssetClass>();
  for (const tag of db.tags) {
    if (tag.siteId !== siteId || tag.status !== "accepted" || !tag.mapping) continue;
    const asset = assetById(db, tag.mapping.assetId);
    if (asset) classes.add(asset.assetClass);
  }
  return [...classes];
}

export function siteEligible(db: Db, siteId: string, bindsTo: AssetClass | null): boolean {
  if (!bindsTo) return true;
  return siteAssetClasses(db, siteId).includes(bindsTo);
}

export function assignWaves(
  nodes: { id: string; name: string; connectivity: Connectivity }[],
): { id: string; wave: Wave }[] {
  const sorted = [...nodes].sort((a, b) => a.name.localeCompare(b.name));
  if (sorted.length === 0) return [];
  const canary = sorted.find((node) => node.connectivity === "online") ?? sorted[0];
  const rest = sorted.filter((node) => node.id !== canary.id);
  const wave1Count = rest.length === 0 ? 0 : Math.ceil(rest.length / 2);
  return [
    { id: canary.id, wave: "canary" },
    ...rest.slice(0, wave1Count).map((node) => ({ id: node.id, wave: "wave1" as const })),
    ...rest.slice(wave1Count).map((node) => ({ id: node.id, wave: "fleet" as const })),
  ];
}

function audit(db: Db, at: string, actor: string, message: string, href?: string) {
  db.audit.unshift({
    id: `aud-${Date.now().toString(36)}-${db.audit.length}`,
    at,
    actor,
    message,
    href,
  });
}

function bumpSite(db: Db, siteId: string) {
  const site = db.sites.find((item) => item.id === siteId);
  if (!site) return;
  site.modelVersion = bumpVersion(site.modelVersion);
}

export function bulkApprove(db: Db, siteId: string, actor: string, at: string): Result {
  const site = db.sites.find((item) => item.id === siteId);
  if (!site) return fail("That site is not in the fleet.");
  const chosen = db.tags.filter(
    (tag) =>
      tag.siteId === siteId &&
      tag.status === "pending" &&
      tag.proposal.confidence >= HIGH_CONFIDENCE,
  );
  if (chosen.length === 0) {
    return fail("No high-confidence tags are waiting on this site.");
  }
  for (const tag of chosen) {
    applyMapping(tag, actor, at, "proposal");
  }
  bumpSite(db, siteId);
  const version = db.sites.find((item) => item.id === siteId)?.modelVersion;
  const message = `Approved ${chosen.length} high-confidence tag${chosen.length === 1 ? "" : "s"} into ${site.name} model v${version}.`;
  audit(db, at, actor, message, `/sites/${siteId}`);
  return ok(message);
}

function applyMapping(tag: Tag, actor: string, at: string, source: "proposal" | "corrected", override?: {
  assetId: string;
  unit: string;
  role: string;
  hierarchy: string;
}) {
  const proposal = tag.proposal;
  const mapping = override ?? {
    assetId: proposal.assetId,
    unit: proposal.unit,
    role: proposal.role,
    hierarchy: proposal.hierarchy,
  };
  tag.status = "accepted";
  tag.mapping = { ...mapping, source };
  tag.reviewedBy = actor;
  tag.reviewedAt = at;
  delete tag.driftReason;
}

export function reviewTag(
  db: Db,
  input: {
    tagId: string;
    decision: ReviewDecision;
    assetId?: string;
    unit?: string;
    role?: string;
  },
  actor: string,
  at: string,
): Result {
  const tag = db.tags.find((item) => item.id === input.tagId);
  if (!tag) return fail("That tag is not in the discovery set.");
  const site = db.sites.find((item) => item.id === tag.siteId);
  if (!site) return fail("That site is not in the fleet.");

  if (input.decision === "reject") {
    tag.status = "rejected";
    delete tag.mapping;
    delete tag.driftReason;
    tag.reviewedBy = actor;
    tag.reviewedAt = at;
    const message = `Rejected ${tag.rawName}. It stays out of the canonical model.`;
    audit(db, at, actor, message, `/sites/${tag.siteId}`);
    return ok(message);
  }

  if (input.decision === "accept") {
    applyMapping(tag, actor, at, "proposal");
    bumpSite(db, tag.siteId);
    const message = `Accepted ${tag.rawName} as ${tag.mapping?.hierarchy}. Model is now v${site.modelVersion}.`;
    audit(db, at, actor, message, `/sites/${tag.siteId}`);
    return ok(message);
  }

  const assetId = input.assetId?.trim() ?? "";
  const unit = input.unit?.trim() ?? "";
  const role = input.role?.trim() ?? "";
  const asset = db.assets.find((item) => item.id === assetId && item.siteId === tag.siteId);
  if (!asset) return fail("Choose an asset on this site.");
  if (!unit || !role) return fail("Unit and role are both required.");
  if (role.length > 80 || unit.length > 24) return fail("Keep the unit and role short.");
  const hierarchy = `${asset.name} / ${role}`;
  applyMapping(tag, actor, at, "corrected", { assetId: asset.id, unit, role, hierarchy });
  bumpSite(db, tag.siteId);
  const message = `Corrected ${tag.rawName} to ${hierarchy} (${unit}). Model is now v${site.modelVersion}.`;
  audit(db, at, actor, message, `/model?asset=${asset.id}`);
  return ok(message);
}

function applyDesired(node: GatewayNode, dep: Deployment) {
  if (dep.kind === "model") {
    const version = dep.siteVersions?.[node.siteId] ?? dep.version;
    node.modelVersion = version;
    node.configVersion = version;
    return;
  }
  const existing = node.apps.find((app) => app.name === dep.appName);
  if (existing) existing.version = dep.version;
  else node.apps.push({ name: dep.appName, version: dep.version, cpu: 16 });
}

function revertDesired(node: GatewayNode, dep: Deployment, previous: string | null) {
  if (dep.kind === "model") {
    if (previous) {
      node.modelVersion = previous;
      node.configVersion = previous;
    }
    return;
  }
  if (!previous) {
    node.apps = node.apps.filter((app) => app.name !== dep.appName);
    return;
  }
  const existing = node.apps.find((app) => app.name === dep.appName);
  if (existing) existing.version = previous;
  else node.apps.push({ name: dep.appName, version: previous, cpu: 12 });
}

export function createDeployment(
  db: Db,
  input: CreateDeploymentInput,
  actor: string,
  at: string,
): Result & { id?: string } {
  const app = db.apps.find((item) => item.id === input.appId);
  if (!app) return fail("Choose an application.");
  const siteIds = [...new Set(input.siteIds)].filter(Boolean);
  if (siteIds.length === 0) return fail("Select at least one site.");
  const sites = siteIds.map((id) => db.sites.find((site) => site.id === id));
  if (sites.some((site) => !site)) return fail("One of those sites is not in the fleet.");

  for (const siteId of siteIds) {
    if (!siteEligible(db, siteId, app.bindsTo)) {
      const site = db.sites.find((item) => item.id === siteId);
      return fail(
        `${site?.name ?? siteId} has no accepted ${app.bindsTo} tags yet. Confirm the mapping first.`,
      );
    }
  }

  const version =
    app.kind === "model"
      ? uniqueVersion(sites.map((site) => site!.modelVersion))
      : input.version?.trim() ?? "";
  if (app.kind !== "model" && !app.versions.includes(version)) {
    return fail("That version is not in the catalog.");
  }

  const targetNodes = db.nodes.filter((node) => siteIds.includes(node.siteId));
  if (targetNodes.length === 0) return fail("Those sites have no gateways.");
  const waves = assignWaves(targetNodes);
  const siteVersions =
    app.kind === "model"
      ? Object.fromEntries(sites.map((site) => [site!.id, site!.modelVersion]))
      : undefined;

  const nodes: DeploymentNode[] = waves.map((wave) => {
    const node = targetNodes.find((item) => item.id === wave.id)!;
    const previousVersion =
      app.kind === "model"
        ? node.modelVersion
        : node.apps.find((installed) => installed.name === app.name)?.version ?? null;
    return {
      nodeId: node.id,
      wave: wave.wave,
      status: "pending",
      health: "pending",
      previousVersion,
    };
  });

  const added = nodes.filter((node) => node.previousVersion !== version).length;
  const removed = nodes.filter((node) => node.previousVersion && node.previousVersion !== version).length;
  const where = sites.map((site) => site!.name).join(", ");
  const summary =
    app.kind === "model"
      ? `Publish canonical model ${version === "per site" ? "versions" : `v${version}`} to ${where}.`
      : `Bind ${app.name}@${version} to ${app.bindsTo ?? "every asset"} at ${where}.`;

  const id = `dep-${Math.random().toString(36).slice(2, 8)}`;
  const deployment: Deployment = {
    id,
    kind: app.kind === "model" ? "model" : "application",
    appId: app.id,
    appName: app.name,
    version,
    assetClass: app.bindsTo,
    siteIds,
    siteVersions,
    author: actor,
    createdAt: at,
    approvalsRequired: 2,
    approvals: [{ by: actor, at }],
    autoRollback: input.autoRollback,
    diff: { added, removed, summary },
    stage: "draft",
    blocked: false,
    nodes,
    events: [
      {
        at,
        actor,
        message: "Opened the campaign. A second operator must approve before the build can be signed.",
      },
    ],
  };
  db.deployments.unshift(deployment);
  const message = `Opened ${app.name} ${version} for ${where}. Waiting on a second approver.`;
  audit(db, at, actor, message, `/deployments/${id}`);
  return { ...ok(message), id };
}

function uniqueVersion(versions: string[]): string {
  const distinct = [...new Set(versions)];
  return distinct.length === 1 ? distinct[0] : "per site";
}

export function approveDeployment(db: Db, id: string, actor: string, at: string): Result {
  const dep = db.deployments.find((item) => item.id === id);
  if (!dep) return fail("That campaign does not exist.");
  if (dep.stage === "rolled_back" || dep.stage === "complete") {
    return fail("This campaign is already closed.");
  }
  if (dep.approvals.some((approval) => approval.by === actor)) {
    return fail("You already approved this campaign. A different operator has to sign.");
  }
  if (dep.approvals.length >= dep.approvalsRequired) return fail("Approvals are already complete.");
  dep.approvals.push({ by: actor, at });
  const message = `Approved ${dep.appName} ${dep.version}. Change control is ${dep.approvals.length}/${dep.approvalsRequired}.`;
  dep.events.push({ at, actor, message: "Approved the campaign." });
  audit(db, at, actor, message, `/deployments/${id}`);
  return ok(message);
}

function waveNodes(dep: Deployment, wave: Wave) {
  return dep.nodes.filter((node) => node.wave === wave);
}

function waveHealthy(dep: Deployment, wave: Wave): boolean {
  const nodes = waveNodes(dep, wave);
  if (nodes.length === 0) return true;
  return nodes.every((node) => node.health === "pass" || node.status === "queued");
}

function rollback(db: Db, dep: Deployment, actor: string, at: string, reason: string) {
  for (const target of dep.nodes) {
    const node = db.nodes.find((item) => item.id === target.nodeId);
    if (node && target.status === "deployed") revertDesired(node, dep, target.previousVersion);
    target.status = "rolled_back";
  }
  dep.stage = "rolled_back";
  dep.blocked = false;
  dep.events.push({ at, actor, message: reason });
  audit(db, at, actor, `${dep.appName} ${dep.version}: ${reason}`, `/deployments/${dep.id}`);
}

function promote(db: Db, dep: Deployment, wave: Wave): { failed?: string; queued: number; passed: number } {
  let failed: string | undefined;
  let queued = 0;
  let passed = 0;
  for (const target of waveNodes(dep, wave)) {
    const node = db.nodes.find((item) => item.id === target.nodeId);
    if (!node || node.connectivity === "offline") {
      target.status = "queued";
      target.health = "pending";
      queued += 1;
      continue;
    }
    if (node.connectivity === "degraded") {
      target.status = "failed";
      target.health = "fail";
      failed = node.name;
      continue;
    }
    target.status = "deployed";
    target.health = "pass";
    applyDesired(node, dep);
    passed += 1;
  }
  return { failed, queued, passed };
}

function nextWave(dep: Deployment, after: Wave | "build"): Wave | "complete" {
  const order: Wave[] = ["canary", "wave1", "fleet"];
  const start = after === "build" ? 0 : order.indexOf(after) + 1;
  for (let i = start; i < order.length; i += 1) {
    if (waveNodes(dep, order[i]).length > 0) return order[i];
  }
  return "complete";
}

export function advanceDeployment(db: Db, id: string, actor: string, at: string): Result {
  const dep = db.deployments.find((item) => item.id === id);
  if (!dep) return fail("That campaign does not exist.");
  if (dep.stage === "complete") return fail("This rollout is already complete.");
  if (dep.stage === "rolled_back") return fail("This campaign was rolled back.");
  if (dep.blocked) return fail("Health checks failed. Roll the campaign back before promoting again.");
  if (dep.approvals.length < dep.approvalsRequired) {
    return fail("A second approver has to sign before this build can start.");
  }

  if (dep.stage === "draft") {
    dep.stage = "build";
    const message = "Build signed. The artifact is ready for canary.";
    dep.events.push({ at, actor, message });
    audit(db, at, actor, `${dep.appName} ${dep.version}: ${message}`, `/deployments/${dep.id}`);
    return ok(message);
  }

  if (dep.stage === "canary" || dep.stage === "wave1" || dep.stage === "fleet") {
    const current = dep.stage;
    if (!waveHealthy(dep, current)) {
      dep.blocked = true;
      return warn(`Health checks on ${current} have not passed.`);
    }
    if (current === "fleet") {
      dep.stage = "complete";
      const message = "Fleet rollout finished. Offline nodes stay queued until they reconnect.";
      dep.events.push({ at, actor, message });
      audit(db, at, actor, `${dep.appName} ${dep.version}: ${message}`, `/deployments/${dep.id}`);
      return ok(message);
    }
    const upcoming = nextWave(dep, current);
    if (upcoming === "complete") {
      dep.stage = "complete";
      const message = "Rollout finished. Every reached gateway is healthy.";
      dep.events.push({ at, actor, message });
      audit(db, at, actor, `${dep.appName} ${dep.version}: ${message}`, `/deployments/${dep.id}`);
      return ok(message);
    }
    return enterWave(db, dep, upcoming, actor, at);
  }

  const upcoming = nextWave(dep, "build");
  return enterWave(db, dep, upcoming, actor, at);
}

function enterWave(db: Db, dep: Deployment, wave: Wave | "complete", actor: string, at: string): Result {
  if (wave === "complete") {
    dep.stage = "complete";
    const message = "Rollout finished.";
    dep.events.push({ at, actor, message });
    return ok(message);
  }
  const result = promote(db, dep, wave);
  dep.stage = wave;
  if (result.failed) {
    const reason = `Health check failed on ${result.failed}.`;
    if (dep.autoRollback) {
      rollback(db, dep, actor, at, `${reason} Automatic rollback restored the previous version.`);
      return warn(`${reason} Automatic rollback restored the previous version.`);
    }
    dep.blocked = true;
    const message = `${reason} Promotion is blocked until you roll it back.`;
    dep.events.push({ at, actor, message });
    audit(db, at, actor, `${dep.appName} ${dep.version}: ${message}`, `/deployments/${dep.id}`);
    return warn(message);
  }
  const queued =
    result.queued > 0 ? ` ${result.queued} offline gateway${result.queued === 1 ? "" : "s"} queued.` : "";
  const message = `${wave === "wave1" ? "Wave 1" : wave === "canary" ? "Canary" : "Fleet"} promoted.${queued}`;
  dep.events.push({ at, actor, message });
  audit(db, at, actor, `${dep.appName} ${dep.version}: ${message}`, `/deployments/${dep.id}`);
  return ok(message.trim());
}

export function rollbackDeployment(db: Db, id: string, actor: string, at: string): Result {
  const dep = db.deployments.find((item) => item.id === id);
  if (!dep) return fail("That campaign does not exist.");
  if (dep.stage === "rolled_back") return fail("This campaign is already rolled back.");
  rollback(db, dep, actor, at, "Rolled back by an operator. Gateways returned to the previous version.");
  return ok(`Rolled back ${dep.appName} ${dep.version}. Gateways returned to the previous version.`);
}

const WAVE_RANK: Record<Wave, number> = { canary: 2, wave1: 3, fleet: 4 };
const STAGE_RANK: Record<Deployment["stage"], number> = {
  draft: 0,
  build: 1,
  canary: 2,
  wave1: 3,
  fleet: 4,
  complete: 5,
  rolled_back: -1,
};

export function reconnectNode(db: Db, nodeId: string, actor: string, at: string): Result {
  const node = db.nodes.find((item) => item.id === nodeId);
  if (!node) return fail("That gateway is not in the registry.");
  const wasOffline = node.connectivity === "offline";
  if (node.connectivity === "online" && node.uplink === "up") {
    return fail(`${node.name} is already online.`);
  }
  node.connectivity = "online";
  node.uplink = "up";
  let converged = 0;
  if (wasOffline) {
    for (const dep of db.deployments) {
      if (dep.stage === "draft" || dep.stage === "build" || dep.stage === "rolled_back") continue;
      const target = dep.nodes.find((item) => item.nodeId === node.id && item.status === "queued");
      if (!target) continue;
      if (STAGE_RANK[dep.stage] < WAVE_RANK[target.wave]) continue;
      target.status = "deployed";
      target.health = "pass";
      applyDesired(node, dep);
      converged += 1;
      dep.events.push({
        at,
        actor,
        message: `${node.name} reconnected and converged to ${dep.appName} ${dep.version}.`,
      });
    }
  }
  const extra =
    converged > 0
      ? ` ${converged} queued deployment${converged === 1 ? "" : "s"} converged.`
      : " No queued deployment was waiting.";
  const message = `${node.name} is back online.${extra}`;
  audit(db, at, actor, message, `/fleet/${node.id}`);
  return ok(message);
}
