import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { CoiExtractedFields } from "./types";

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function extractCoiFields(
  extractedData: Record<string, unknown> | null | undefined,
): CoiExtractedFields {
  if (!extractedData) return {};
  const fields = (extractedData.fields ?? extractedData) as Record<
    string,
    unknown
  >;
  return {
    policyNumber: (fields.policyNumber ?? fields.policy_number) as
      | string
      | null,
    effectiveDate: (fields.effectiveDate ?? fields.effective_date) as
      | string
      | null,
    expirationDate: (fields.expirationDate ?? fields.expiration_date) as
      | string
      | null,
    certificateHolder: (fields.certificateHolder ??
      fields.certificate_holder) as string | null,
    limits: (fields.limits ?? fields.coverageLimits) as Record<
      string,
      unknown
    > | null,
  };
}

export async function syncMonitoredDocumentsFromApplication(
  carrierProfileId: string,
  applicationId: string,
) {
  const documents = await db.carrierDocument.findMany({
    where: {
      applicationId,
      review: { status: "PASSED" },
    },
    include: {
      documentType: true,
      review: true,
    },
    orderBy: { uploadedAt: "desc" },
  });

  const byType = new Map<string, (typeof documents)[0]>();
  for (const doc of documents) {
    const key = doc.documentType?.key;
    if (!key || byType.has(key)) continue;
    byType.set(key, doc);
  }

  for (const [typeKey, doc] of byType) {
    const extracted = doc.review?.extractedData as
      | Record<string, unknown>
      | undefined;
    const coi = typeKey === "coi" ? extractCoiFields(extracted) : {};

    const existing = await db.monitoredDocument.findFirst({
      where: { carrierProfileId, documentTypeKey: typeKey },
    });

    const data = {
      documentId: doc.id,
      policyNumber: coi.policyNumber ?? null,
      limits: (coi.limits ?? undefined) as Prisma.InputJsonValue | undefined,
      effectiveDate: parseDate(coi.effectiveDate),
      expirationDate: parseDate(coi.expirationDate),
      certificateHolder: coi.certificateHolder ?? null,
      extractedData: (extracted ?? undefined) as Prisma.InputJsonValue | undefined,
    };

    if (existing) {
      await db.monitoredDocument.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await db.monitoredDocument.create({
        data: {
          carrierProfileId,
          documentTypeKey: typeKey,
          ...data,
        },
      });
    }
  }
}
