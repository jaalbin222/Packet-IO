"use client";

import { useActionState, useMemo, useState } from "react";
import { createDeploymentAction } from "@/lib/actions";
import { assignWaves } from "@/lib/domain";
import type { CatalogApp, Connectivity, Result } from "@/lib/types";
import { SubmitButton } from "./submit-button";

type SiteOption = {
  id: string;
  name: string;
  kind: string;
  modelVersion: string;
  assetClasses: string[];
};

type NodeOption = {
  id: string;
  name: string;
  siteId: string;
  connectivity: Connectivity;
};

export function DeploymentForm({
  apps,
  sites,
  nodes,
}: {
  apps: CatalogApp[];
  sites: SiteOption[];
  nodes: NodeOption[];
}) {
  const [state, action] = useActionState(createDeploymentAction, null as Result | null);
  const [appId, setAppId] = useState(apps.find((app) => app.id === "alarm.correlator")?.id ?? apps[0]?.id ?? "");
  const app = apps.find((item) => item.id === appId) ?? apps[0];
  const [version, setVersion] = useState(app?.versions.at(-1) ?? "");
  const [selected, setSelected] = useState<string[]>([]);
  const [autoRollback, setAutoRollback] = useState(true);

  const eligible = useMemo(
    () => new Set(sites.filter((site) => !app?.bindsTo || site.assetClasses.includes(app.bindsTo)).map((site) => site.id)),
    [sites, app],
  );
  const chosenSites = sites.filter((site) => selected.includes(site.id) && eligible.has(site.id));
  const previewNodes = nodes.filter((node) => chosenSites.some((site) => site.id === node.siteId));
  const waves = assignWaves(previewNodes);
  const waveOf = new Map(waves.map((wave) => [wave.id, wave.wave]));

  function chooseApp(nextId: string) {
    const next = apps.find((item) => item.id === nextId);
    setAppId(nextId);
    setVersion(next?.versions.at(-1) ?? "");
    setSelected((current) => current.filter((id) => {
      if (!next?.bindsTo) return true;
      return sites.find((site) => site.id === id)?.assetClasses.includes(next.bindsTo) ?? false;
    }));
  }

  return (
    <form action={action} className="form-grid">
      <div className="panel" style={{ padding: 18 }}>
        <label className="field">
          <span>Application</span>
          <select name="appId" value={appId} onChange={(event) => chooseApp(event.target.value)}>
            {apps.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.kind}
              </option>
            ))}
          </select>
        </label>
        <p className="lede" style={{ fontSize: 14, marginTop: 8 }}>{app?.summary}</p>
        {app?.kind === "controls" ? (
          <p className="callout">Controls stay advisory here. The campaign does not write setpoints to the control network.</p>
        ) : null}
        {app?.kind === "model" ? (
          <p className="callout callout--tint">Publishes each site’s current canonical model. Version is taken from the model, not picked by hand.</p>
        ) : (
          <label className="field">
            <span>Version</span>
            <select name="version" value={version} onChange={(event) => setVersion(event.target.value)}>
              {app?.versions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
        )}
        {app?.kind === "model" ? <input type="hidden" name="version" value="" /> : null}
        <div className="field">
          <span>Sites {app?.bindsTo ? `with accepted ${app.bindsTo} tags` : ""}</span>
          <div className="sites">
            {sites.map((site) => {
              const allowed = eligible.has(site.id);
              return (
                <label key={site.id} className={`site-opt${allowed ? "" : " is-off"}`}>
                  <input
                    type="checkbox"
                    name="siteId"
                    value={site.id}
                    disabled={!allowed}
                    checked={allowed && selected.includes(site.id)}
                    onChange={(event) => {
                      setSelected((current) =>
                        event.target.checked ? [...current, site.id] : current.filter((id) => id !== site.id),
                      );
                    }}
                  />
                  <span>
                    <strong>{site.name}</strong>
                    <br />
                    <span className="muted">
                      {site.kind} · model v{site.modelVersion}
                      {allowed ? "" : ` · no accepted ${app?.bindsTo} tags yet`}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
        <label className="check" style={{ marginTop: 14 }}>
          <input
            type="checkbox"
            name="autoRollback"
            checked={autoRollback}
            onChange={(event) => setAutoRollback(event.target.checked)}
          />
          Automatic rollback if a health check fails
        </label>
        {state && !state.ok ? <p className="error">{state.message}</p> : null}
        <div className="actions">
          <SubmitButton disabled={chosenSites.length === 0}>Open campaign</SubmitButton>
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          You are recorded as the author and first approver. A second operator has to sign before the build starts.
        </p>
      </div>
      <aside className="panel preview">
        <p className="label">Resolved gateways</p>
        <h2 style={{ fontSize: 28, marginTop: 8 }}>{previewNodes.length}</h2>
        <p className="muted">Expressed once against the model, then split into canary, wave 1, and fleet.</p>
        <ul>
          {previewNodes.length === 0 ? <li>Select a site to preview the rollout.</li> : null}
          {previewNodes.map((node) => (
            <li key={node.id}>
              <span>{node.name}</span>
              <span className="num">{waveOf.get(node.id)} · {node.connectivity}</span>
            </li>
          ))}
        </ul>
      </aside>
    </form>
  );
}
