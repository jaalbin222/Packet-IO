export const paths = {
  home: "/",
  sites: "/sites",
  site: (siteId: string, tag?: string) => {
    const query = new URLSearchParams({ site: siteId });
    if (tag) query.set("tag", tag);
    return `/sites/view?${query.toString()}`;
  },
  model: (options?: { asset?: string; site?: string }) => {
    const query = new URLSearchParams();
    if (options?.asset) query.set("asset", options.asset);
    if (options?.site) query.set("site", options.site);
    const value = query.toString();
    return value ? `/model?${value}` : "/model";
  },
  fleet: "/fleet",
  node: (nodeId: string) => `/fleet/view?node=${encodeURIComponent(nodeId)}`,
  deployments: "/deployments",
  deployment: (id: string) => `/deployments/view?id=${encodeURIComponent(id)}`,
  newDeployment: "/deployments/new",
};

export function asset(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${base}${path}`;
}
