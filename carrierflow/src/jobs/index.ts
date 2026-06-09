import { complianceDocumentExpiry } from "./compliance-document-expiry";
import { complianceFmcsaRefresh } from "./compliance-fmcsa-refresh";
import { complianceRequalify } from "./compliance-requalify";
import { onboardingReminders } from "./onboarding-reminders";
import { processDocument } from "./document-process";

export const inngestFunctions = [
  processDocument,
  complianceFmcsaRefresh,
  complianceDocumentExpiry,
  complianceRequalify,
  onboardingReminders,
];
