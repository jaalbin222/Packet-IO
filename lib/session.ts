import { cookies } from "next/headers";
import { OPERATORS } from "./constants";
import type { Operator } from "./types";

export async function getOperator(): Promise<Operator> {
  const jar = await cookies();
  const id = jar.get("packet_operator")?.value;
  return OPERATORS.find((operator) => operator.id === id) ?? OPERATORS[0];
}
