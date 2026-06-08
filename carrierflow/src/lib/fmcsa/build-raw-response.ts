import type { Prisma } from "@prisma/client";
import type { FmcsaCarrierProfile } from "./client";
import type { FmcsaLookupResult } from "./types";

export type FmcsaStoredRawResponse = {
  carrier: FmcsaLookupResult["carrier"];
  authority: FmcsaLookupResult["authority"];
  basics: FmcsaLookupResult["basics"];
  cargoCarried: FmcsaLookupResult["cargoCarried"];
  operationClassification: FmcsaLookupResult["operationClassification"];
  oos: FmcsaLookupResult["oos"];
  docketNumbers: FmcsaLookupResult["docketNumbers"];
  profile?: FmcsaCarrierProfile;
  fromCache: boolean;
  cacheId?: string;
  syncedAt: string;
  source: string;
};

export function isFullSaferPayload(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const r = raw as Record<string, unknown>;
  return (
    "basics" in r &&
    "cargoCarried" in r &&
    "operationClassification" in r &&
    "oos" in r &&
    "docketNumbers" in r
  );
}

export function buildFmcsaRawResponse(
  fmcsa: FmcsaLookupResult,
  options: {
    profile?: FmcsaCarrierProfile;
    source: string;
  },
): Prisma.InputJsonValue {
  const payload: FmcsaStoredRawResponse = {
    carrier: fmcsa.carrier,
    authority: fmcsa.authority,
    basics: fmcsa.basics,
    cargoCarried: fmcsa.cargoCarried,
    operationClassification: fmcsa.operationClassification,
    oos: fmcsa.oos,
    docketNumbers: fmcsa.docketNumbers,
    profile: options.profile,
    fromCache: fmcsa.fromCache,
    cacheId: fmcsa.cacheId,
    syncedAt: new Date().toISOString(),
    source: options.source,
  };
  return payload as Prisma.InputJsonValue;
}
