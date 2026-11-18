import { applyResendWebhookEvent, verifyWebhookRequest } from "@growthpilot/core";

// Public: Resend calls this directly, there is no logged-in session. The
// Svix signature (verified in verifyWebhookRequest) is what proves the
// request actually came from Resend, not a bearer token or cookie.
export async function POST(req: Request) {
  const payload = await req.text();
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing signature headers", { status: 400 });
  }

  const valid = verifyWebhookRequest({ payload, svixId, svixTimestamp, svixSignature });
  if (!valid) return new Response("Invalid signature", { status: 401 });

  const event = JSON.parse(payload) as { type: string; data: { email_id?: string } };
  await applyResendWebhookEvent(event);

  return new Response(null, { status: 200 });
}
