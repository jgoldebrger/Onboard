import { randomUUID } from "crypto";
import path from "path";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { runIdentityCompare } from "@/lib/agents/identity";
import { db } from "@/lib/db";
import {
  buildStoragePath,
  getStorageProvider,
  STORAGE_BUCKETS,
} from "@/lib/storage";

type Params = { params: Promise<{ applicationId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { applicationId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const app = await db.onboardingApplication.findUnique({
    where: { id: applicationId },
    select: { userId: true },
  });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (app.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const dl = formData.get("dl");
  const selfie = formData.get("selfie");
  if (!(dl instanceof File) || !(selfie instanceof File)) {
    return NextResponse.json(
      { error: "Both dl and selfie files are required" },
      { status: 400 },
    );
  }

  const storage = getStorageProvider();
  const bucket = STORAGE_BUCKETS.identityDocuments;
  const ext = (name: string) => path.extname(name).slice(1).toLowerCase() || "jpg";

  const dlPath = buildStoragePath(applicationId, "dl", `${randomUUID()}.${ext(dl.name)}`);
  const selfiePath = buildStoragePath(
    applicationId,
    "selfie",
    `${randomUUID()}.${ext(selfie.name)}`,
  );

  const dlBuf = Buffer.from(await dl.arrayBuffer());
  const selfieBuf = Buffer.from(await selfie.arrayBuffer());

  const [dlStored, selfieStored] = await Promise.all([
    storage.upload(bucket, dlPath, dlBuf, {
      contentType: dl.type || "image/jpeg",
      size: dl.size,
    }),
    storage.upload(bucket, selfiePath, selfieBuf, {
      contentType: selfie.type || "image/jpeg",
      size: selfie.size,
    }),
  ]);

  const compare = await runIdentityCompare({
    dlStorageKey: dlStored.storageKey,
    selfieStorageKey: selfieStored.storageKey,
  });

  const identity = await db.identityVerification.upsert({
    where: { applicationId },
    create: {
      applicationId,
      dlStorageKey: dlStored.storageKey,
      selfieStorageKey: selfieStored.storageKey,
      extractedIdData: (compare.extractedIdData ?? {}) as Prisma.InputJsonValue,
      faceDetected: compare.faceDetected,
      match: compare.match,
      confidence: compare.confidence,
      status: "MANUAL_REVIEW",
      requiresHumanReview: true,
    },
    update: {
      dlStorageKey: dlStored.storageKey,
      selfieStorageKey: selfieStored.storageKey,
      extractedIdData: (compare.extractedIdData ?? {}) as Prisma.InputJsonValue,
      faceDetected: compare.faceDetected,
      match: compare.match,
      confidence: compare.confidence,
      status: "MANUAL_REVIEW",
      requiresHumanReview: true,
    },
  });

  return NextResponse.json({
    status: identity.status,
    requiresHumanReview: identity.requiresHumanReview,
    confidence: identity.confidence,
  });
}
