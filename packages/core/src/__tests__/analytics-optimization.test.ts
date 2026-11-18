import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@growthpilot/db";
import { createUser } from "../users";
import { createOrganizationWithOwner } from "../organizations";
import { createWorkspace } from "../workspaces";
import { getAnalyticsSummary, askAnalyst } from "../analytics";
import {
  detectOptimizationOpportunities,
  approveOptimizationRecommendation,
  rejectOptimizationRecommendation,
} from "../optimization";

// Phase 8 exit criteria (spec Section 10 + implementation plan): analytics
// never reports a fabricated number -- every metric carries a real
// data_quality label, and a channel with no real data yet is "missing" with
// a reason, not a guess. The optimization engine's Detect/Recommend steps are
// deterministic server-side checks (no AI call, fully reproducible); Approve
// is the single gate before anything executes, matching the "no autonomous
// financial changes" rule.

const suffix = Date.now().toString(36);

describe("analytics & optimization", () => {
  let owner: { id: string };
  let org: { id: string };
  let brandId: string;
  let workspaceId: string;
  let accountId: string;

  beforeAll(async () => {
    owner = await createUser({
      email: `analytics-${suffix}@test.growthpilot.local`,
      password: "password123",
      name: "Analytics Test Owner",
    });
    org = await createOrganizationWithOwner({ name: `Analytics Org ${suffix}`, ownerUserId: owner.id });

    const workspace = await createWorkspace({ organizationId: org.id, actorUserId: owner.id, name: "Launch" });
    workspaceId = workspace.id;

    const brand = await prisma.brand.create({
      data: { organizationId: org.id, workspaceId, name: `Analytics Test Brand ${suffix}` },
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
    accountId = account.id;
  });

  afterAll(async () => {
    if (org?.id) await prisma.organization.delete({ where: { id: org.id } }).catch(() => undefined);
    if (owner?.id) await prisma.user.delete({ where: { id: owner.id } }).catch(() => undefined);
  });

  it("reports ad spend as 'missing' with a real reason when no campaign has launched", async () => {
    const metrics = await getAnalyticsSummary(org.id, owner.id);
    const adSpend = metrics.find((m) => m.metricKey === "ad_spend");
    expect(adSpend).toBeDefined();
    expect(adSpend?.dataQuality).toBe("missing");
    expect(adSpend?.value).toBeNull();
    expect(adSpend?.note).toMatch(/no ad campaigns/i);

    const leadMetric = metrics.find((m) => m.metricKey === "leads_captured");
    expect(leadMetric?.dataQuality).toBe("provider_reported");
    expect(leadMetric?.value).toBe(0);
  }, 20000);

  it("the AI Marketing Analyst only cites real metrics and flags missing data as a gap, not a guess", async () => {
    const saved = await askAnalyst({
      organizationId: org.id,
      brandId,
      question: "What is our return on ad spend so far?",
      actorUserId: owner.id,
    });

    const answer = saved.answer as { summary: string; answer: string; dataGaps: string[]; recommendations: string[] };
    expect(typeof answer.answer).toBe("string");
    expect(Array.isArray(answer.dataGaps)).toBe(true);
    // No ad spend data exists at all in this org -- the model must surface
    // that as a gap rather than inventing an ROAS number.
    expect(answer.dataGaps.length).toBeGreaterThan(0);
  }, 30000);

  it("detects a review recommendation for a failed campaign and is idempotent", async () => {
    const campaign = await prisma.adCampaign.create({
      data: {
        organizationId: org.id,
        workspaceId,
        brandId,
        connectedAccountId: accountId,
        provider: "google_ads",
        name: "Failed Launch Campaign",
        dailyBudgetMicros: 5_000_000n,
        status: "failed",
        failureReason: "CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION",
        createdByUserId: owner.id,
      },
    });

    const firstRun = await detectOptimizationOpportunities({ organizationId: org.id, actorUserId: owner.id });
    expect(firstRun).toHaveLength(1);
    expect(firstRun[0].type).toBe("review_failed_launch");
    expect(firstRun[0].status).toBe("awaiting_approval");
    expect(firstRun[0].rationale).toMatch(/CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION/);

    // Re-running detection must not create a duplicate for the same campaign.
    const secondRun = await detectOptimizationOpportunities({ organizationId: org.id, actorUserId: owner.id });
    expect(secondRun).toHaveLength(0);

    const all = await listRecsFor(campaign.id);
    expect(all).toHaveLength(1);
  }, 20000);

  it("an informational recommendation measures honestly with no automated action, and cannot be approved twice", async () => {
    const recs = await prisma.optimizationRecommendation.findMany({
      where: { organizationId: org.id, type: "review_failed_launch" },
    });
    const rec = recs[0];

    const measured = await approveOptimizationRecommendation({
      organizationId: org.id,
      recommendationId: rec.id,
      actorUserId: owner.id,
    });
    expect(measured.status).toBe("measured");
    expect((measured.measurement as { action?: string })?.action).toBe("none");

    await expect(
      approveOptimizationRecommendation({ organizationId: org.id, recommendationId: rec.id, actorUserId: owner.id }),
    ).rejects.toThrow(/not awaiting approval/i);
  }, 20000);

  it("a pause recommendation attempts the real provider pause and fails honestly when the campaign was never actually launched on the provider", async () => {
    const campaign = await prisma.adCampaign.create({
      data: {
        organizationId: org.id,
        workspaceId,
        brandId,
        connectedAccountId: accountId,
        provider: "google_ads",
        name: "Unmonitored Spend Campaign",
        dailyBudgetMicros: 10_000_000n,
        status: "launched",
        createdByUserId: owner.id,
      },
    });

    const detected = await detectOptimizationOpportunities({ organizationId: org.id, actorUserId: owner.id });
    const rec = detected.find((r) => r.relatedAdCampaignId === campaign.id)!;
    expect(rec.type).toBe("pause_unmonitored_spend");
    expect(rec.dataQuality).toBe("missing");

    // This test campaign has no providerCampaignResourceName (it was marked
    // "launched" directly in the DB for this test, never really launched) --
    // approving must attempt the real pauseAdCampaign call and record the
    // real honest failure, never a fabricated success.
    const result = await approveOptimizationRecommendation({
      organizationId: org.id,
      recommendationId: rec.id,
      actorUserId: owner.id,
    });
    expect(result.status).toBe("failed");
    expect(result.failureReason).toMatch(/never launched on the provider/i);
  }, 20000);

  it("rejecting a recommendation stops it before any execution", async () => {
    const campaign = await prisma.adCampaign.create({
      data: {
        organizationId: org.id,
        workspaceId,
        brandId,
        connectedAccountId: accountId,
        provider: "google_ads",
        name: "Reject Me Campaign",
        dailyBudgetMicros: 5_000_000n,
        status: "launched",
        createdByUserId: owner.id,
      },
    });

    const detected = await detectOptimizationOpportunities({ organizationId: org.id, actorUserId: owner.id });
    const rec = detected.find((r) => r.relatedAdCampaignId === campaign.id)!;

    const rejected = await rejectOptimizationRecommendation({
      organizationId: org.id,
      recommendationId: rec.id,
      actorUserId: owner.id,
    });
    expect(rejected.status).toBe("rejected");

    const campaignAfter = await prisma.adCampaign.findUnique({ where: { id: campaign.id } });
    expect(campaignAfter?.status).toBe("launched"); // unchanged -- rejection never touches the provider
  }, 20000);

  async function listRecsFor(adCampaignId: string) {
    return prisma.optimizationRecommendation.findMany({ where: { relatedAdCampaignId: adCampaignId } });
  }
});
