"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { createCampaign, getPrimaryOrganizationForUser, publishSocialPost, retryPublishSocialPost } from "@growthpilot/core";

export type ActionResult = { error: string } | undefined;

export async function createCampaignAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };
  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return { error: "No organization found." };

  const brandId = String(formData.get("brandId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!brandId || !name) return { error: "Brand and campaign name are required." };

  try {
    await createCampaign({
      organizationId: context.organization.id,
      brandId,
      actorUserId: session.user.id,
      name,
      objective: String(formData.get("objective") ?? "") || undefined,
      keyMessage: String(formData.get("keyMessage") ?? "") || undefined,
      cta: String(formData.get("cta") ?? "") || undefined,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create campaign." };
  }

  revalidatePath("/dashboard/campaigns");
  return undefined;
}

export async function publishPostAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };
  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return { error: "No organization found." };

  const connectedAccountId = String(formData.get("connectedAccountId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const campaignId = String(formData.get("campaignId") ?? "") || undefined;
  if (!connectedAccountId || !body) return { error: "A connected account and post text are required." };

  try {
    await publishSocialPost({
      organizationId: context.organization.id,
      connectedAccountId,
      campaignId,
      body,
      actorUserId: session.user.id,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not publish post." };
  }

  revalidatePath("/dashboard/campaigns");
  return undefined;
}

export async function retryPostAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;
  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return;

  const socialPostId = String(formData.get("socialPostId") ?? "");
  if (!socialPostId) return;

  await retryPublishSocialPost({
    organizationId: context.organization.id,
    socialPostId,
    actorUserId: session.user.id,
  });

  revalidatePath("/dashboard/campaigns");
}
