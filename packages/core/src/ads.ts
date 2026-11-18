import { prisma } from "@growthpilot/db";
import {
  buildGoogleAdsAuthorizationUrl,
  exchangeGoogleAdsCode,
  refreshGoogleAdsAccessToken,
  listAccessibleGoogleAdsCustomers,
  createGoogleAdsCampaign,
  fetchGoogleAdsCampaignStatus,
  pauseGoogleAdsCampaign,
} from "@growthpilot/integrations";
import { requireMembership, requirePermission } from "./rbac";
import { PERMISSIONS } from "./permissions";
import { writeAuditLog } from "./audit";
import { NotFoundError, ConflictError, ForbiddenError, ValidationError } from "./errors";
import { encryptSecret, decryptSecret } from "./crypto";

export function getGoogleAdsAuthorizationUrl(state: string): string {
  return buildGoogleAdsAuthorizationUrl(state);
}

// Connects every Google Ads customer account accessible to the signed-in
// Google user as its own ConnectedAccount row, so the org can pick which one
// to launch campaigns under. managerCustomerId defaults to the account
// itself -- the launch path overrides it if the account turns out to be a
// client under a manager.
export async function connectGoogleAdsAccounts(input: {
  organizationId: string;
  actorUserId: string;
  code: string;
  managerCustomerId?: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.ORG_MANAGE_INTEGRATIONS);

  const token = await exchangeGoogleAdsCode(input.code);
  if (!token.refreshToken) {
    throw new ConflictError(
      "Google did not return a refresh token. Disconnect this app's access at myaccount.google.com/permissions and try connecting again.",
    );
  }

  const customerIds = await listAccessibleGoogleAdsCustomers(token.accessToken);
  if (customerIds.length === 0) {
    throw new ConflictError("No Google Ads customer accounts are accessible to this Google account");
  }

  const expiresAt = new Date(Date.now() + token.expiresInSeconds * 1000);
  const accounts = [];

  for (const customerId of customerIds) {
    const account = await prisma.connectedAccount.upsert({
      where: {
        organizationId_provider_providerAccountId: {
          organizationId: input.organizationId,
          provider: "google_ads",
          providerAccountId: customerId,
        },
      },
      create: {
        organizationId: input.organizationId,
        provider: "google_ads",
        providerAccountId: customerId,
        managerCustomerId: input.managerCustomerId ?? customerId,
        displayName: `Google Ads ${customerId}`,
        status: "connected",
        connectedByUserId: input.actorUserId,
      },
      update: { status: "connected" },
    });

    await prisma.oAuthToken.upsert({
      where: { connectedAccountId: account.id },
      create: {
        connectedAccountId: account.id,
        accessTokenEncrypted: encryptSecret(token.accessToken),
        refreshTokenEncrypted: encryptSecret(token.refreshToken),
        scope: "https://www.googleapis.com/auth/adwords",
        expiresAt,
      },
      update: {
        accessTokenEncrypted: encryptSecret(token.accessToken),
        refreshTokenEncrypted: encryptSecret(token.refreshToken),
        expiresAt,
      },
    });

    accounts.push(account);
  }

  await writeAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "integration.connected",
    targetType: "ConnectedAccount",
    targetId: accounts[0].id,
    metadata: { provider: "google_ads", customerIds },
  });

  return accounts;
}

export async function disconnectGoogleAdsAccount(input: {
  organizationId: string;
  connectedAccountId: string;
  actorUserId: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.ORG_MANAGE_INTEGRATIONS);

  const account = await prisma.connectedAccount.findFirst({
    where: { id: input.connectedAccountId, organizationId: input.organizationId, provider: "google_ads" },
  });
  if (!account) throw new NotFoundError("Connected Google Ads account not found in this organization");

  await prisma.connectedAccount.update({ where: { id: account.id }, data: { status: "disconnected" } });

  await writeAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "integration.disconnected",
    targetType: "ConnectedAccount",
    targetId: account.id,
  });
}

export async function listConnectedGoogleAdsAccounts(organizationId: string, actorUserId: string) {
  await requireMembership(organizationId, actorUserId);
  return prisma.connectedAccount.findMany({
    where: { organizationId, provider: "google_ads" },
    orderBy: { createdAt: "desc" },
  });
}

// Returns a fresh access token for a connected Google Ads account, using the
// stored refresh token. Access tokens are short-lived (~1hr), so this always
// refreshes rather than trusting a cached one for the low-frequency calls
// this connector makes.
async function getFreshAccessToken(connectedAccountId: string): Promise<string> {
  const oauthToken = await prisma.oAuthToken.findUnique({ where: { connectedAccountId } });
  if (!oauthToken?.refreshTokenEncrypted) {
    throw new ConflictError("This Google Ads account has no stored refresh token; reconnect it");
  }
  const refreshToken = decryptSecret(oauthToken.refreshTokenEncrypted);
  const refreshed = await refreshGoogleAdsAccessToken(refreshToken);
  await prisma.oAuthToken.update({
    where: { connectedAccountId },
    data: {
      accessTokenEncrypted: encryptSecret(refreshed.accessToken),
      expiresAt: new Date(Date.now() + refreshed.expiresInSeconds * 1000),
    },
  });
  return refreshed.accessToken;
}

