export type SiteKind = "Solar" | "BESS" | "Wind" | "Substation";

export type AssetClass =
  | "Feeder"
  | "Inverter"
  | "PCS"
  | "Battery rack"
  | "Cabinet"
  | "Met station"
  | "Transformer"
  | "Turbine"
  | "Protection"
  | "Breaker";

export type Protocol = "Modbus" | "OPC-UA" | "DNP3" | "S7";

export type TagStatus = "pending" | "accepted" | "rejected" | "drift";

export type Connectivity = "online" | "offline" | "degraded";

export type Wave = "canary" | "wave1" | "fleet";

export type DeploymentStage =
  | "draft"
  | "build"
  | "canary"
  | "wave1"
  | "fleet"
  | "complete"
  | "rolled_back";

export type AppKind = "analytics" | "automation" | "controls" | "model";

export type Operator = {
  id: string;
  name: string;
  role: string;
};

export type Site = {
  id: string;
  name: string;
  kind: SiteKind;
  region: string;
  capacity: string;
  modelVersion: string;
  scada: string;
  historian: string;
};

export type Device = {
  id: string;
  siteId: string;
  name: string;
  kind: string;
  vendor: string;
  protocol: Protocol;
};

export type Asset = {
  id: string;
  siteId: string;
  parentId: string | null;
  name: string;
  assetClass: AssetClass;
  oem: string;
};

export type Mapping = {
  assetId: string;
  unit: string;
  role: string;
  hierarchy: string;
  source: "proposal" | "corrected";
};

export type Proposal = {
  assetId: string;
  unit: string;
  role: string;
  hierarchy: string;
  confidence: number;
  reasoning: string;
  signals: string[];
  template?: string;
};

export type Tag = {
  id: string;
  siteId: string;
  deviceId: string;
  rawName: string;
  protocol: Protocol;
  sample: string;
  status: TagStatus;
  proposal: Proposal;
  mapping?: Mapping;
  reviewedBy?: string;
  reviewedAt?: string;
  driftReason?: string;
};

export type GatewayApp = {
  name: string;
  version: string;
  cpu: number;
};

export type GatewayNode = {
  id: string;
  siteId: string;
  name: string;
  connectivity: Connectivity;
  uplink: "up" | "down";
  runtimeVersion: string;
  configVersion: string;
  modelVersion: string;
  certExpires: string;
  acquisition: { protocol: string; rate: string }[];
  apps: GatewayApp[];
};

export type CatalogApp = {
  id: string;
  name: string;
  kind: AppKind;
  summary: string;
  bindsTo: AssetClass | null;
  versions: string[];
};

export type DeploymentNode = {
  nodeId: string;
  wave: Wave;
  status: "pending" | "deployed" | "queued" | "failed" | "rolled_back";
  health: "pending" | "pass" | "fail";
  previousVersion: string | null;
};

export type Deployment = {
  id: string;
  kind: "application" | "model";
  appId: string;
  appName: string;
  version: string;
  assetClass: AssetClass | null;
  siteIds: string[];
  siteVersions?: Record<string, string>;
  author: string;
  createdAt: string;
  approvalsRequired: number;
  approvals: { by: string; at: string }[];
  autoRollback: boolean;
  diff: { added: number; removed: number; summary: string };
  stage: DeploymentStage;
  blocked: boolean;
  nodes: DeploymentNode[];
  events: { at: string; actor: string; message: string }[];
};

export type AuditEvent = {
  id: string;
  at: string;
  actor: string;
  message: string;
  href?: string;
};

export type Db = {
  sites: Site[];
  devices: Device[];
  assets: Asset[];
  tags: Tag[];
  nodes: GatewayNode[];
  apps: CatalogApp[];
  deployments: Deployment[];
  audit: AuditEvent[];
};

export type Result = {
  ok: boolean;
  tone: "ok" | "bad" | "warn";
  message: string;
};

export type ReviewDecision = "accept" | "correct" | "reject";

export type CreateDeploymentInput = {
  appId: string;
  version?: string;
  siteIds: string[];
  autoRollback: boolean;
};
