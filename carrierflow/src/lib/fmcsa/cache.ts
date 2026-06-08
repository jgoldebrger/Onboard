import { db } from "@/lib/db";
import { normalizeDotNumber, normalizeMcNumber } from "./normalize";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function findCachedFmcsaResponse(params: {
  dotNumber?: string | null;
  mcNumber?: string | null;
}) {
  const dot = normalizeDotNumber(params.dotNumber);
  const mc = normalizeMcNumber(params.mcNumber);
  if (!dot && !mc) return null;

  const since = new Date(Date.now() - CACHE_TTL_MS);
  const or: { dotNumber?: string; mcNumber?: string }[] = [];
  if (dot) or.push({ dotNumber: dot });
  if (mc) or.push({ mcNumber: mc });
  if (or.length === 0) return null;

  return db.governmentVerification.findFirst({
    where: {
      verifiedAt: { gte: since },
      OR: or,
    },
    orderBy: { verifiedAt: "desc" },
  });
}
