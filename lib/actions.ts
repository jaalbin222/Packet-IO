"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OPERATORS } from "./constants";
import {
  advanceCampaign,
  approveCampaign,
  bulkApproveTags,
  openDeployment,
  reconnectGateway,
  resetDemo,
  reviewOne,
  rollbackCampaign,
} from "./store";
import type { Result, ReviewDecision } from "./types";

async function actorId(): Promise<string> {
  const jar = await cookies();
  const id = jar.get("packet_operator")?.value;
  return OPERATORS.some((operator) => operator.id === id) ? id! : OPERATORS[0].id;
}

function go(path: string, result: Result): never {
  const params = new URLSearchParams({ notice: result.message, tone: result.tone });
  redirect(`${path}${path.includes("?") ? "&" : "?"}${params.toString()}`);
}

export async function setOperatorAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!OPERATORS.some((operator) => operator.id === id)) return;
  const jar = await cookies();
  jar.set("packet_operator", id, { path: "/", sameSite: "lax", httpOnly: true });
  revalidatePath("/", "layout");
}

export async function resetDemoAction() {
  resetDemo();
  redirect("/?notice=Demo+fleet+restored.&tone=ok");
}

export async function bulkApproveAction(formData: FormData) {
  const siteId = String(formData.get("siteId") ?? "");
  const result = bulkApproveTags(siteId, await actorId());
  go(`/sites/${siteId}`, result);
}

export async function reviewTagAction(formData: FormData) {
  const tagId = String(formData.get("tagId") ?? "");
  const siteId = String(formData.get("siteId") ?? "");
  const decision = String(formData.get("decision") ?? "accept") as ReviewDecision;
  const result = reviewOne(
    {
      tagId,
      decision,
      assetId: String(formData.get("assetId") ?? ""),
      unit: String(formData.get("unit") ?? ""),
      role: String(formData.get("role") ?? ""),
    },
    await actorId(),
  );
  const params = new URLSearchParams({
    notice: result.message,
    tone: result.tone,
    tag: tagId,
  });
  redirect(`/sites/${siteId}?${params.toString()}`);
}

export async function createDeploymentAction(
  _prev: Result | null,
  formData: FormData,
): Promise<Result | null> {
  const siteIds = formData.getAll("siteId").map((value) => String(value));
  const result = openDeployment(
    {
      appId: String(formData.get("appId") ?? ""),
      version: String(formData.get("version") ?? ""),
      siteIds,
      autoRollback: formData.get("autoRollback") === "on",
    },
    await actorId(),
  );
  if (!result.ok || !result.id) return result;
  redirect(`/deployments/${result.id}?notice=${encodeURIComponent(result.message)}&tone=${result.tone}`);
}

export async function approveDeploymentAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  go(`/deployments/${id}`, await approveCampaign(id, await actorId()));
}

export async function advanceDeploymentAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  go(`/deployments/${id}`, await advanceCampaign(id, await actorId()));
}

export async function rollbackDeploymentAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  go(`/deployments/${id}`, await rollbackCampaign(id, await actorId()));
}

export async function reconnectNodeAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  go(`/fleet/${id}`, await reconnectGateway(id, await actorId()));
}
