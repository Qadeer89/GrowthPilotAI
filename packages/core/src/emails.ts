import crypto from "node:crypto";
import { prisma } from "@growthpilot/db";
import { sendResendEmail, fetchResendEmailStatus, verifyResendWebhookSignature } from "@growthpilot/integrations";
import { requireMembership, requirePermission } from "./rbac";
import { PERMISSIONS } from "./permissions";
import { writeAuditLog } from "./audit";
import { NotFoundError, ConflictError } from "./errors";
import { createUnsubscribeToken, verifyUnsubscribeToken } from "./crypto";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function isSuppressed(organizationId: string, email: string): Promise<boolean> {
  const entry = await prisma.suppressionEntry.findUnique({
    where: { organizationId_email: { organizationId, email: email.toLowerCase() } },
  });
  return entry !== null;
}

export async function addSuppressionEntry(input: { organizationId: string; email: string; reason: string }) {
  await prisma.suppressionEntry.upsert({
    where: {
      organizationId_email: { organizationId: input.organizationId, email: input.email.toLowerCase() },
    },
    create: { organizationId: input.organizationId, email: input.email.toLowerCase(), reason: input.reason },
    update: { reason: input.reason },
  });
}

export async function sendMarketingEmail(input: {
  organizationId: string;
  campaignId?: string;
  toEmail: string;
  subject: string;
  bodyHtml: string;
  actorUserId: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.CAMPAIGN_MANAGE);

  const toEmail = input.toEmail.toLowerCase();
  if (await isSuppressed(input.organizationId, toEmail)) {
    throw new ConflictError(
      `${toEmail} is on the suppression list (bounced, complained, or unsubscribed) and cannot be sent to.`,
    );
  }

  const campaign = input.campaignId ? await prisma.campaign.findUnique({ where: { id: input.campaignId } }) : null;

  const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const unsubscribeUrl = `${appBaseUrl}/api/unsubscribe?token=${encodeURIComponent(
    createUnsubscribeToken(input.organizationId, toEmail),
  )}`;
  const bodyHtml = `${input.bodyHtml}<p style="margin-top:24px;font-size:12px;color:#94a3b8;">Don't want these emails? <a href="${unsubscribeUrl}">Unsubscribe</a>.</p>`;

  const record = await prisma.emailSend.create({
    data: {
      organizationId: input.organizationId,
      workspaceId: campaign?.workspaceId,
      campaignId: input.campaignId,
      toEmail,
      subject: input.subject,
      bodyHtml,
      status: "queued",
      idempotencyKey: crypto.randomUUID(),
      attempts: 1,
      createdByUserId: input.actorUserId,
    },
  });

  try {
    const result = await sendResendEmail({
      to: toEmail,
      subject: input.subject,
      html: bodyHtml,
      idempotencyKey: record.idempotencyKey,
    });

    // Resend's test addresses (bounced@resend.dev, complained@resend.dev)
    // resolve their real outcome within seconds -- poll once so the UI
    // reflects what actually happened rather than just "sent".
    let lastEvent: string | null = null;
    try {
      const status = await fetchResendEmailStatus(result.messageId);
      lastEvent = status.lastEvent;
    } catch {
      // Status lookup is best-effort; the webhook (in production) is the
      // authoritative path and will update this row later regardless.
    }

    const updated = await prisma.emailSend.update({
      where: { id: record.id },
      data: {
        status: lastEvent === "bounced" || lastEvent === "complained" ? "failed" : "sent",
        providerMessageId: result.messageId,
        lastEvent,
        failureReason:
          lastEvent === "bounced"
            ? "Bounced"
            : lastEvent === "complained"
              ? "Recipient marked as spam"
              : null,
      },
    });

    if (lastEvent === "bounced") {
      await addSuppressionEntry({ organizationId: input.organizationId, email: toEmail, reason: "bounced" });
    } else if (lastEvent === "complained") {
      await addSuppressionEntry({ organizationId: input.organizationId, email: toEmail, reason: "complained" });
    }

    await writeAuditLog({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "email.sent",
      targetType: "EmailSend",
      targetId: record.id,
      metadata: { providerMessageId: result.messageId, lastEvent },
    });

    return updated;
  } catch (err) {
    return prisma.emailSend.update({
      where: { id: record.id },
      data: { status: "failed", failureReason: errorMessage(err) },
    });
  }
}

