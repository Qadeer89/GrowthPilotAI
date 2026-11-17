import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

// Local-disk asset storage for Creative Studio generations (images, TTS
// audio, rendered video). Swap this module for a real S3-compatible bucket
// when deploying — nothing outside this file knows the storage is local.
const STORAGE_ROOT = process.env.CREATIVE_STORAGE_DIR
  ? path.resolve(process.env.CREATIVE_STORAGE_DIR)
  : path.resolve(process.cwd(), ".creative-storage");

function orgDir(organizationId: string): string {
  return path.join(STORAGE_ROOT, organizationId);
}

/** Writes a new asset file for this org and returns its storage key (just the filename). */
export async function writeAssetFile(
  organizationId: string,
  extension: string,
  data: Buffer,
): Promise<string> {
  const dir = orgDir(organizationId);
  await fs.mkdir(dir, { recursive: true });

  const storageKey = `${crypto.randomUUID()}.${extension}`;
  await fs.writeFile(path.join(dir, storageKey), data);
  return storageKey;
}

/** Resolves a stored asset's storage key back to an absolute path on disk. */
export function resolveAssetFile(organizationId: string, storageKey: string): string {
  return path.join(orgDir(organizationId), storageKey);
}
