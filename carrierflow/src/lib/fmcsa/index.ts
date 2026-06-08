export {
  getCarrierByDot,
  getAuthority,
  getByMc,
  lookupCarrier,
  fetchExtendedCarrierData,
  deriveOperationalStatus,
  deriveAuthorityStatus,
  carrierLegalName,
  extractCarrierProfile,
} from "./client";
export { buildFmcsaRawResponse, isFullSaferPayload } from "./build-raw-response";
export { buildSaferTabSections, buildSaferMeta, hasExtendedSaferData } from "./safer-tabs";
export type { FmcsaCarrierProfile, FmcsaAddress } from "./client";
export { syncFmcsaFromDotAnswer } from "./persist-for-application";
export type { FmcsaSyncResult } from "./persist-for-application";
export {
  buildDotFirstPrompt,
  buildFmcsaCrossReferenceMessage,
} from "./cross-reference-message";
export { findCachedFmcsaResponse } from "./cache";
export {
  normalizeDotNumber,
  normalizeMcNumber,
  normalizeCompanyName,
  companyNamesMatch,
} from "./normalize";
export type { FmcsaApiEnvelope, FmcsaCarrierContent, FmcsaLookupResult } from "./types";
