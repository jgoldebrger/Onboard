import { createHash } from "crypto";
import { loadDocumentBytes } from "@/lib/ocr";
import { db } from "@/lib/db";

type ZipEntry = { name: string; data: Buffer };

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]!;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildZip(entries: ZipEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, "utf8");
    const crc = crc32(entry.data);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(entry.data.length, 18);
    localHeader.writeUInt32LE(entry.data.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuf, entry.data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(entry.data.length, 20);
    centralHeader.writeUInt32LE(entry.data.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, nameBuf);

    offset += localHeader.length + nameBuf.length + entry.data.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const localData = Buffer.concat(localParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(localData.length, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([localData, centralDir, end]);
}

function safeFileName(name: string, used: Set<string>): string {
  const base = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim() || "file";
  let candidate = base;
  let n = 1;
  while (used.has(candidate)) {
    const dot = base.lastIndexOf(".");
    if (dot > 0) {
      candidate = `${base.slice(0, dot)}-${n}${base.slice(dot)}`;
    } else {
      candidate = `${base}-${n}`;
    }
    n++;
  }
  used.add(candidate);
  return candidate;
}

export async function buildApplicationPacketZip(
  applicationId: string,
): Promise<{ buffer: Buffer; fileName: string }> {
  const application = await db.onboardingApplication.findUnique({
    where: { id: applicationId },
    include: {
      user: { select: { email: true, companyName: true } },
      documents: {
        include: { documentType: { select: { key: true, name: true } } },
        orderBy: { uploadedAt: "asc" },
      },
      identityVerification: true,
      govVerifications: { orderBy: { verifiedAt: "desc" }, take: 1 },
    },
  });

  if (!application) {
    throw new Error("Application not found");
  }

  const entries: ZipEntry[] = [];
  const usedNames = new Set<string>();

  const summary = [
    `Application ID: ${application.id}`,
    `Status: ${application.status}`,
    `Applicant: ${application.user.email}`,
    `Company: ${application.user.companyName ?? "—"}`,
    application.govVerifications[0]?.dotNumber
      ? `DOT: ${application.govVerifications[0].dotNumber}`
      : null,
    application.govVerifications[0]?.mcNumber
      ? `MC: ${application.govVerifications[0].mcNumber}`
      : null,
    `Generated: ${new Date().toISOString()}`,
  ]
    .filter(Boolean)
    .join("\n");

  entries.push({
    name: safeFileName("application-summary.txt", usedNames),
    data: Buffer.from(summary, "utf8"),
  });

  for (const doc of application.documents) {
    const prefix = doc.documentType?.key ?? "document";
    const bytes = await loadDocumentBytes(doc.storageKey);
    const folder = prefix;
    const fileName = safeFileName(
      `${folder}/${doc.fileName}`,
      usedNames,
    );
    entries.push({ name: fileName, data: bytes });
  }

  const identity = application.identityVerification;
  if (identity) {
    const dlBytes = await loadDocumentBytes(identity.dlStorageKey);
    entries.push({
      name: safeFileName("identity/drivers-license", usedNames),
      data: dlBytes,
    });
    const selfieBytes = await loadDocumentBytes(identity.selfieStorageKey);
    entries.push({
      name: safeFileName("identity/selfie", usedNames),
      data: selfieBytes,
    });
  }

  const label =
    application.user.companyName ??
    application.govVerifications[0]?.dotNumber ??
    application.id.slice(0, 8);
  const slug = label.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  const hash = createHash("sha256")
    .update(applicationId)
    .digest("hex")
    .slice(0, 8);

  return {
    buffer: buildZip(entries),
    fileName: `carrierflow-packet-${slug || "application"}-${hash}.zip`,
  };
}
