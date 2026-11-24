import { NextResponse } from "next/server";
import { Paddle, Environment } from "@paddle/paddle-node-sdk";
import { processPaddleWebhookEvent } from "@growthpilot/core";

/**
 * Unauthenticated by design -- Paddle calls this directly. Authenticity
 * comes entirely from the signature in the paddle-signature header, verified
 * against PADDLE_WEBHOOK_SECRET before any event is touched. The raw text
 * body (not parsed JSON) is what the signature covers, so it must be read
 * with req.text(), never req.json().
 */
export async function POST(req: Request) {
  const signature = req.headers.get("paddle-signature");
  const rawBody = await req.text();

  if (!signature) {
    return NextResponse.json({ error: "Missing paddle-signature header" }, { status: 401 });
  }

  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("PADDLE_WEBHOOK_SECRET is not set -- refusing to process webhook");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const paddle = new Paddle(process.env.PADDLE_API_KEY ?? "", {
    environment: process.env.PADDLE_ENV === "production" ? Environment.production : Environment.sandbox,
  });

  let event;
  try {
    event = await paddle.webhooks.unmarshal(rawBody, webhookSecret, signature);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (!event) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const result = await processPaddleWebhookEvent(event);

  // Always 200 for anything we accepted and recorded (including "ignored"
  // event types and "duplicate" deliveries) so Paddle doesn't retry them
  // forever; only a genuine processing failure returns non-2xx so Paddle retries.
  if (result === "failed") {
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
  return NextResponse.json({ status: result });
}
