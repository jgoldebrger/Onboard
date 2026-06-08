export type FmcsaApiEnvelope<T = Record<string, unknown>> = {
  content?: T;
  retrievalDate?: string;
  links?: unknown;
};

export type FmcsaCarrierContent = {
  carrier?: Record<string, unknown>;
  carrierOperation?: Record<string, unknown>;
  [key: string]: unknown;
};

export type FmcsaLookupResult = {
  carrier: FmcsaApiEnvelope<FmcsaCarrierContent> | null;
  authority: FmcsaApiEnvelope | null;
  basics: FmcsaApiEnvelope | null;
  cargoCarried: FmcsaApiEnvelope | null;
  operationClassification: FmcsaApiEnvelope | null;
  oos: FmcsaApiEnvelope | null;
  docketNumbers: FmcsaApiEnvelope | null;
  resolvedDotNumber: string | null;
  resolvedMcNumber: string | null;
  fromCache: boolean;
  cacheId?: string;
};
