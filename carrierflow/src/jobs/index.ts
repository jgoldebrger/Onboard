import { complianceDocumentExpiry } from "./compliance-document-expiry";
import { complianceFmcsaRefresh } from "./compliance-fmcsa-refresh";
import { complianceRequalify } from "./compliance-requalify";
import { processDocument } from "./document-process";

export const inngestFunctions = [
  processDocument,
  complianceFmcsaRefresh,
  complianceDocumentExpiry,
  complianceRequalify,
];
