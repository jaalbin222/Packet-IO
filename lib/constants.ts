import type { Operator } from "./types";

export const HIGH_CONFIDENCE = 0.9;

export const OPERATORS: Operator[] = [
  { id: "j.okafor", name: "J. Okafor", role: "Fleet engineer" },
  { id: "a.chen", name: "A. Chen", role: "Change approver" },
];

export function operatorName(id: string): string {
  return OPERATORS.find((operator) => operator.id === id)?.name ?? id;
}
