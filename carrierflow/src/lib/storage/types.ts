export type FileMeta = {
  contentType: string;
  size: number;
};

export type StoredObject = {
  storageKey: string;
  bucket: string;
};

export interface StorageProvider {
  upload(
    bucket: string,
    path: string,
    file: Buffer,
    meta: FileMeta,
  ): Promise<StoredObject>;
  getSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number,
  ): Promise<string>;
  delete(bucket: string, path: string): Promise<void>;
}

export const STORAGE_BUCKETS = {
  carrierDocuments: "carrier-documents",
  identityDocuments: "identity-documents",
  applicationAttachments: "application-attachments",
} as const;

export type StorageBucket =
  (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];
