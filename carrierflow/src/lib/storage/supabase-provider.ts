import { createClient } from "@supabase/supabase-js";
import type { FileMeta, StorageProvider, StoredObject } from "./types";

export class SupabaseStorageProvider implements StorageProvider {
  private client;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Supabase URL and service role key are required");
    }
    this.client = createClient(url, key);
  }

  async upload(
    bucket: string,
    objectPath: string,
    file: Buffer,
    meta: FileMeta,
  ): Promise<StoredObject> {
    const { error } = await this.client.storage
      .from(bucket)
      .upload(objectPath, file, {
        contentType: meta.contentType,
        upsert: false,
      });
    if (error) throw error;
    return { storageKey: `${bucket}/${objectPath}`, bucket };
  }

  async getSignedUrl(
    bucket: string,
    objectPath: string,
    expiresIn: number,
  ): Promise<string> {
    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUrl(objectPath, expiresIn);
    if (error || !data?.signedUrl) throw error ?? new Error("No signed URL");
    return data.signedUrl;
  }

  async delete(bucket: string, objectPath: string): Promise<void> {
    const { error } = await this.client.storage
      .from(bucket)
      .remove([objectPath]);
    if (error) throw error;
  }
}
