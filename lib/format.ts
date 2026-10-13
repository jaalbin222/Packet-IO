import type { Deployment, DeploymentStage, Wave } from "./types";

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export function formatDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function certTone(iso: string, now = new Date()): "ok" | "warn" | "bad" {
  const date = new Date(iso);
  const days = (date.getTime() - now.getTime()) / 86_400_000;
  if (days < 0) return "bad";
  if (days < 45) return "warn";
  return "ok";
}

export function readNotice(sp: {
  notice?: string;
  tone?: string;
}): { text: string; tone: "ok" | "bad" | "warn" } | null {
  if (!sp.notice) return null;
  const tone = sp.tone === "bad" || sp.tone === "warn" ? sp.tone : "ok";
  return { text: sp.notice, tone };
}

const STAGE_RANK: Record<DeploymentStage, number> = {
  draft: 0,
  build: 1,
  canary: 2,
  wave1: 3,
  fleet: 4,
  complete: 5,
  rolled_back: -1,
};

export function stageLabel(stage: DeploymentStage): string {
  switch (stage) {
    case "draft":
      return "Draft";
    case "build":
      return "Build";
    case "canary":
      return "Canary";
    case "wave1":
      return "Wave 1";
    case "fleet":
      return "Fleet";
    case "complete":
      return "Complete";
    case "rolled_back":
      return "Rolled back";
  }
}

export function advanceLabel(dep: Deployment): string | null {
  if (dep.blocked || dep.stage === "complete" || dep.stage === "rolled_back") return null;
  if (dep.approvals.length < dep.approvalsRequired) return null;
  if (dep.stage === "draft") return "Sign build";
  if (dep.stage === "build") return "Promote to canary";
  const next = nextPromotion(dep);
  if (next === "wave1") return "Promote to wave 1";
  if (next === "fleet") return "Promote to fleet";
  if (next === "complete") return dep.stage === "fleet" ? "Finish rollout" : "Mark complete";
  return "Advance";
}

export function nextPromotion(dep: Deployment): Wave | "complete" | null {
  const order: Wave[] = ["canary", "wave1", "fleet"];
  const start =
    dep.stage === "draft" || dep.stage === "build"
      ? 0
      : order.indexOf(dep.stage as Wave) + 1;
  if (dep.stage === "fleet") return "complete";
  if (dep.stage === "complete" || dep.stage === "rolled_back") return null;
  if (dep.stage === "draft") return null;
  for (let i = Math.max(0, start); i < order.length; i += 1) {
    if (dep.nodes.some((node) => node.wave === order[i])) return order[i];
  }
  return "complete";
}

export function stepState(
  dep: Deployment,
  step: "build" | Wave,
): "done" | "current" | "upcoming" | "failed" {
  if (dep.stage === "rolled_back") {
    if (step !== "build" && dep.nodes.some((node) => node.wave === step && node.health === "fail")) {
      return "failed";
    }
    if (step === "build") {
      return dep.nodes.some((node) => node.health !== "pending") ? "done" : "upcoming";
    }
    if (dep.nodes.some((node) => node.wave === step && node.health === "pass")) return "done";
    return "upcoming";
  }
  const rank = STAGE_RANK[dep.stage];
  const stepRank = step === "build" ? 1 : step === "canary" ? 2 : step === "wave1" ? 3 : 4;
  if (dep.blocked && rank === stepRank) return "failed";
  if (rank > stepRank) return "done";
  if (rank === stepRank) return "current";
  return "upcoming";
}
