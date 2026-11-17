import crypto from "node:crypto";

// OAuth access tokens are encrypted at rest (spec Section 17) with a key
// derived from AUTH_SECRET via HKDF -- never the raw secret itself, and
// never logged or returned in plaintext outside this module's callers.
function getKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  const derived = crypto.hkdfSync(
    "sha256",
    Buffer.from(secret, "base64"),
    Buffer.alloc(0),
    Buffer.from("growthpilot-oauth-token-v1"),
    32,
  );
  return Buffer.from(derived);
}

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(".");
}

export function decryptSecret(stored: string): string {
  const [ivB64, tagB64, ctB64] = stored.split(".");
  const key = getKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()]);
  return plaintext.toString("utf8");
}
