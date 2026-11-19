"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  approveContentItem,
  generateAndSaveContentDraft,
  getPrimaryOrganizationForUser,
  rejectContentItem,
  updateContentItemBody,
  type ContentType,
} from "@growthpilot/core";

export type GenerateContentResult = { error: string } | undefined;

export async function generateContentAction(
  _prev: GenerateContentResult,
  formData: FormData,
): Promise<GenerateContentResult> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };

  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return { error: "No organization found." };

  const brandId = String(formData.get("brandId") ?? "");
  const contentType = String(formData.get("contentType") ?? "") as ContentType;
  const topic = String(formData.get("topic") ?? "").trim();

  if (!brandId || !contentType || !topic) {
    return { error: "Brand, content type, and topic/brief are required." };
  }

  try {
    await generateAndSaveContentDraft({
      organizationId: context.organization.id,
      brandId,
      actorUserId: session.user.id,
      contentType,
      platform: String(formData.get("platform") ?? "") || undefined,
      audience: String(formData.get("audience") ?? "") || undefined,
      tone: String(formData.get("tone") ?? "") || undefined,
      topic,
      keywords: String(formData.get("keywords") ?? "") || undefined,
      cta: String(formData.get("cta") ?? "") || undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not generate content.";
    return { error: message };
  }

  revalidatePath("/dashboard/content");
  return undefined;
}

export async function updateContentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return;

  const contentItemId = String(formData.get("contentItemId") ?? "");
  const body = String(formData.get("body") ?? "");
  if (!contentItemId || !body) return;

  await updateContentItemBody({
    organizationId: context.organization.id,
    contentItemId,
    actorUserId: session.user.id,
    body,
  });

  revalidatePath("/dashboard/content");
}

export async function approveContentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;
  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return;

  const contentItemId = String(formData.get("contentItemId") ?? "");
  if (!contentItemId) return;

  const { publishResult } = await approveContentItem({
    organizationId: context.organization.id,
    contentItemId,
    actorUserId: session.user.id,
  });

  revalidatePath("/dashboard/content");

  if (publishResult) {
    const params = new URLSearchParams({
      published: String(publishResult.published.length),
      failed: String(publishResult.failed.length),
    });
    redirect(`/dashboard/content?${params.toString()}`);
  }
}

export async function rejectContentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;
  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return;

  const contentItemId = String(formData.get("contentItemId") ?? "");
  if (!contentItemId) return;

  await rejectContentItem({
    organizationId: context.organization.id,
    contentItemId,
    actorUserId: session.user.id,
  });

  revalidatePath("/dashboard/content");
}