export async function retrySendMarketingEmail(input: { organizationId: string; emailSendId: string; actorUserId: string }) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.CAMPAIGN_MANAGE);

  const record = await prisma.emailSend.findFirst({
    where: { id: input.emailSendId, organizationId: input.organizationId },
  });
  if (!record) throw new NotFoundError("Email send not found in this organization");
  if (record.status === "sent") return record;

  if (await isSuppressed(input.organizationId, record.toEmail)) {
    return prisma.emailSend.update({
      where: { id: record.id },
      data: { status: "failed", failureReason: "Recipient is on the suppression list", attempts: { increment: 1 } },
    });
  }

  await prisma.emailSend.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });

  try {
    const result = await sendResendEmail({
      to: record.toEmail,
      subject: record.subject,
      html: record.bodyHtml,
      idempotencyKey: record.idempotencyKey,
    });
    return await prisma.emailSend.update({
      where: { id: record.id },
      data: { status: "sent", providerMessageId: result.messageId, failureReason: null },
    });
  } catch (err) {
    return prisma.emailSend.update({
      where: { id: record.id },
      data: { status: "failed", failureReason: errorMessage(err) },
    });
  }
}

// Resend resolves a send's real outcome (delivered/bounced/complained)
// asynchronously, sometimes a few seconds after the send call returns. With
// no publicly reachable webhook endpoint during local development, this
// reconciles any still-"sent"-with-no-terminal-event row against Resend's
// own record on every list call -- the UI self-heals without the user
// having to do anything, and in production the webhook does this instantly
// instead.
async function reconcilePendingSends(organizationId: string) {
  const pending = await prisma.emailSend.findMany({
    where: {
      organizationId,
      status: "sent",
      providerMessageId: { not: null },
      OR: [{ lastEvent: null }, { lastEvent: "queued" }, { lastEvent: "sent" }],
    },
  });

  for (const record of pending) {
    try {
      const { lastEvent } = await fetchResendEmailStatus(record.providerMessageId!);
      if (!lastEvent || lastEvent === record.lastEvent) continue;

      if (lastEvent === "bounced" || lastEvent === "complained") {
        await prisma.emailSend.update({
          where: { id: record.id },
          data: {
            status: "failed",
            lastEvent,
            failureReason: lastEvent === "bounced" ? "Bounced" : "Recipient marked as spam",
          },
        });
        await addSuppressionEntry({
          organizationId,
          email: record.toEmail,
          reason: lastEvent === "bounced" ? "bounced" : "complained",
        });
      } else {
        await prisma.emailSend.update({ where: { id: record.id }, data: { lastEvent } });
      }
    } catch {
      // Best-effort reconciliation; leave the row as-is and try again next list call.
    }
  }
}

export async function listEmailSends(organizationId: string, actorUserId: string) {
  await requireMembership(organizationId, actorUserId);
  await reconcilePendingSends(organizationId);
  return prisma.emailSend.findMany({
    where: { organizationId },
    include: { campaign: true },
    orderBy: { createdAt: "desc" },
  });
}

// Applies a verified Resend webhook event (bounce/complaint/delivery) to the
// matching EmailSend row and the organization's suppression list. Signature
// verification happens at the route handler; this function trusts its input.
export async function applyResendWebhookEvent(event: { type: string; data: { email_id?: string } }) {
  const messageId = event.data.email_id;
  if (!messageId) return;

  const record = await prisma.emailSend.findFirst({ where: { providerMessageId: messageId } });
  if (!record) return;

  const eventToStatus: Record<string, { status: string; lastEvent: string; reason?: string }> = {
    "email.delivered": { status: "sent", lastEvent: "delivered" },
    "email.bounced": { status: "failed", lastEvent: "bounced", reason: "Bounced" },
    "email.complained": { status: "failed", lastEvent: "complained", reason: "Recipient marked as spam" },
    "email.delivery_delayed": { status: "queued", lastEvent: "delivery_delayed" },
  };

  const mapped = eventToStatus[event.type];
  if (!mapped) return;

  await prisma.emailSend.update({
    where: { id: record.id },
    data: { status: mapped.status, lastEvent: mapped.lastEvent, failureReason: mapped.reason ?? null },
  });

  if (event.type === "email.bounced") {
    await addSuppressionEntry({ organizationId: record.organizationId, email: record.toEmail, reason: "bounced" });
  } else if (event.type === "email.complained") {
    await addSuppressionEntry({ organizationId: record.organizationId, email: record.toEmail, reason: "complained" });
  }
}

// No auth required by design -- this is the target of a link in an email
// the recipient clicked. The token itself (HMAC'd, see crypto.ts) is what
// proves it's legitimate, not a logged-in session.
export async function unsubscribeByToken(token: string): Promise<{ email: string } | null> {
  const decoded = verifyUnsubscribeToken(token);
  if (!decoded) return null;

  await addSuppressionEntry({ organizationId: decoded.organizationId, email: decoded.email, reason: "unsubscribed" });
  return { email: decoded.email };
}

export function verifyWebhookRequest(input: {
  payload: string;
  svixId: string;
  svixTimestamp: string;
  svixSignature: string;
}): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return false;
  return verifyResendWebhookSignature({ ...input, secret });
}
