/** Positions are percentages of the fleet map. */
export const PLACES: Record<string, { x: number; y: number }> = {
  chisholm: { x: 24, y: 64 },
  hale: { x: 44, y: 36 },
  "north-ridge": { x: 60, y: 32 },
  mercer: { x: 76, y: 44 },
};

export const LINKS: [string, string][] = [
  ["chisholm", "hale"],
  ["hale", "north-ridge"],
  ["north-ridge", "mercer"],
  ["hale", "mercer"],
];

export function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function series(seed: string, points = 42): number[] {
  let h = hashSeed(seed);
  const values: number[] = [];
  for (let i = 0; i < points; i += 1) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    const wave = Math.sin(i / 5.5 + (h % 7)) * 0.18;
    const noise = ((h % 1000) / 1000 - 0.5) * 0.22;
    values.push(Math.min(0.92, Math.max(0.08, 0.48 + wave + noise)));
  }
  return values;
}

export function reading(seed: string, unit: string, tick = 0): string {
  const values = series(seed);
  const last = values[(values.length - 1 + tick) % values.length];
  const scale = unit === "kW" ? 840 : unit === "%" ? 100 : unit === "Hz" ? 0.4 : 120;
  const base = unit === "Hz" ? 59.9 : unit === "%" ? 20 : 40;
  const value = base + last * scale;
  const digits = unit === "Hz" ? 2 : unit === "%" ? 0 : 0;
  return `${value.toFixed(digits)} ${unit}`;
}
