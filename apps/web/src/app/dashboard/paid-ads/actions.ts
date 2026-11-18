"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@growthpilot/db";
import {
  getPrimaryOrganizationForUser,
  disconnectGoogleAdsAccount,
  createAdCampaign,
  submitAdCampaignForApproval,
  approveAdCampaign,
  rejectAdCampaign,
  launchAdCampaign,
  pauseAdCampaign,
} from "@growthpilot/core";

export type ActionResult = { error: string } | undefined;

export async function createAdCampaignAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };
  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return { error: "No organization found." };

  const brandId = String(formData.get("brandId") ?? "");
  const connectedAccountId = String(formData.get("connectedAccountId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const dailyBudget = Number(formData.get("dailyBudget") ?? "");
  if (!brandId || !connectedAccountId || !name || !Number.isFinite(dailyBudget)) {
    return { error: "Brand, connected account, name, and a numeric daily budget are required." };
  }

  const brand = await prisma.brand.findFirst({ where: { id: brandId, organizationId: context.organization.id } });
  if (!brand) return { error: "Brand not found." };

  try {
    await createAdCampaign({
      organizationId: context.organization.id,
      workspaceId: brand.workspaceId,
      brandId,
      connectedAccountId,
      name,
      dailyBudgetCurrencyUnits: dailyBudget,
      actorUserId: session.user.id,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create ad campaign." };
  }

  revalidatePath("/dashboard/paid-ads");
  return undefined;
}

async function withOrg(formData: FormData, fn: (organizationId: string, actorUserId: string, adCampaignId: string) => Promise<unknown>) {
  const session = await auth();
  if (!session?.user) return;
  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return;
  const adCampaignId = String(formData.get("adCampaignId") ?? "");
  if (!adCampaignId) return;

  await fn(context.organization.id, session.user.id, adCampaignId);
  revalidatePath("/dashboard/paid-ads");
}

export async function submitForApprovalAction(formData: FormData) {
  await withOrg(formData, (organizationId, actorUserId, adCampaignId) =>
    submitAdCampaignForApproval({ organizationId, actorUserId, adCampaignId }),
  );
}

export async function approveAction(formData: FormData) {
  await withOrg(formData, (organizationId, actorUserId, adCampaignId) =>
    approveAdCampaign({ organizationId, actorUserId, adCampaignId }),
  );
}

export async function rejectAction(formData: FormData) {
  await withOrg(formData, (organizationId, actorUserId, adCampaignId) =>
    rejectAdCampaign({ organizationId, actorUserId, adCampaignId }),
  );
}

export async function launchAction(formData: FormData) {
  await withOrg(formData, (organizationId, actorUserId, adCampaignId) =>
    launchAdCampaign({ organizationId, actorUserId, adCampaignId }),
  );
}

export async function pauseAction(formData: FormData) {
  await withOrg(formData, (organizationId, actorUserId, adCampaignId) =>
    pauseAdCampaign({ organizationId, actorUserId, adCampaignId }),
  );
}

export async function disconnectGoogleAdsAccountAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;
  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return;

  const connectedAccountId = String(formData.get("connectedAccountId") ?? "");
  if (!connectedAccountId) return;

  await disconnectGoogleAdsAccount({
    organizationId: context.organization.id,
    connectedAccountId,
    actorUserId: session.user.id,
  });

  revalidatePath("/dashboard/paid-ads");
}
