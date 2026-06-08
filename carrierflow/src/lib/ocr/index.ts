import { getStorageProvider } from "@/lib/storage";

function parseStorageKey(storageKey: string): { bucket: string; path: string } {
  const slash = storageKey.indexOf("/");
  if (slash === -1) {
    throw new Error(`Invalid storage key: ${storageKey}`);
  }
  return {
    bucket: storageKey.slice(0, slash),
    path: storageKey.slice(slash + 1),
  };
}

export async function loadDocumentBytes(storageKey: string): Promise<Buffer> {
  const { bucket, path } = parseStorageKey(storageKey);
  const storage = getStorageProvider();
  const url = await storage.getSignedUrl(bucket, path, 300);

  if (url.startsWith("data:")) {
    const base64 = url.split(",")[1];
    if (!base64) {
      throw new Error("Failed to decode local storage data URL");
    }
    return Buffer.from(base64, "base64");
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load document from storage (${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/** Extract plain text from a PDF buffer (server-side only). */
export async function extractPdfText(
  buffer: Buffer,
  fileName: string,
): Promise<string> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    const text = result.text?.trim() ?? "";
    if (text.length > 0) return text;
  } catch {
    /* fall through to stub */
  }
  return extractPdfTextStub(buffer, fileName);
}

export async function extractDocumentText(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<string> {
  if (isPdfMimeType(mimeType)) {
    return extractPdfText(buffer, fileName);
  }
  return "";
}

/** Stub when no PDF parsing library is installed. */
export function extractPdfTextStub(buffer: Buffer, fileName: string): string {
  const header = buffer.subarray(0, 8).toString("ascii");
  const looksLikePdf = header.startsWith("%PDF");
  return [
    `PDF document: ${fileName}`,
    `Size: ${buffer.length} bytes`,
    `Header valid: ${looksLikePdf}`,
    "Full text extraction is not available without a PDF library.",
  ].join("\n");
}

export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export function isPdfMimeType(mimeType: string): boolean {
  return mimeType === "application/pdf";
}
