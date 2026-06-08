import { findCachedFmcsaResponse } from "./cache";
import { isFullSaferPayload } from "./build-raw-response";
import { normalizeDotNumber, normalizeMcNumber } from "./normalize";
import type { FmcsaApiEnvelope, FmcsaCarrierContent, FmcsaLookupResult } from "./types";

export { normalizeDotNumber, normalizeMcNumber } from "./normalize";

const BASE_URL = "https://mobile.fmcsa.dot.gov/qc/services";

function getWebKey(): string | null {
  const key = process.env.FMCSA_WEB_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

function buildUrl(path: string): string {
  const webKey = getWebKey();
  if (!webKey) {
    throw new Error("FMCSA_WEB_KEY is not configured");
  }
  const separator = path.includes("?") ? "&" : "?";
  return `${BASE_URL}${path}${separator}webKey=${encodeURIComponent(webKey)}`;
}

async function fetchJson<T>(path: string): Promise<T | null> {
  const url = buildUrl(path);
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`FMCSA API ${res.status}: ${body.slice(0, 200)}`);
  }

  return (await res.json()) as T;
}

function extractCarrierRecord(
  envelope: FmcsaApiEnvelope<FmcsaCarrierContent> | null,
): Record<string, unknown> | null {
  if (!envelope?.content) return null;
  const content = envelope.content;
  if (content.carrier && typeof content.carrier === "object") {
    return content.carrier as Record<string, unknown>;
  }
  if (typeof content === "object" && "dotNumber" in content) {
    return content as Record<string, unknown>;
  }
  return null;
}

function dotFromCarrierEnvelope(
  envelope: FmcsaApiEnvelope<FmcsaCarrierContent> | null,
): string | null {
  const carrier = extractCarrierRecord(envelope);
  if (!carrier) return null;
  const dot = carrier.dotNumber ?? carrier.dot_number;
  return normalizeDotNumber(String(dot ?? ""));
}

function mcFromCarrierEnvelope(
  envelope: FmcsaApiEnvelope<FmcsaCarrierContent> | null,
): string | null {
  const carrier = extractCarrierRecord(envelope);
  if (!carrier) return null;
  const mc = carrier.mcNumber ?? carrier.mc_number ?? carrier.docketNumber;
  return normalizeMcNumber(String(mc ?? ""));
}

function mcFromDocketNumbers(envelope: FmcsaApiEnvelope | null): string | null {
  if (!envelope?.content) return null;
  const items = Array.isArray(envelope.content)
    ? envelope.content
    : [envelope.content];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const num = rec.docketNumber ?? rec.docket_number;
    if (num != null) {
      const normalized = normalizeMcNumber(String(num));
      if (normalized) return normalized;
    }
  }
  return null;
}

function emptyExtendedEndpoints(): Pick<
  FmcsaLookupResult,
  "basics" | "cargoCarried" | "operationClassification" | "oos" | "docketNumbers"
> {
  return {
    basics: null,
    cargoCarried: null,
    operationClassification: null,
    oos: null,
    docketNumbers: null,
  };
}

function cachedRawToLookup(
  raw: unknown,
  dotNumber: string | null,
  mcNumber: string | null,
  cacheId: string,
): FmcsaLookupResult {
  const parsed = raw as {
    carrier?: FmcsaApiEnvelope<FmcsaCarrierContent>;
    authority?: FmcsaApiEnvelope | null;
    basics?: FmcsaApiEnvelope | null;
    cargoCarried?: FmcsaApiEnvelope | null;
    operationClassification?: FmcsaApiEnvelope | null;
    oos?: FmcsaApiEnvelope | null;
    docketNumbers?: FmcsaApiEnvelope | null;
  };
  const resolvedMc =
    mcNumber ?? mcFromDocketNumbers(parsed.docketNumbers ?? null);

  return {
    carrier: parsed.carrier ?? null,
    authority: parsed.authority ?? null,
    basics: parsed.basics ?? null,
    cargoCarried: parsed.cargoCarried ?? null,
    operationClassification: parsed.operationClassification ?? null,
    oos: parsed.oos ?? null,
    docketNumbers: parsed.docketNumbers ?? null,
    resolvedDotNumber: dotNumber,
    resolvedMcNumber: resolvedMc,
    fromCache: true,
    cacheId,
  };
}