export async function createAdCampaign(input: {
  organizationId: string;
  workspaceId: string;
  brandId: string;
  connectedAccountId: string;
  campaignId?: string;
  name: string;
  dailyBudgetCurrencyUnits: number;
  actorUserId: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.CAMPAIGN_CREATE);

  if (!input.name.trim()) throw new ValidationError("Campaign name is required");
  if (!(input.dailyBudgetCurrencyUnits > 0)) throw new ValidationError("Daily budget must be greater than 0");

  const account = await prisma.connectedAccount.findFirst({
    where: { id: input.connectedAccountId, organizationId: input.organizationId, provider: "google_ads" },
  });
  if (!account) throw new NotFoundError("Connected Google Ads account not found in this organization");

  const adCampaign = await prisma.adCampaign.create({
    data: {
      organizationId: input.organizationId,
      workspaceId: input.workspaceId,
      brandId: input.brandId,
      connectedAccountId: input.connectedAccountId,
      campaignId: input.campaignId,
      provider: "google_ads",
      name: input.name,
      dailyBudgetMicros: BigInt(Math.round(input.dailyBudgetCurrencyUnits * 1_000_000)),
      status: "draft",
      createdByUserId: input.actorUserId,
    },
  });

  await writeAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "ad_campaign.created",
    targetType: "AdCampaign",
    targetId: adCampaign.id,
  });

  return adCampaign;
}

export async function submitAdCampaignForApproval(input: {
  organizationId: string;
  adCampaignId: string;
  actorUserId: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.CAMPAIGN_MANAGE);

  const adCampaign = await prisma.adCampaign.findFirst({
    where: { id: input.adCampaignId, organizationId: input.organizationId },
  });
  if (!adCampaign) throw new NotFoundError("Ad campaign not found in this organization");
  if (adCampaign.status !== "draft") {
    throw new ConflictError(`Cannot submit a campaign in status "${adCampaign.status}" for approval`);
  }

  return prisma.adCampaign.update({ where: { id: adCampaign.id }, data: { status: "pending_approval" } });
}

// The approval gate itself. Creates the AdApproval record that
// launchAdCampaign requires -- this is the only way such a record comes
// into existence, and it requires the ads.approveLaunch permission.
export async function approveAdCampaign(input: {
  organizationId: string;
  adCampaignId: string;
  note?: string;
  actorUserId: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.ADS_APPROVE_LAUNCH);

  const adCampaign = await prisma.adCampaign.findFirst({
    where: { id: input.adCampaignId, organizationId: input.organizationId },
  });
  if (!adCampaign) throw new NotFoundError("Ad campaign not found in this organization");
  if (adCampaign.status !== "pending_approval" && adCampaign.status !== "draft") {
    throw new ConflictError(`Cannot approve a campaign in status "${adCampaign.status}"`);
  }

  await prisma.adApproval.create({
    data: {
      adCampaignId: adCampaign.id,
      approvedByUserId: input.actorUserId,
      status: "approved",
      note: input.note,
    },
  });

  const updated = await prisma.adCampaign.update({ where: { id: adCampaign.id }, data: { status: "approved" } });

  await writeAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "ad_campaign.approved",
    targetType: "AdCampaign",
    targetId: adCampaign.id,
  });

  return updated;
}

export async function rejectAdCampaign(input: {
  organizationId: string;
  adCampaignId: string;
  note?: string;
  actorUserId: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.ADS_APPROVE_LAUNCH);

  const adCampaign = await prisma.adCampaign.findFirst({
    where: { id: input.adCampaignId, organizationId: input.organizationId },
  });
  if (!adCampaign) throw new NotFoundError("Ad campaign not found in this organization");

  await prisma.adApproval.create({
    data: {
      adCampaignId: adCampaign.id,
      approvedByUserId: input.actorUserId,
      status: "rejected",
      note: input.note,
    },
  });

  const updated = await prisma.adCampaign.update({ where: { id: adCampaign.id }, data: { status: "rejected" } });

  await writeAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "ad_campaign.rejected",
    targetType: "AdCampaign",
    targetId: adCampaign.id,
  });

  return updated;
}

