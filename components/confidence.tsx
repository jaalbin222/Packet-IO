import { HIGH_CONFIDENCE } from "@/lib/constants";

export function Confidence({ value }: { value: number }) {
  const tone = value >= HIGH_CONFIDENCE ? "high" : value >= 0.75 ? "mid" : "low";
  return (
    <span className={`conf conf--${tone}`}>
      <i style={{ ["--w" as string]: `${Math.round(value * 100)}%` }} />
      <em>{value.toFixed(2)}</em>
    </span>
  );
}
