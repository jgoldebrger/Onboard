import { extractCarrierProfile } from "./client";
import { envelopeContent, flattenFmcsaValue } from "./flatten";
import type { FmcsaLookupResult } from "./types";

export type SaferTabSection = {
  id: string;
  label: string;
  description: string;
  fields: Record<string, unknown>;
  empty: boolean;
};

type RawGovPayload = {
  carrier?: unknown;
  authority?: unknown;
  basics?: unknown;
  cargoCarried?: unknown;
  operationClassification?: unknown;
  oos?: unknown;
  docketNumbers?: unknown;
  profile?: unknown;
  syncedAt?: string;
  source?: string;
  fromCache?: boolean;
  cacheId?: string;
};

type TabSpec = {
  id: string;
  label: string;
  description: string;
  /** Match flattened carrier/content keys (case-insensitive). */
  keyPatterns: RegExp[];
  /** Include full flattened content from these stored endpoint keys. */
  endpointKeys?: (keyof RawGovPayload)[];
};

const TAB_SPECS: TabSpec[] = [
  {
    id: "snapshot",
    label: "Company snapshot",
    description:
      "Identifiers, names, operating flags, fleet size, and contact from the main carrier record.",
    keyPatterns: [
      /^dot/i,
      /^mc/i,
      /legal/i,
      /dba/i,
      /allowtooperate/i,
      /allowedtooperate/i,
      /outofservice/i,
      /totalpower/i,
      /totaldriver/i,
      /telephone/i,
      /^phone/i,
      /email/i,
      /phy/i,
      /mail/i,
      /complaint/i,
      /bipd/i,
      /bondinsurance/i,
      /cargoinsurance/i,
      /censustype/i,
      /snapshot/i,
    ],
  },
  {
    id: "usdot",
    label: "USDOT information",
    description: "DOT registration, docket numbers, and EIN fields.",
    keyPatterns: [/docket/i, /^prefix$/i, /ein/i, /statuscode/i, /usdot/i],
    endpointKeys: ["docketNumbers"],
  },
  {
    id: "operating-authority",
    label: "Operating authority",
    description: "Authority status and authorization flags from FMCSA.",
    keyPatterns: [/authority/i, /authorizedfor/i, /broker/i, /freight/i, /passenger/i, /contract/i, /common/i],
    endpointKeys: ["authority"],
  },
  {
    id: "out-of-service",
    label: "Out of service",
    description: "Out-of-service orders, dates, and OOS rates.",
    keyPatterns: [/outofservice/i, /oos/i],
    endpointKeys: ["oos"],
  },
  {
    id: "mcs150",
    label: "MCS-150 data",
    description: "MCS-150 filing dates, mileage, and census fields.",
    keyPatterns: [/mcs150/i, /mcs151/i, /mcsip/i, /recentmileage/i, /adddate/i],
  },
  {
    id: "carrier-operation",
    label: "Carrier operation",
    description: "Interstate/intrastate operation and hazmat flags.",
    keyPatterns: [
      /carrieroperation/i,
      /operationclassification/i,
      /interstate/i,
      /intrastate/i,
      /hazmat/i,
      /hmflag/i,
      /ispassenger/i,
    ],
  },
  {
    id: "cargo-carried",
    label: "Cargo carried",
    description: "Cargo types and commodity categories.",
    keyPatterns: [/cargo/i],
    endpointKeys: ["cargoCarried"],
  },
  {
    id: "operation-classification",
    label: "Operation classification",
    description: "Entity type and business operation classification.",
    keyPatterns: [
      /entitytype/i,
      /businessorg/i,
      /classdef/i,
      /classification/i,
      /private/i,
      /exempt/i,
      /migrant/i,
      /government/i,
      /indiantribe/i,
      /usmail/i,
    ],
    endpointKeys: ["operationClassification"],
  },
  {
    id: "inspections",
    label: "Inspections",
    description: "Inspection counts and vehicle/driver OOS rates.",
    keyPatterns: [/inspect/i, /driverinsp/i, /vehicleinsp/i, /hazmatinsp/i, /driveroos/i, /vehicleoos/i, /hazmatoos/i],
  },
  {
    id: "crashes",
    label: "Crashes in US",
    description: "Crash statistics reported to FMCSA.",
    keyPatterns: [/crash/i, /injcrash/i, /fatalcrash/i, /towaway/i],
  },
  {
    id: "safety-rating",
    label: "Safety rating & CSA",
    description: "Safety ratings, review dates, and CSA BASIC scores.",
    keyPatterns: [/safety/i, /rating/i, /review/i, /basic/i, /percentile/i, /violation/i],
    endpointKeys: ["basics"],
  },
];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function extractCarrierRecordFromPayload(raw: RawGovPayload): Record<string, unknown> | null {
  const carrierEnvelope = asRecord(raw.carrier);
  if (!carrierEnvelope) return null;
  const content = asRecord(carrierEnvelope.content);
  if (!content) return null;
  if (content.carrier && typeof content.carrier === "object") {
    return content.carrier as Record<string, unknown>;
  }
  if ("dotNumber" in content || "dot_number" in content) {
    return content;
  }
  return null;
}