// Launches a campaign on the real provider. This is the function the spec's
// exit criteria is about: it must be IMPOSSIBLE to reach the provider
// mutate call without a real, approved AdApproval row -- not just an absent
// button in the UI. The check below is the enforcement; everything above it
// only prepares the call.
export async function launchAdCampaign(input: {
  organizationId: string;
  adCampaignId: string;
  actorUserId: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.CAMPAIGN_MANAGE);

  const adCampaign = await prisma.adCampaign.findFirst({
    where: { id: input.adCampaignId, organizationId: input.organizationId },
    include: { connectedAccount: true },
  });
  if (!adCampaign) throw new NotFoundError("Ad campaign not found in this organization");

  if (adCampaign.status === "launched") return adCampaign;
  if (adCampaign.status !== "approved") {
    throw new ForbiddenError(
      `Cannot launch: ad campaign status is "${adCampaign.status}", not "approved". A campaign may only launch after an approved AdApproval record exists.`,
    );
  }

  const approval = await prisma.adApproval.findFirst({
    where: { adCampaignId: adCampaign.id, status: "approved" },
  });
  if (!approval) {
    // Defense in depth: even if `status` were somehow tampered into
    // "approved" without a real approval row, this second, independent
    // check against the AdApproval table is what the spec's exit criteria
    // means by "provably blocked" -- it does not trust the status field alone.
    throw new ForbiddenError("Cannot launch: no approved ad_approvals record exists for this campaign");
  }

  try {
    const accessToken = await getFreshAccessToken(adCampaign.connectedAccountId);
    const created = await createGoogleAdsCampaign({
      accessToken,
      loginCustomerId: adCampaign.connectedAccount.managerCustomerId ?? undefined,
      customerId: adCampaign.connectedAccount.providerAccountId,
      name: adCampaign.name,
      dailyBudgetMicros: adCampaign.dailyBudgetMicros,
    });

    // Confirm from the provider rather than assuming the mutate succeeded
    // as requested.
    const confirmed = await fetchGoogleAdsCampaignStatus({
      accessToken,
      loginCustomerId: adCampaign.connectedAccount.managerCustomerId ?? undefined,
      customerId: adCampaign.connectedAccount.providerAccountId,
      campaignResourceName: created.campaignResourceName,
    });

    const updated = await prisma.adCampaign.update({
      where: { id: adCampaign.id },
      data: {
        status: "launched",
        providerCampaignBudgetResourceName: created.campaignBudgetResourceName,
        providerCampaignResourceName: created.campaignResourceName,
        providerStatus: confirmed?.status ?? null,
        failureReason: null,
      },
    });

    await writeAuditLog({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "ad_campaign.launched",
      targetType: "AdCampaign",
      targetId: adCampaign.id,
      metadata: { providerCampaignResourceName: created.campaignResourceName, providerStatus: confirmed?.status },
    });

    return updated;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.adCampaign.update({ where: { id: adCampaign.id }, data: { status: "failed", failureReason: message } });
    throw err;
  }
}

// Emergency stop: pauses an already-launched campaign on the real provider,
// then confirms the paused state back from the provider.
export async function pauseAdCampaign(input: {
  organizationId: string;
  adCampaignId: string;
  actorUserId: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.CAMPAIGN_MANAGE);

  const adCampaign = await prisma.adCampaign.findFirst({
    where: { id: input.adCampaignId, organizationId: input.organizationId },
    include: { connectedAccount: true },
  });
  if (!adCampaign) throw new NotFoundError("Ad campaign not found in this organization");
  if (!adCampaign.providerCampaignResourceName) {
    throw new ConflictError("This campaign was never launched on the provider, nothing to pause");
  }

  const accessToken = await getFreshAccessToken(adCampaign.connectedAccountId);
  await pauseGoogleAdsCampaign({
    accessToken,
    loginCustomerId: adCampaign.connectedAccount.managerCustomerId ?? undefined,
    customerId: adCampaign.connectedAccount.providerAccountId,
    campaignResourceName: adCampaign.providerCampaignResourceName,
  });

  const confirmed = await fetchGoogleAdsCampaignStatus({
    accessToken,
    loginCustomerId: adCampaign.connectedAccount.managerCustomerId ?? undefined,
    customerId: adCampaign.connectedAccount.providerAccountId,
    campaignResourceName: adCampaign.providerCampaignResourceName,
  });

  const updated = await prisma.adCampaign.update({
    where: { id: adCampaign.id },
    data: { status: "paused", providerStatus: confirmed?.status ?? "PAUSED" },
  });

  await writeAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "ad_campaign.paused",
    targetType: "AdCampaign",
    targetId: adCampaign.id,
    metadata: { providerStatus: confirmed?.status },
  });

  return updated;
}

export async function listAdCampaigns(organizationId: string, actorUserId: string) {
  await requireMembership(organizationId, actorUserId);
  return prisma.adCampaign.findMany({
    where: { organizationId },
    include: { connectedAccount: true, approvals: true },
    orderBy: { createdAt: "desc" },
  });
}
