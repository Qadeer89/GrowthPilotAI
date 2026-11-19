"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  generateAndSaveVideoScript,
  generateVideoAssets,
  getPrimaryOrganizationForUser,
  publishVideoProject,
  renderVideo,
} from "@growthpilot/core";

export type ActionResult = { error: string } | undefined;

export async function generateScriptAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };

  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return { error: "No organization found." };

  const brandId = String(formData.get("brandId") ?? "");
  const topic = String(formData.get("topic") ?? "").trim();
  if (!brandId || !topic) return { error: "Brand and video topic are required." };

  try {
    await generateAndSaveVideoScript({
      organizationId: context.organization.id,
      brandId,
      actorUserId: session.user.id,
      topic,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not generate video script.";
    return { error: message };
  }

  revalidatePath("/dashboard/creative");
  return undefined;
}

export async function generateAssetsAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;
  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return;

  const videoProjectId = String(formData.get("videoProjectId") ?? "");
  if (!videoProjectId) return;

  await generateVideoAssets({
    organizationId: context.organization.id,
    videoProjectId,
    actorUserId: session.user.id,
  });

  revalidatePath("/dashboard/creative");
}

export async function renderVideoAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;
  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return;

  const videoProjectId = String(formData.get("videoProjectId") ?? "");
  if (!videoProjectId) return;

  try {
    await renderVideo({
      organizationId: context.organization.id,
      videoProjectId,
      actorUserId: session.user.id,
    });
  } catch {
    // renderVideo already persists status "failed" + failureReason before
    // rethrowing — swallow here so the page re-renders showing that state
    // instead of crashing to the Next.js error boundary.
  }

  revalidatePath("/dashboard/creative");
}

export async function publishVideoAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;
  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return;

  const videoProjectId = String(formData.get("videoProjectId") ?? "");
  if (!videoProjectId) return;

  const results = await publishVideoProject({
    organizationId: context.organization.id,
    videoProjectId,
    actorUserId: session.user.id,
  });

  revalidatePath("/dashboard/creative");

  const published = results.filter((r) => r.status === "published").length;
  const failed = results.filter((r) => r.status === "failed").length;
  redirect(`/dashboard/creative?published=${published}&failed=${failed}`);
}
