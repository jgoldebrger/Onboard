import { LocalStorageProvider } from "./local-provider";
import { SupabaseStorageProvider } from "./supabase-provider";
import type { StorageProvider } from "./types";

export type { FileMeta, StoredObject, StorageProvider, StorageBucket } from "./types";
export { STORAGE_BUCKETS } from "./types";
export { buildStoragePath } from "./paths";

export function getStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER ?? "local";
  if (provider === "supabase") {
    return new SupabaseStorageProvider();
  }
  return new LocalStorageProvider();
}
