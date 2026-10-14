"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OPERATORS } from "@/lib/constants";
import {
  advanceDeployment,
  approveDeployment,
  bulkApprove,
  createDeployment,
  reconnectNode,
  reviewTag,
  rollbackDeployment,
} from "@/lib/domain";
import { clearDemoPath } from "@/lib/seen";
import { paths } from "@/lib/paths";
import { createSeed } from "@/lib/seed";
import type { CreateDeploymentInput, Db, Result, ReviewDecision } from "@/lib/types";

const STORAGE_KEY = "packet-io.v1";

export type Notice = { text: string; tone: "ok" | "bad" | "warn" };

type ReviewInput = {
  tagId: string;
  decision: ReviewDecision;
  assetId?: string;
  unit?: string;
  role?: string;
};

type PacketApi = {
  ready: boolean;
  db: Db;
  operatorId: string;
  notice: Notice | null;
  setOperator: (id: string) => void;
  reset: () => void;
  bulkApprove: (siteId: string) => Result;
  review: (input: ReviewInput) => Result;
  openCampaign: (input: CreateDeploymentInput) => Result & { id?: string };
  approve: (id: string) => Result;
  advance: (id: string) => Result;
  rollback: (id: string) => Result;
  reconnect: (nodeId: string) => Result;
};

const PacketContext = createContext<PacketApi | null>(null);

function readStorage(): { db: Db; operatorId: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { db?: Db; operatorId?: string };
    if (!parsed.db?.sites || !parsed.db.tags || !parsed.db.deployments) return null;
    const operatorId = OPERATORS.some((operator) => operator.id === parsed.operatorId)
      ? parsed.operatorId!
      : OPERATORS[0].id;
    return { db: parsed.db, operatorId };
  } catch {
    return null;
  }
}

export function PacketProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [db, setDb] = useState<Db>(() => createSeed());
  const [operatorId, setOperatorId] = useState(OPERATORS[0].id);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    const saved = readStorage();
    if (saved) {
      setDb(saved.db);
      setOperatorId(saved.operatorId);
    }
    setReady(true);
  }, []);

  function write(nextDb: Db, nextOperator = operatorId) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ db: nextDb, operatorId: nextOperator }));
    setDb(nextDb);
    setOperatorId(nextOperator);
  }

  function apply(run: (draft: Db, actor: string, at: string) => Result): Result {
    const draft = structuredClone(db);
    const result = run(draft, operatorId, new Date().toISOString());
    if (result.ok) write(draft);
    setNotice({ text: result.message, tone: result.tone });
    return result;
  }

  const api: PacketApi = {
    ready,
    db,
    operatorId,
    notice,
    setOperator(id) {
      if (!OPERATORS.some((operator) => operator.id === id)) return;
      write(db, id);
    },
    reset() {
      const fresh = createSeed();
      write(fresh, OPERATORS[0].id);
      clearDemoPath();
      setNotice({ text: "Demo fleet restored.", tone: "ok" });
      router.push(paths.home);
    },
    bulkApprove(siteId) {
      return apply((draft, actor, at) => bulkApprove(draft, siteId, actor, at));
    },
    review(input) {
      return apply((draft, actor, at) => reviewTag(draft, input, actor, at));
    },
    openCampaign(input) {
      const draft = structuredClone(db);
      const result = createDeployment(draft, input, operatorId, new Date().toISOString());
      setNotice({ text: result.message, tone: result.tone });
      if (result.ok) {
        write(draft);
        if (result.id) router.push(paths.deployment(result.id));
      }
      return result;
    },
    approve(id) {
      return apply((draft, actor, at) => approveDeployment(draft, id, actor, at));
    },
    advance(id) {
      return apply((draft, actor, at) => advanceDeployment(draft, id, actor, at));
    },
    rollback(id) {
      return apply((draft, actor, at) => rollbackDeployment(draft, id, actor, at));
    },
    reconnect(nodeId) {
      return apply((draft, actor, at) => reconnectNode(draft, nodeId, actor, at));
    },
  };

  return <PacketContext.Provider value={api}>{children}</PacketContext.Provider>;
}

export function usePacket(): PacketApi {
  const value = useContext(PacketContext);
  if (!value) throw new Error("usePacket must be used inside PacketProvider");
  return value;
}