/** QCMobile supplemental endpoints (SAFER-style sections). */
export async function fetchExtendedCarrierData(dotNumber: string): Promise<
  Pick<
    FmcsaLookupResult,
    "authority" | "basics" | "cargoCarried" | "operationClassification" | "oos" | "docketNumbers"
  >
> {
  const dot = normalizeDotNumber(dotNumber);
  if (!dot) throw new Error("Invalid DOT number");

  const [authority, basics, cargoCarried, operationClassification, oos, docketNumbers] =
    await Promise.all([
      getAuthority(dot),
      fetchJson<FmcsaApiEnvelope>(`/carriers/${dot}/basics`),
      fetchJson<FmcsaApiEnvelope>(`/carriers/${dot}/cargo-carried`),
      fetchJson<FmcsaApiEnvelope>(`/carriers/${dot}/operation-classification`),
      fetchJson<FmcsaApiEnvelope>(`/carriers/${dot}/oos`),
      fetchJson<FmcsaApiEnvelope>(`/carriers/${dot}/docket-numbers`),
    ]);

  return { authority, basics, cargoCarried, operationClassification, oos, docketNumbers };
}

export async function getCarrierByDot(
  dotNumber: string,
): Promise<FmcsaApiEnvelope<FmcsaCarrierContent> | null> {
  const dot = normalizeDotNumber(dotNumber);
  if (!dot) throw new Error("Invalid DOT number");

  const cached = await findCachedFmcsaResponse({ dotNumber: dot });
  if (cached?.rawResponse) {
    const parsed = cached.rawResponse as { carrier?: FmcsaApiEnvelope<FmcsaCarrierContent> };
    if (parsed.carrier) return parsed.carrier;
  }

  return fetchJson<FmcsaApiEnvelope<FmcsaCarrierContent>>(`/carriers/${dot}`);
}

export async function getAuthority(dotNumber: string): Promise<FmcsaApiEnvelope | null> {
  const dot = normalizeDotNumber(dotNumber);
  if (!dot) throw new Error("Invalid DOT number");

  const cached = await findCachedFmcsaResponse({ dotNumber: dot });
  if (cached?.rawResponse) {
    const parsed = cached.rawResponse as { authority?: FmcsaApiEnvelope | null };
    if (parsed.authority !== undefined) return parsed.authority;
  }

  return fetchJson<FmcsaApiEnvelope>(`/carriers/${dot}/authority`);
}

/** Lookup carrier by MC / motor carrier docket number. */
export async function getByMc(
  mcNumber: string,
): Promise<FmcsaApiEnvelope<FmcsaCarrierContent> | null> {
  const mc = normalizeMcNumber(mcNumber);
  if (!mc) throw new Error("Invalid MC number");

  const cached = await findCachedFmcsaResponse({ mcNumber: mc });
  if (cached?.rawResponse) {
    const parsed = cached.rawResponse as { carrier?: FmcsaApiEnvelope<FmcsaCarrierContent> };
    if (parsed.carrier) return parsed.carrier;
  }

  return fetchJson<FmcsaApiEnvelope<FmcsaCarrierContent>>(
    `/carriers/docket-number/${mc}`,
  );
}

export async function lookupCarrier(params: {
  dotNumber?: string | null;
  mcNumber?: string | null;
}): Promise<FmcsaLookupResult> {
  const dotInput = normalizeDotNumber(params.dotNumber);
  const mcInput = normalizeMcNumber(params.mcNumber);

  const cached = await findCachedFmcsaResponse({
    dotNumber: dotInput,
    mcNumber: mcInput,
  });
  if (cached?.rawResponse && isFullSaferPayload(cached.rawResponse)) {
    return cachedRawToLookup(
      cached.rawResponse,
      cached.dotNumber ?? dotInput,
      cached.mcNumber ?? mcInput,
      cached.id,
    );
  }

  if (!getWebKey()) {
    throw new Error("FMCSA_WEB_KEY is not configured");
  }

  let carrier: FmcsaApiEnvelope<FmcsaCarrierContent> | null = null;
  let resolvedDot = dotInput;
  let resolvedMc = mcInput;

  if (dotInput) {
    carrier = await getCarrierByDot(dotInput);
    resolvedDot = dotFromCarrierEnvelope(carrier) ?? dotInput;
    resolvedMc = resolvedMc ?? mcFromCarrierEnvelope(carrier);
  } else if (mcInput) {
    carrier = await getByMc(mcInput);
    resolvedDot = dotFromCarrierEnvelope(carrier);
    resolvedMc = mcFromCarrierEnvelope(carrier) ?? mcInput;
  } else {
    throw new Error("DOT number or MC number is required");
  }

  const extended = resolvedDot
    ? await fetchExtendedCarrierData(resolvedDot)
    : {
        authority: null,
        ...emptyExtendedEndpoints(),
      };

  resolvedMc =
    resolvedMc ??
    mcFromCarrierEnvelope(carrier) ??
    mcFromDocketNumbers(extended.docketNumbers);

  return {
    carrier,
    authority: extended.authority,
    basics: extended.basics,
    cargoCarried: extended.cargoCarried,
    operationClassification: extended.operationClassification,
    oos: extended.oos,
    docketNumbers: extended.docketNumbers,
    resolvedDotNumber: resolvedDot,
    resolvedMcNumber: resolvedMc,
    fromCache: false,
  };
}

