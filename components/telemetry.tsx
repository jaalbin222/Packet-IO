"use client";

import { useEffect, useMemo, useState } from "react";
import { series } from "@/lib/atlas";

export function Telemetry({
  seed,
  live,
  label,
  unit,
  caption,
}: {
  seed: string;
  live: boolean;
  label: string;
  unit: string;
  caption?: string;
}) {
  const base = useMemo(() => series(seed), [seed]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => setTick((value) => value + 1), 900);
    return () => window.clearInterval(id);
  }, [live]);

  const points = base.map((value, index) => {
    if (!live) return value;
    const wobble = Math.sin((index + tick) / 4.5) * 0.035;
    return Math.min(0.94, Math.max(0.06, value + wobble));
  });
  const last = points[points.length - 1] ?? 0.5;
  const scale = unit === "Hz" ? 0.35 : unit === "%" ? 80 : 920;
  const origin = unit === "Hz" ? 59.92 : unit === "%" ? 18 : 120;
  const digits = unit === "Hz" ? 2 : 0;
  const text = `${(origin + last * scale).toFixed(digits)} ${unit}`;
  const d = points
    .map((value, index) => {
      const x = (index / Math.max(1, points.length - 1)) * 240;
      const y = 72 - value * 60;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <figure className={`trace ${live ? "is-live" : "is-held"}`}>
      <figcaption>
        <span>{label}</span>
        <b>{text}</b>
      </figcaption>
      <svg viewBox="0 0 240 80" role="img" aria-label={`${label} ${text}`}>
        <path d={d} />
        {!live ? <rect className="trace__hold" x="0" y="0" width="240" height="80" /> : null}
      </svg>
      {caption ? <small>{caption}</small> : null}
    </figure>
  );
}
