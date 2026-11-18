"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
  getPrimaryOrganizationForUser,
  askAnalyst,
  detectOptimizationOpportunities,
  approveOptimizationRecommendation,
  rejectOptimizationRecommendation,
} from "@growthpilot/core";

export type ActionResult = { error: string } | undefined;

export async function askAnalystAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };
  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return { error: "No organization found." };

  const brandId = String(formData.get("brandId") ?? "");
  const question = String(formData.get("question") ?? "").trim();
  if (!brandId || !question) return { error: "Brand and a question are required." };

  try {
    await askAnalyst({ organizationId: context.organization.id, brandId, question, actorUserId: session.user.id });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not ask the analyst." };
  }

  revalidatePath("/dashboard/analytics");
  return undefined;
}

export async function detectOptimizationAction() {
  const session = await auth();
  if (!session?.user) return;
  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return;

  await detectOptimizationOpportunities({ organizationId: context.organization.id, actorUserId: session.user.id });
  revalidatePath("/dashboard/analytics");
}

async function withOrg(formData: FormData, fn: (organizationId: string, actorUserId: string, recommendationId: string) => Promise<unknown>) {
  const session = await auth();
  if (!session?.user) return;
  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return;
  const recommendationId = String(formData.get("recommendationId") ?? "");
  if (!recommendationId) return;

  await fn(context.organization.id, session.user.id, recommendationId);
  revalidatePath("/dashboard/analytics");
}

export async function approveRecommendationAction(formData: FormData) {
  await withOrg(formData, (organizationId, actorUserId, recommendationId) =>
    approveOptimizationRecommendation({ organizationId, recommendationId, actorUserId }),
  );
}

export async function rejectRecommendationAction(formData: FormData) {
  await withOrg(formData, (organizationId, actorUserId, recommendationId) =>
    rejectOptimizationRecommendation({ organizationId, recommendationId, actorUserId }),
  );
}