export function deriveOperationalStatus(
  carrier: FmcsaApiEnvelope<FmcsaCarrierContent> | null,
): { dotStatus: string; mcStatus: string } {
  const record = extractCarrierRecord(carrier);
  if (!record) {
    return { dotStatus: "NOT_FOUND", mcStatus: "NOT_FOUND" };
  }

  const allow = String(
    record.allowToOperate ?? record.allow_to_operate ?? record.allowedToOperate ?? "",
  ).toUpperCase();
  const oos = String(
    record.outOfService ?? record.out_of_service ?? record.oos ?? "",
  ).toUpperCase();

  let dotStatus = "UNKNOWN";
  if (oos === "Y") dotStatus = "OUT_OF_SERVICE";
  else if (allow === "Y") dotStatus = "ACTIVE";
  else if (allow === "N") dotStatus = "NOT_AUTHORIZED";
  else dotStatus = "REGISTERED";

  const mcDigits = mcFromCarrierEnvelope(carrier);
  const mcStatus = mcDigits ? dotStatus : "NOT_FOUND";

  return { dotStatus, mcStatus };
}

export function deriveAuthorityStatus(authority: FmcsaApiEnvelope | null): string {
  if (!authority?.content) return "UNKNOWN";

  const fromCarrierAuthority = (ca: Record<string, unknown>): string => {
    const broker = String(ca.brokerAuthorityStatus ?? "").toUpperCase();
    const common = String(ca.commonAuthorityStatus ?? "").toUpperCase();
    const contract = String(ca.contractAuthorityStatus ?? "").toUpperCase();
    const auth = String(ca.authority ?? "").toUpperCase();
    const authorizedBroker = String(ca.authorizedForBroker ?? "").toUpperCase();

    if (authorizedBroker === "Y" || broker === "A") return "BROKER_ACTIVE";
    if (common === "A" || contract === "A") return "ACTIVE";
    if (auth === "N") return "NOT_AUTHORIZED";
    if (broker === "I" && common === "I" && contract === "I") return "INACTIVE";
    if (broker || common || contract) return broker || common || contract;
    return "UNKNOWN";
  };

  const content = authority.content;
  if (Array.isArray(content)) {
    for (const item of content) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const ca = rec.carrierAuthority;
      if (ca && typeof ca === "object") {
        const status = fromCarrierAuthority(ca as Record<string, unknown>);
        if (status !== "UNKNOWN") return status;
      }
    }
    return "UNKNOWN";
  }

  if (typeof content === "object" && content !== null) {
    const record = content as Record<string, unknown>;
    if (record.carrierAuthority && typeof record.carrierAuthority === "object") {
      return fromCarrierAuthority(record.carrierAuthority as Record<string, unknown>);
    }
    const status =
      record.authorityStatus ?? record.status ?? record.carrierAuthorityStatus;
    if (status != null) return String(status).toUpperCase();
  }

  return "UNKNOWN";
}

export function carrierLegalName(
  carrier: FmcsaApiEnvelope<FmcsaCarrierContent> | null,
): string | null {
  const profile = extractCarrierProfile({
    carrier,
    authority: null,
    ...emptyExtendedEndpoints(),
    resolvedDotNumber: null,
    resolvedMcNumber: null,
    fromCache: false,
  });
  return profile.legalName ?? profile.dbaName;
}

