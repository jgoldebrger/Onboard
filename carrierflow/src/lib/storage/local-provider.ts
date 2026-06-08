import { mkdir, writeFile, unlink, readFile } from "fs/promises";
import path from "path";
import type { FileMeta, StorageProvider, StoredObject } from "./types";

export class LocalStorageProvider implements StorageProvider {
  private basePath: string;

  constructor() {
    this.basePath =
      process.env.LOCAL_STORAGE_PATH ??
      path.join(process.cwd(), ".data", "uploads");
  }

  private resolvePath(bucket: string, objectPath: string) {
    return path.join(this.basePath, bucket, objectPath);
  }

  async upload(
    bucket: string,
    objectPath: string,
    file: Buffer,
    _meta: FileMeta,
  ): Promise<StoredObject> {
    const fullPath = this.resolvePath(bucket, objectPath);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file);
    return { storageKey: `${bucket}/${objectPath}`, bucket };
  }

  async getSignedUrl(
    bucket: string,
    objectPath: string,
    _expiresIn: number,
  ): Promise<string> {
    const fullPath = this.resolvePath(bucket, objectPath);
    const data = await readFile(fullPath);
    return `data:application/octet-stream;base64,${data.toString("base64")}`;
  }

  async delete(bucket: string, objectPath: string): Promise<void> {
    const fullPath = this.resolvePath(bucket, objectPath);
    await unlink(fullPath).catch(() => undefined);
  }
}
