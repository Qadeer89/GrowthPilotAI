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

// One-click unsubscribe links must not let anyone suppress an arbitrary
// address for an arbitrary org just by guessing a URL -- the token is an
// HMAC over organizationId+email with its own HKDF-derived key, so a
// tampered or fabricated token fails verification.
function getUnsubscribeKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  const derived = crypto.hkdfSync(
    "sha256",
    Buffer.from(secret, "base64"),
    Buffer.alloc(0),
    Buffer.from("growthpilot-unsubscribe-token-v1"),
    32,
  );
  return Buffer.from(derived);
}

export function createUnsubscribeToken(organizationId: string, email: string): string {
  const payload = `${organizationId}:${email.toLowerCase()}`;
  const signature = crypto.createHmac("sha256", getUnsubscribeKey()).update(payload).digest("base64url");
  return `${Buffer.from(payload, "utf8").toString("base64url")}.${signature}`;
}

export function verifyUnsubscribeToken(token: string): { organizationId: string; email: string } | null {
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  const payload = Buffer.from(payloadB64, "base64url").toString("utf8");
  const expectedSignature = crypto.createHmac("sha256", getUnsubscribeKey()).update(payload).digest("base64url");

  const valid =
    signature.length === expectedSignature.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  if (!valid) return null;

  const [organizationId, email] = payload.split(":");
  if (!organizationId || !email) return null;
  return { organizationId, email };
}
