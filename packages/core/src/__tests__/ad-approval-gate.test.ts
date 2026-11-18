import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@growthpilot/db";
import { createUser } from "../users";
import { createOrganizationWithOwner } from "../organizations";
import { createWorkspace } from "../workspaces";
import { launchAdCampaign, approveAdCampaign } from "../ads";
import { ForbiddenError } from "../errors";

// Phase 6 exit criteria (spec Section 21): "a draft campaign ... is provably
// blocked from launching without an ad_approvals record" -- enforced in
// packages/core, not just the UI. This runs against the real dev database,
// not a mock, so a regression in the gate itself is actually caught.

const suffix = Date.now().toString(36);

describe("ad campaign launch approval gate", () => {
  let owner: { id: string };
  let org: { id: string };
  let brandId: string;
  let workspaceId: string;
  let connectedAccountId: string;

  beforeAll(async () => {
    owner = await createUser({
      email: `ad-gate-${suffix}@test.growthpilot.local`,
      password: "password123",
      name: "Ad Gate Owner",
    });
    org = await createOrganizationWithOwner({ name: `Ad Gate Org ${suffix}`, ownerUserId: owner.id });

    const workspace = await createWorkspace({ organizationId: org.id, actorUserId: owner.id, name: "Launch" });
    workspaceId = workspace.id;

    const brand = await prisma.brand.create({
      data: { organizationId: org.id, workspaceId, name: `Test Brand ${suffix}` },
    });
    brandId = brand.id;

    const account = await prisma.connectedAccount.create({
      data: {
        organizationId: org.id,
        provider: "google_ads",
        providerAccountId: `test-customer-${suffix}`,
        status: "connected",
        connectedByUserId: owner.id,
      },
    });
    connectedAccountId = account.id;
  });

  afterAll(async () => {
    if (org?.id) await prisma.organization.delete({ where: { id: org.id } }).catch(() => undefined);
    if (owner?.id) await prisma.user.delete({ where: { id: owner.id } }).catch(() => undefined);
  });

  async function createDraftCampaign() {
    return prisma.adCampaign.create({
      data: {
        organizationId: org.id,
        workspaceId,
        brandId,
        connectedAccountId,
        provider: "google_ads",
        name: `Gate Test Campaign ${Date.now()}`,
        dailyBudgetMicros: BigInt(1_000_000),
        status: "draft",
        createdByUserId: owner.id,
      },
    });
  }

  it("rejects launching a draft campaign with no approval record", async () => {
    const campaign = await createDraftCampaign();
    await expect(
      launchAdCampaign({ organizationId: org.id, adCampaignId: campaign.id, actorUserId: owner.id }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("rejects launching a pending_approval campaign with no approval record", async () => {
    const campaign = await createDraftCampaign();
    await prisma.adCampaign.update({ where: { id: campaign.id }, data: { status: "pending_approval" } });
    await expect(
      launchAdCampaign({ organizationId: org.id, adCampaignId: campaign.id, actorUserId: owner.id }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("creates a real ad_approvals record when approved, and flips status to approved", async () => {
    const campaign = await createDraftCampaign();
    await approveAdCampaign({ organizationId: org.id, adCampaignId: campaign.id, actorUserId: owner.id });

    const approval = await prisma.adApproval.findFirst({ where: { adCampaignId: campaign.id, status: "approved" } });
    expect(approval).not.toBeNull();

    const updated = await prisma.adCampaign.findUnique({ where: { id: campaign.id } });
    expect(updated?.status).toBe("approved");
  });

  it("still blocks launch if status is tampered to 'approved' without a real ad_approvals row (defense in depth)", async () => {
    const campaign = await createDraftCampaign();
    // Simulate tampering: flip status directly, bypassing approveAdCampaign,
    // so no AdApproval row exists.
    await prisma.adCampaign.update({ where: { id: campaign.id }, data: { status: "approved" } });

    await expect(
      launchAdCampaign({ organizationId: org.id, adCampaignId: campaign.id, actorUserId: owner.id }),
    ).rejects.toThrow(/ad_approvals/);
  });
});
