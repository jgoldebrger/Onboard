export type DocumentVersionRow = {
  id: string;
  version: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  storageKey: string;
  reviewId: string | null;
  reviewStatus: string | null;
  reviewProgress: number | null;
  failureReasons: string[];
  extractedData: unknown;
};

export type DocumentsByTypeGroup = {
  typeKey: string;
  typeName: string;
  versions: DocumentVersionRow[];
};

export type CarrierDocumentInput = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: Date;
  storageKey: string;
  documentType: { key: string; name: string } | null;
  review: {
    id: string;
    status: string;
    reviewProgress: number;
    failureReasons: string[];
    extractedData: unknown;
  } | null;
};

/** Group uploads by document type; newest upload = highest version number. */
export function groupDocumentsByType(
  documents: CarrierDocumentInput[],
): DocumentsByTypeGroup[] {
  const byType = new Map<string, DocumentsByTypeGroup>();

  const byTypeDocs = new Map<string, CarrierDocumentInput[]>();
  for (const doc of documents) {
    const typeKey = doc.documentType?.key ?? "_untyped";
    const list = byTypeDocs.get(typeKey) ?? [];
    list.push(doc);
    byTypeDocs.set(typeKey, list);
  }

  for (const [typeKey, docs] of byTypeDocs) {
    const typeName = docs[0]?.documentType?.name ?? "Untyped";
    const chronological = [...docs].sort(
      (a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime(),
    );
    const versionById = new Map<string, number>();
    chronological.forEach((doc, index) => {
      versionById.set(doc.id, index + 1);
    });

    const versions = [...docs]
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
      .map((doc) => ({
      id: doc.id,
      version: versionById.get(doc.id) ?? 1,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      uploadedAt: doc.uploadedAt.toISOString(),
      storageKey: doc.storageKey,
      reviewId: doc.review?.id ?? null,
      reviewStatus: doc.review?.status ?? null,
      reviewProgress: doc.review?.reviewProgress ?? null,
      failureReasons: doc.review?.failureReasons ?? [],
      extractedData: doc.review?.extractedData ?? null,
    }));

    byType.set(typeKey, { typeKey, typeName, versions });
  }

  return [...byType.values()].sort((a, b) =>
    a.typeName.localeCompare(b.typeName),
  );
}
