import fs from "fs";
import path from "path";
import {
  advanceDeployment,
  approveDeployment,
  bulkApprove,
  createDeployment,
  reconnectNode,
  reviewTag,
  rollbackDeployment,
} from "./domain";
import { createSeed } from "./seed";
import type { CreateDeploymentInput, Db, Result, ReviewDecision } from "./types";

const globalStore = globalThis as unknown as { packetDb?: Db };

function stateFile(): string {
  return process.env.PACKET_STATE_PATH ?? path.join(process.cwd(), "data", "state.json");
}

function persist(db: Db) {
  globalStore.packetDb = db;
  if (process.env.VERCEL) return;
  try {
    const file = stateFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(db));
  } catch {
    // The in-memory copy still serves this process. Vercel and read-only
    // filesystems hit this path on purpose.
  }
}

function load(): Db {
  if (globalStore.packetDb) return globalStore.packetDb;
  if (!process.env.VERCEL) {
    try {
      const file = stateFile();
      if (fs.existsSync(file)) {
        globalStore.packetDb = JSON.parse(fs.readFileSync(file, "utf8")) as Db;
        return globalStore.packetDb;
      }
    } catch {
      // Fall through to the seed.
    }
  }
  globalStore.packetDb = createSeed();
  return globalStore.packetDb;
}

export function getDb(): Db {
  return structuredClone(load());
}

function commit(result: Result, db: Db): Result {
  if (result.ok) persist(db);
  return result;
}

function stamp(): string {
  return new Date().toISOString();
}

export function bulkApproveTags(siteId: string, actor: string): Result {
  const db = load();
  return commit(bulkApprove(db, siteId, actor, stamp()), db);
}

export function reviewOne(
  input: { tagId: string; decision: ReviewDecision; assetId?: string; unit?: string; role?: string },
  actor: string,
): Result {
  const db = load();
  return commit(reviewTag(db, input, actor, stamp()), db);
}

export function openDeployment(
  input: CreateDeploymentInput,
  actor: string,
): Result & { id?: string } {
  const db = load();
  const result = createDeployment(db, input, actor, stamp());
  if (result.ok) persist(db);
  return result;
}

export function approveCampaign(id: string, actor: string): Result {
  const db = load();
  return commit(approveDeployment(db, id, actor, stamp()), db);
}

export function advanceCampaign(id: string, actor: string): Result {
  const db = load();
  return commit(advanceDeployment(db, id, actor, stamp()), db);
}

export function rollbackCampaign(id: string, actor: string): Result {
  const db = load();
  return commit(rollbackDeployment(db, id, actor, stamp()), db);
}

export function reconnectGateway(nodeId: string, actor: string): Result {
  const db = load();
  return commit(reconnectNode(db, nodeId, actor, stamp()), db);
}

export function resetDemo(): void {
  persist(createSeed());
}
