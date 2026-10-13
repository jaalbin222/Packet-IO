# Packet.io

Packet is the data infrastructure for applications that run on power assets. It sits on industrial gateways at solar, battery, wind, and substation sites, turns raw SCADA tags into one validated asset model, and deploys analytics, automation, and controls against that model.

A tag like `INV3_ACPWR_L1` carries no unit, asset, or hierarchy. Mapping it by hand is the expensive part of every edge project — often hundreds of engineering hours per site — and the same work is repeated at the next site because the names do not match. Packet proposes a meaning for each tag, asks a person to confirm the ones it is not sure about, and then treats the confirmed model as the address every later deployment uses.

This repository is a working console for that loop. It is seeded with a four-site design-partner fleet. Proposals, device discovery, and gateway telemetry are fixture data standing in for the on-site inference engine and runtime.

## Core flows

1. **Map and contextualize.** Open a site, read why each raw tag was proposed, approve every high-confidence mapping in one action (0.90 and above), and accept, correct, or reject the rest. Drifted tags come back to the same queue. Each confirmation bumps that site’s canonical model version.
2. **Read the canonical model.** Confirmed tags show up under their asset, with lineage back to the raw name, unit, reviewer, and protocol.
3. **Roll a change across the fleet.** Open a campaign against an asset class (or publish the model itself). The author is the first approver; a second operator has to sign. The rollout moves Build → Canary → Wave 1 → Fleet. Offline gateways queue and converge on reconnect. A failed health check rolls the campaign back automatically when that option is on.
4. **See the on-site runtime.** A gateway shows acquisition rates, sandboxed applications, certificate expiry, and whether it is buffering because the uplink is down.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No database or environment variables are required.

Two operators are built in, switched from the header: **J. Okafor** (fleet engineer) and **A. Chen** (change approver). Use both when a campaign needs a second signature.

`npm test` checks the review, approval, rollout, rollback, and reconnect rules. `npm run build` produces the production build.

Demo edits are stored in `data/state.json` on the machine running the app. **Reset demo data** in the sidebar restores the seed.

### A path through the seed

- Chisholm Ridge has the mixed review queue (`INV3_ACPWR_L1` at 0.94, `AI_0042` at 0.51, a drifted frequency tag).
- North Ridge is mostly mapped. `bess.imbalance_monitor` 1.0.0 is waiting on A. Chen. `nr-gw-02` is offline and will queue, then converge when you mark it reconnected. `nr-gw-01` is online with its uplink down, buffering locally.
- `alarm.correlator` 2.1.0 has passed canary on `cr-gw-01`. Promoting it to wave 1 hits degraded gateway `hc-gw-02` and rolls the campaign back.

## Deploy

The app is a Next.js project and deploys on Vercel with the default settings: install `npm install`, build `npm run build`, no environment variables.

On Vercel the store stays in memory for the life of a server instance and reseeds on a cold start, because serverless instances do not have a durable disk. Locally, the same code writes `data/state.json`. A production deployment would replace `lib/store.ts` with Postgres or Turso; the domain rules in `lib/domain.ts` do not need to change.

## Implemented

- Read-only discovery inventory for sites, devices, and raw tags
- Confidence-tiered review: bulk approve, accept, correct, reject, with the reasoning and the signals that produced the proposal
- Versioned canonical model and raw-tag lineage
- Drift flags returned to the review queue
- Gateway registry: connectivity, runtime, model version, certificates, acquisition, sandboxed apps, uplink loss
- Model-addressed campaigns, two-person approval, staged rollout, health-check failure, automatic or manual rollback
- Offline queue and convergence on reconnect
- Audit trail on reviews and campaigns

## Deferred

- Live protocol connectors (Modbus, OPC-UA, DNP3, S7) and a real inference engine. Proposals are seeded.
- The headless gateway runtime, container sandbox, and local feature engineering. The runtime screen is the control-plane view of that node.
- Certificate renewal, signed artifacts, and SSO. The header switches a demo operator; it is not authentication.
- Closed-loop control. Setpoint campaigns are advisory and do not write to the control network.
- Durable multi-tenant storage, natural-language queries, and fleet analytics.

## Stack

Next.js (App Router), React, TypeScript. Domain state is a JSON document seeded in `lib/seed.ts`. No native database driver, so the app installs and runs with one command.