/** Flatten main carrier record plus sibling objects on the carrier content envelope. */
function flattenCarrierPayload(raw: RawGovPayload): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  const carrierEnvelope = asRecord(raw.carrier);
  const content = carrierEnvelope ? asRecord(carrierEnvelope.content) : null;

  const record = extractCarrierRecordFromPayload(raw);
  if (record) {
    Object.assign(flat, flattenFmcsaValue(record));
  }

  if (content) {
    for (const [key, value] of Object.entries(content)) {
      if (key === "carrier") continue;
      Object.assign(flat, flattenFmcsaValue(value, key));
    }
  }

  if (raw.profile && typeof raw.profile === "object") {
    Object.assign(flat, flattenFmcsaValue(raw.profile, "profile"));
  }

  return flat;
}

function flattenEndpoint(raw: RawGovPayload, key: keyof RawGovPayload): Record<string, unknown> {
  const data = raw[key];
  if (!data) return {};
  return flattenFmcsaValue(envelopeContent(data), String(key));
}

function matchesPattern(fieldKey: string, patterns: RegExp[]): boolean {
  const normalized = fieldKey.replace(/\./g, "").toLowerCase();
  return patterns.some((p) => p.test(fieldKey) || p.test(normalized));
}

function assignFields(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  patterns: RegExp[],
  assigned: Set<string>,
): void {
  for (const [key, value] of Object.entries(source)) {
    if (assigned.has(key)) continue;
    if (!matchesPattern(key, patterns)) continue;
    target[key] = value;
    assigned.add(key);
  }
}

/** Build 11 SAFER-style sections from stored FMCSA raw payload. */
export function buildSaferTabSections(rawResponse: unknown): SaferTabSection[] {
  const raw = (rawResponse ?? {}) as RawGovPayload;
  const carrierFlat = flattenCarrierPayload(raw);
  const assigned = new Set<string>();

  const endpointFlats: Partial<Record<keyof RawGovPayload, Record<string, unknown>>> = {
    authority: flattenEndpoint(raw, "authority"),
    basics: flattenEndpoint(raw, "basics"),
    cargoCarried: flattenEndpoint(raw, "cargoCarried"),
    operationClassification: flattenEndpoint(raw, "operationClassification"),
    oos: flattenEndpoint(raw, "oos"),
    docketNumbers: flattenEndpoint(raw, "docketNumbers"),
  };

  const sections: SaferTabSection[] = TAB_SPECS.map((spec) => {
    const fields: Record<string, unknown> = {};

    assignFields(fields, carrierFlat, spec.keyPatterns, assigned);

    if (spec.endpointKeys) {
      for (const endpointKey of spec.endpointKeys) {
        const endpointFlat = endpointFlats[endpointKey];
        if (endpointFlat) {
          Object.assign(fields, endpointFlat);
        }
      }
    }

    if (spec.id === "snapshot" && Object.keys(fields).length === 0) {
      const lookup: FmcsaLookupResult = {
        carrier: raw.carrier as FmcsaLookupResult["carrier"],
        authority: raw.authority as FmcsaLookupResult["authority"],
        basics: raw.basics as FmcsaLookupResult["basics"],
        cargoCarried: raw.cargoCarried as FmcsaLookupResult["cargoCarried"],
        operationClassification:
          raw.operationClassification as FmcsaLookupResult["operationClassification"],
        oos: raw.oos as FmcsaLookupResult["oos"],
        docketNumbers: raw.docketNumbers as FmcsaLookupResult["docketNumbers"],
        resolvedDotNumber: null,
        resolvedMcNumber: null,
        fromCache: Boolean(raw.fromCache),
        cacheId: raw.cacheId,
      };
      const profile = extractCarrierProfile(lookup);
      Object.assign(fields, flattenFmcsaValue(profile, "profile"));
    }

    return {
      id: spec.id,
      label: spec.label,
      description: spec.description,
      fields,
      empty: Object.keys(fields).length === 0,
    };
  });

  const unassigned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(carrierFlat)) {
    if (!assigned.has(key)) unassigned[key] = value;
  }

  if (Object.keys(unassigned).length > 0) {
    const other = sections.find((s) => s.id === "snapshot");
    if (other) {
      Object.assign(other.fields, unassigned);
      other.empty = Object.keys(other.fields).length === 0;
    }
  }

  return sections;
}

export function buildSaferMeta(rawResponse: unknown): Record<string, unknown> {
  const raw = (rawResponse ?? {}) as RawGovPayload;
  const meta: Record<string, unknown> = {};
  if (raw.syncedAt) meta.syncedAt = raw.syncedAt;
  if (raw.source) meta.source = raw.source;
  if (raw.fromCache != null) meta.fromCache = raw.fromCache;
  if (raw.cacheId) meta.cacheId = raw.cacheId;

  const endpoints = [
    "carrier",
    "authority",
    "basics",
    "cargoCarried",
    "operationClassification",
    "oos",
    "docketNumbers",
  ] as const;
  for (const key of endpoints) {
    const env = asRecord(raw[key]);
    if (env?.retrievalDate) {
      meta[`${key}RetrievalDate`] = env.retrievalDate;
    }
    meta[`${key}Present`] = Boolean(raw[key]);
  }

  return meta;
}

export function hasExtendedSaferData(rawResponse: unknown): boolean {
  if (!rawResponse || typeof rawResponse !== "object") return false;
  const r = rawResponse as RawGovPayload;
  return Boolean(r.basics || r.cargoCarried || r.operationClassification);
}
