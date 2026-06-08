import { randomUUID } from "crypto";
import path from "path";
import { NextResponse } from "next/server";
import { getSessionUser, hasPermission } from "@/lib/auth";
import { queueDocumentReview } from "@/lib/documents/queue-review";
import { db } from "@/lib/db";
import {
  buildStoragePath,
  getStorageProvider,
  STORAGE_BUCKETS,
} from "@/lib/storage";

type Params = { params: Promise<{ applicationId: string }> };

async function assertApplicationAccess(applicationId: string, userId: string, role: Parameters<typeof hasPermission>[0]) {
  const application = await db.onboardingApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, userId: true },
  });

  if (!application) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  const canAccessAll = hasPermission(role, "applications:read");
  if (application.userId !== userId && !canAccessAll) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { application };
}

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

  const access = await assertApplicationAccess(applicationId, user.id, user.role);
  if ("error" in access && access.error) {
    return access.error;
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

  const documentTypeIdRaw = formData.get("documentTypeId");
  const documentTypeId =
    typeof documentTypeIdRaw === "string" && documentTypeIdRaw.length > 0
      ? documentTypeIdRaw
      : null;

  let segment = "misc";
  if (documentTypeId) {
    const documentType = await db.documentType.findUnique({
      where: { id: documentTypeId },
      select: { id: true, key: true },
    });
    if (!documentType) {
      return NextResponse.json({ error: "Document type not found" }, { status: 404 });
    }
    segment = documentType.key;
  }

  const ext = getFileExtension(fileField.name);
  const storedFileName = `${randomUUID()}.${ext}`;
  const objectPath = buildStoragePath(applicationId, segment, storedFileName);

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
    console.error("document storage upload failed", err);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }

  try {
    const document = await db.carrierDocument.create({
      data: {
        applicationId,
        documentTypeId,
        storageKey: storedObject.storageKey,
        fileName: fileField.name,
        mimeType: fileField.type || "application/octet-stream",
        fileSize: fileField.size,
        review: {
          create: {
            status: "PROCESSING",
            reviewProgress: 5,
            reviewStep: "Upload received",
          },
        },
      },
      include: { review: true },
    });

    await queueDocumentReview(document.id);

    return NextResponse.json(
      {
        documentId: document.id,
        reviewStatus: document.review?.status ?? "PROCESSING",
      },
      { status: 202 },
    );
  } catch (err) {
    console.error("document upload persist failed", err);
    await storage.delete(bucket, objectPath).catch(() => undefined);
    return NextResponse.json({ error: "Failed to save document" }, { status: 500 });
  }
}
