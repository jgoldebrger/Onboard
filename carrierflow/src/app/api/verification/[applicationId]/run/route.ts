import { NextResponse } from "next/server";
import type { VerificationStatus } from "@prisma/client";
import { auditLog } from "@/lib/audit";
import {
  carrierLegalName,
  extractCarrierProfile,
  lookupCarrier,
  normalizeDotNumber,
  normalizeMcNumber,
} from "@/lib/fmcsa";
import { buildFmcsaRawResponse } from "@/lib/fmcsa/build-raw-response";
import {
  loadApplicationVerificationFields,
  formatVerificationResponse,
  requireVerificationAccess,
} from "../../_utils";
import { db } from "@/lib/db";
import {
  runVerificationCompare,
  verificationStatusFromCompare,
} from "@/lib/agents/verification";

type Params = { params: Promise<{ applicationId: string }> };

type RunBody = {
  dotNumber?: string;
  mcNumber?: string;
  companyName?: string;
};

export async function POST(req: Request, { params }: Params) {
  const { applicationId } = await params;
  const access = await requireVerificationAccess(applicationId);
  if ("error" in access) return access.error;

  let body: RunBody = {};
  try {
    body = (await req.json()) as RunBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const appFields = await loadApplicationVerificationFields(applicationId);
  const dotNumber =
    normalizeDotNumber(body.dotNumber) ??
    normalizeDotNumber(appFields.dotNumber);
  const mcNumber =
    normalizeMcNumber(body.mcNumber) ?? normalizeMcNumber(appFields.mcNumber);

  if (!dotNumber && !mcNumber) {
    return NextResponse.json(
      { error: "DOT number or MC number is required" },
      { status: 400 },
    );
  }

  let fmcsa;
  try {
    fmcsa = await lookupCarrier({ dotNumber, mcNumber });
  } catch (err) {
    const message = err instanceof Error ? err.message : "FMCSA lookup failed";
    const status = message.includes("FMCSA_WEB_KEY") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }

  const companyName =
    body.companyName?.trim() ||
    appFields.companyLegalName ||
    carrierLegalName(fmcsa.carrier);

  const compare = await runVerificationCompare({
    application: {
      companyLegalName: companyName,
      dotNumber: dotNumber ?? appFields.dotNumber,
      mcNumber: mcNumber ?? appFields.mcNumber,
    },
    fmcsa,
    companyNameOverride: body.companyName,
  });

  const status: VerificationStatus = verificationStatusFromCompare(compare);

  const profile = extractCarrierProfile(fmcsa);

  const record = await db.governmentVerification.create({
    data: {
      applicationId,
      dotNumber: fmcsa.resolvedDotNumber,
      mcNumber: fmcsa.resolvedMcNumber,
      companyName: companyName ?? carrierLegalName(fmcsa.carrier),
      dotStatus: compare.dotStatus,
      mcStatus: compare.mcStatus,
      authorityStatus: compare.authorityStatus,
      matchScore: compare.matchScore,
      riskFlags: compare.riskFlags,
      status,
      rawResponse: buildFmcsaRawResponse(fmcsa, {
        profile,
        source: "verification.run",
      }),
    },
  });

  await auditLog({
    actorId: access.user.id,
    entityType: "GovernmentVerification",
    entityId: record.id,
    action: "verification.run",
    after: {
      applicationId,
      status,
      matches: compare.matches,
      riskFlags: compare.riskFlags,
    },
  });

  return NextResponse.json({
    verification: formatVerificationResponse(record, compare),
    fmcsa: {
      fromCache: fmcsa.fromCache,
      resolvedDotNumber: fmcsa.resolvedDotNumber,
      resolvedMcNumber: fmcsa.resolvedMcNumber,
    },
  });
}
