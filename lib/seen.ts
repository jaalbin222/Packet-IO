const SEEN = "packet-io.seen";

export function readSeen(): string[] {
  try {
    const raw = sessionStorage.getItem(SEEN);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function writeSeen(paths: string[]) {
  sessionStorage.setItem(SEEN, JSON.stringify(paths));
}

export function clearDemoPath() {
  try {
    sessionStorage.removeItem(SEEN);
    window.dispatchEvent(new Event("packet-demo-clear"));
  } catch {
    /* ignore */
  }
}