export type FmcsaAddress = {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
};

export type FmcsaCarrierProfile = {
  dotNumber: string | null;
  mcNumber: string | null;
  mcFormatted: string | null;
  legalName: string | null;
  dbaName: string | null;
  physicalAddress: FmcsaAddress | null;
  mailingAddress: FmcsaAddress | null;
  telephone: string | null;
  email: string | null;
  allowToOperate: string | null;
  outOfService: string | null;
  totalPowerUnits: number | null;
  totalDrivers: number | null;
  carrierOperation: Record<string, unknown> | null;
  rawCarrier: Record<string, unknown> | null;
};

function readString(record: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const v = record[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function readAddress(
  record: Record<string, unknown>,
  prefix: "phy" | "mail",
): FmcsaAddress | null {
  const street = readString(
    record,
    `${prefix}Street`,
    `${prefix}_street`,
    prefix === "phy" ? "physicalAddress" : "mailingAddress",
  );
  const city = readString(record, `${prefix}City`, `${prefix}_city`);
  const state = readString(record, `${prefix}State`, `${prefix}_state`);
  const zip = readString(
    record,
    `${prefix}Zipcode`,
    `${prefix}Zip`,
    `${prefix}_zip`,
  );
  if (!street && !city && !state && !zip) return null;
  return { street: street ?? undefined, city: city ?? undefined, state: state ?? undefined, zip: zip ?? undefined };
}

function readNumber(record: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const v = record[key];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(v.replace(/,/g, ""));
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

/** Structured carrier fields from FMCSA QCMobile (SAFER registry data). */
export function extractCarrierProfile(fmcsa: FmcsaLookupResult): FmcsaCarrierProfile {
  const record = extractCarrierRecord(fmcsa.carrier);
  const dotNumber =
    fmcsa.resolvedDotNumber ??
    (record ? normalizeDotNumber(String(record.dotNumber ?? record.dot_number ?? "")) : null);
  const mcDigits =
    fmcsa.resolvedMcNumber ??
    (record
      ? normalizeMcNumber(
          String(record.mcNumber ?? record.mc_number ?? record.docketNumber ?? ""),
        )
      : null);
  const mcFormatted = mcDigits ? `MC-${mcDigits}` : null;

  if (!record) {
    return {
      dotNumber,
      mcNumber: mcDigits,
      mcFormatted,
      legalName: null,
      dbaName: null,
      physicalAddress: null,
      mailingAddress: null,
      telephone: null,
      email: null,
      allowToOperate: null,
      outOfService: null,
      totalPowerUnits: null,
      totalDrivers: null,
      carrierOperation: null,
      rawCarrier: null,
    };
  }

  const legalName = readString(record, "legalName", "legal_name");
  const dbaName = readString(record, "dbaName", "dba_name");

  const operationFromRecord =
    record.carrierOperation && typeof record.carrierOperation === "object"
      ? (record.carrierOperation as Record<string, unknown>)
      : null;
  const operationFromContent =
    fmcsa.carrier?.content &&
    typeof fmcsa.carrier.content === "object" &&
    fmcsa.carrier.content.carrierOperation &&
    typeof fmcsa.carrier.content.carrierOperation === "object"
      ? (fmcsa.carrier.content.carrierOperation as Record<string, unknown>)
      : null;
  const operation = operationFromRecord ?? operationFromContent;

  return {
    dotNumber,
    mcNumber: mcDigits,
    mcFormatted,
    legalName,
    dbaName,
    physicalAddress: readAddress(record, "phy"),
    mailingAddress: readAddress(record, "mail"),
    telephone: readString(record, "telephone", "phone", "phoneNumber"),
    email: readString(record, "emailAddress", "email"),
    allowToOperate: readString(
      record,
      "allowToOperate",
      "allow_to_operate",
      "allowedToOperate",
    ),
    outOfService: readString(record, "outOfService", "out_of_service", "oos"),
    totalPowerUnits: readNumber(
      record,
      "totalPowerUnits",
      "totalpowerunits",
      "powerUnits",
    ),
    totalDrivers: readNumber(record, "totalDrivers", "totaldrivers"),
    carrierOperation: operation,
    rawCarrier: record,
  };
}
