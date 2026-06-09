import { randomUUID } from "crypto";
import path from "path";
import { NextResponse } from "next/server";
import { assertCoiRenewalEligible } from "@/lib/compliance/coi-renewal";
import { queueDocumentReview } from "@/lib/documents/queue-review";
import { getSessionUser } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  buildStoragePath,
  getStorageProvider,
  STORAGE_BUCKETS,
} from "@/lib/storage";

type Params = { params: Promise<{ applicationId: string }> };

function getFileExtension(fileName: string): string {
  const ext = path.extname(fileName).slice(1).toLowerCase();
  return ext || "bin";
}

export async function POST(req: Request, { params }: Params) {
  const { applicationId } = await params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const eligibility = await assertCoiRenewalEligible(applicationId, user.id);
  if ("error" in eligibility) {
    const status =
      eligibility.error === "not_found"
        ? 404
        : eligibility.error === "forbidden"
          ? 403
          : 400;
    return NextResponse.json({ error: eligibility.error }, { status });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
  }

  const fileField = formData.get("file");
  if (!(fileField instanceof File) || fileField.size === 0) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  const { coiType } = eligibility;
  const ext = getFileExtension(fileField.name);
  const storedFileName = `${randomUUID()}.${ext}`;
  const objectPath = buildStoragePath(applicationId, coiType.key, storedFileName);

  const buffer = Buffer.from(await fileField.arrayBuffer());
  const storage = getStorageProvider();
  const bucket = STORAGE_BUCKETS.carrierDocuments;

  let storedObject;
  try {
    storedObject = await storage.upload(bucket, objectPath, buffer, {
      contentType: fileField.type || "application/octet-stream",
      size: fileField.size,
    });
  } catch (err) {
    console.error("COI renewal storage upload failed", err);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }

  try {
    const document = await db.carrierDocument.create({
      data: {
        applicationId,
        documentTypeId: coiType.id,
        storageKey: storedObject.storageKey,
        fileName: fileField.name,
        mimeType: fileField.type || "application/octet-stream",
        fileSize: fileField.size,
        review: {
          create: {
            status: "PROCESSING",
            reviewProgress: 5,
            reviewStep: "COI renewal received",
          },
        },
      },
      include: { review: true },
    });

    await queueDocumentReview(document.id);

    await auditLog({
      actorId: user.id,
      entityType: "CarrierDocument",
      entityId: document.id,
      action: "COI_RENEWAL_UPLOAD",
      after: {
        applicationId,
        carrierProfileId: eligibility.carrierProfileId,
        documentTypeKey: coiType.key,
      },
    });

    return NextResponse.json(
      {
        documentId: document.id,
        reviewStatus: document.review?.status ?? "PROCESSING",
      },
      { status: 202 },
    );
  } catch (err) {
    console.error("COI renewal persist failed", err);
    await storage.delete(bucket, objectPath).catch(() => undefined);
    return NextResponse.json({ error: "Failed to save document" }, { status: 500 });
  }
}
