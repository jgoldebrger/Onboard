import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import {
  carrierLegalName,
  companyNamesMatch,
  deriveAuthorityStatus,
  deriveOperationalStatus,
  normalizeDotNumber,
  normalizeMcNumber,
  type FmcsaLookupResult,
} from "@/lib/fmcsa";
import { DEFAULT_VERIFICATION_SYSTEM_PROMPT } from "@/lib/agents/prompts/defaults/verification";

export type ApplicationVerificationFields = {
  companyLegalName?: string | null;
  dotNumber?: string | null;
  mcNumber?: string | null;
};

export type VerificationCompareResult = {
  matches: boolean;
  dotStatus: string;
  mcStatus: string;
  authorityStatus: string;
  matchScore: number;
  riskFlags: string[];
};

const verificationResultSchema = z.object({
  matches: z.boolean(),
  dotStatus: z.string(),
  mcStatus: z.string(),
  authorityStatus: z.string(),
  matchScore: z.number().min(0).max(1),
  riskFlags: z.array(z.string()),
});

function answerString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object" && value !== null && "value" in value) {
    return answerString((value as { value: unknown }).value);
  }
  return null;
}

export function ruleBasedVerificationCompare(
  application: ApplicationVerificationFields,
  fmcsa: FmcsaLookupResult,
): VerificationCompareResult {
  const riskFlags: string[] = [];
  const { dotStatus, mcStatus } = deriveOperationalStatus(fmcsa.carrier);
  const authorityStatus = deriveAuthorityStatus(fmcsa.authority);
  const fmcsaName = carrierLegalName(fmcsa.carrier);

  const appDot = normalizeDotNumber(application.dotNumber);
  const appMc = normalizeMcNumber(application.mcNumber);
  const govDot = fmcsa.resolvedDotNumber;
  const govMc = fmcsa.resolvedMcNumber;

  if (!fmcsa.carrier) {
    riskFlags.push("fmcsa_record_not_found");
  }

  if (dotStatus === "OUT_OF_SERVICE") {
    riskFlags.push("carrier_out_of_service");
  }
  if (dotStatus === "NOT_AUTHORIZED") {
    riskFlags.push("carrier_not_authorized");
  }

  let dotMatch = true;
  if (appDot && govDot) {
    dotMatch = appDot === govDot;
    if (!dotMatch) riskFlags.push("dot_mismatch");
  } else if (appDot && !govDot) {
    dotMatch = false;
    riskFlags.push("dot_not_verified");
  }

  let mcMatch = true;
  if (appMc && govMc) {
    mcMatch = appMc === govMc;
    if (!mcMatch) riskFlags.push("mc_mismatch");
  } else if (appMc && !govMc) {
    mcMatch = false;
    riskFlags.push("mc_not_verified");
  }

  let nameMatch = true;
  const appName = application.companyLegalName?.trim();
  if (appName && fmcsaName) {
    nameMatch = companyNamesMatch(appName, fmcsaName);
    if (!nameMatch) riskFlags.push("company_name_mismatch");
  } else if (appName && !fmcsaName) {
    nameMatch = false;
    riskFlags.push("company_name_not_verified");
  }

  if (authorityStatus === "UNKNOWN" && fmcsa.carrier) {
    riskFlags.push("authority_unknown");
  }

  const checks = [dotMatch, mcMatch, nameMatch].filter(
    (_, i) =>
      (i === 0 && (appDot || govDot)) ||
      (i === 1 && (appMc || govMc)) ||
      (i === 2 && (appName || fmcsaName)),
  );
  const matchScore =
    checks.length === 0 ? 0 : checks.filter(Boolean).length / checks.length;

  const matches =
    riskFlags.length === 0 &&
    dotMatch &&
    mcMatch &&
    nameMatch &&
    dotStatus === "ACTIVE";

  return {
    matches,
    dotStatus,
    mcStatus,
    authorityStatus,
    matchScore,
    riskFlags,
  };
}

export async function runVerificationCompare(params: {
  application: ApplicationVerificationFields;
  fmcsa: FmcsaLookupResult;
  companyNameOverride?: string | null;
}): Promise<VerificationCompareResult> {
  const application: ApplicationVerificationFields = {
    ...params.application,
    companyLegalName:
      params.companyNameOverride?.trim() ||
      params.application.companyLegalName,
  };

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return ruleBasedVerificationCompare(application, params.fmcsa);
  }

  const openai = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL_VERIFICATION ?? "gpt-4o";

  try {
    const completion = await openai.chat.completions.parse({
      model,
      messages: [
        { role: "system", content: DEFAULT_VERIFICATION_SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            application,
            fmcsa: {
              resolvedDotNumber: params.fmcsa.resolvedDotNumber,
              resolvedMcNumber: params.fmcsa.resolvedMcNumber,
              carrier: params.fmcsa.carrier,
              authority: params.fmcsa.authority,
            },
          }),
        },
      ],
      response_format: zodResponseFormat(
        verificationResultSchema,
        "verification_compare",
      ),
    });

    const parsed = completion.choices[0]?.message?.parsed;
    if (parsed) return parsed;
  } catch {
    // fall through to rule-based
  }

  return ruleBasedVerificationCompare(application, params.fmcsa);
}

export function verificationStatusFromCompare(
  result: VerificationCompareResult,
): "PASSED" | "FAILED" | "MANUAL_REVIEW" {
  if (result.riskFlags.includes("fmcsa_record_not_found")) return "FAILED";
  if (
    result.riskFlags.some((f) =>
      ["carrier_out_of_service", "carrier_not_authorized"].includes(f),
    )
  ) {
    return "FAILED";
  }
  if (result.matches) return "PASSED";
  if (result.matchScore >= 0.66) return "MANUAL_REVIEW";
  return "FAILED";
}
