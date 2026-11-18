"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getPrimaryOrganizationForUser, sendMarketingEmail, retrySendMarketingEmail } from "@growthpilot/core";

export type ActionResult = { error: string } | undefined;

export async function sendEmailAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };
  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return { error: "No organization found." };

  const toEmail = String(formData.get("toEmail") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const bodyHtml = String(formData.get("bodyHtml") ?? "").trim();
  const campaignId = String(formData.get("campaignId") ?? "") || undefined;
  if (!toEmail || !subject || !bodyHtml) return { error: "Recipient, subject, and body are required." };

  try {
    await sendMarketingEmail({
      organizationId: context.organization.id,
      campaignId,
      toEmail,
      subject,
      bodyHtml,
      actorUserId: session.user.id,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not send email." };
  }

  revalidatePath("/dashboard/email");
  return undefined;
}

export async function retryEmailAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;
  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return;

  const emailSendId = String(formData.get("emailSendId") ?? "");
  if (!emailSendId) return;

  await retrySendMarketingEmail({ organizationId: context.organization.id, emailSendId, actorUserId: session.user.id });
  revalidatePath("/dashboard/email");
}
