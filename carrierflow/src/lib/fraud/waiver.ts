import type { FraudLevel } from "./score";

export function extractFraudFromAuditPayload(
  payload: unknown,
): { fraudScore?: number; fraudLevel?: FraudLevel } | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  const fraudScore =
    typeof data.fraudScore === "number" ? data.fraudScore : undefined;
  const fraudLevel =
    data.fraudLevel === "low" ||
    data.fraudLevel === "medium" ||
    data.fraudLevel === "high" ||
    data.fraudLevel === "critical"
      ? data.fraudLevel
      : undefined;
  if (fraudScore == null && !fraudLevel) return null;
  return { fraudScore, fraudLevel };
}
