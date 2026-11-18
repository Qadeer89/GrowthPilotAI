// Resend connector -- the only place this codebase talks to Resend's API
// directly. Endpoints/headers verified against Resend's current official
// docs (send-email, webhooks, contacts) before writing this, not guessed.
import crypto from "node:crypto";

const API_BASE = "https://api.resend.com";

function config(): { apiKey: string; fromEmail: string } {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    throw new Error("RESEND_API_KEY/RESEND_FROM_EMAIL are not configured in apps/web/.env.local");
  }
  return { apiKey, fromEmail };
}

export type ResendSendResult = { messageId: string };

export async function sendResendEmail(input: {
  to: string;
  subject: string;
  html: string;
  idempotencyKey: string;
}): Promise<ResendSendResult> {
  const { apiKey, fromEmail } = config();

  const response = await fetch(`${API_BASE}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: input.to,
      subject: input.subject,
      html: input.html,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend send failed (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as { id: string };
  return { messageId: data.id };
}

export type ResendEmailStatus = { lastEvent: string | null };

// Polls the provider's own record for a send -- used right after a send to
// confirm what actually happened (e.g. a bounce to a test address) without
// requiring a publicly reachable webhook endpoint during local development.
export async function fetchResendEmailStatus(messageId: string): Promise<ResendEmailStatus> {
  const { apiKey } = config();
  const response = await fetch(`${API_BASE}/emails/${messageId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`Resend status lookup failed (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as { last_event?: string };
  return { lastEvent: data.last_event ?? null };
}

// Resend signs webhook requests using Svix (svix-id/svix-timestamp/svix-signature
// headers, HMAC-SHA256 over "{id}.{timestamp}.{body}", base64-encoded against
// the base64 portion of the whsec_... signing secret). Verified independently
// here rather than pulling in the svix package, to keep this connector's only
// dependency Node's own crypto module.
export function verifyResendWebhookSignature(input: {
  payload: string;
  svixId: string;
  svixTimestamp: string;
  svixSignature: string;
  secret: string;
}): boolean {
  const secretBytes = Buffer.from(input.secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${input.svixId}.${input.svixTimestamp}.${input.payload}`;
  const expectedSignature = crypto.createHmac("sha256", secretBytes).update(signedContent).digest("base64");

  const providedSignatures = input.svixSignature.split(" ").map((s) => s.split(",")[1]).filter(Boolean);

  return providedSignatures.some((provided) => {
    try {
      return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(provided));
    } catch {
      return false;
    }
  });
}

export type ResendWebhookEvent = {
  type: string;
  data: { email_id?: string; to?: string[] };
};
