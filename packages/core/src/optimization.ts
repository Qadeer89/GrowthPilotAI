import { prisma, Prisma } from "@growthpilot/db";
import { requireMembership, requirePermission } from "./rbac";
import { PERMISSIONS } from "./permissions";
import { writeAuditLog } from "./audit";
import { NotFoundError, ConflictError } from "./errors";
import { pauseAdCampaign } from "./ads";

const OPEN_STATUSES = ["awaiting_approval", "approved", "executing"];

/**
 * Detect -> Analyze -> Recommend (Phase 8). Deterministic, server-side
 * checks against real campaign state -- the rationale is built from real
 * fields (status, budget, failureReason), never an AI guess, so detection is
 * reproducible and testable without any AI call. Idempotent: skips a
 * campaign that already has an open recommendation.
 */
export async function detectOptimizationOpportunities(input: { organizationId: string; actorUserId: string }) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.ANALYTICS_VIEW);

  const campaigns = await prisma.adCampaign.findMany({
    where: { organizationId: input.organizationId, status: { in: ["launched", "failed"] } },
  });

  const created: Awaited<ReturnType<typeof prisma.optimizationRecommendation.create>>[] = [];

  for (const campaign of campaigns) {
    const existingOpen = await prisma.optimizationRecommendation.findFirst({
      where: { relatedAdCampaignId: campaign.id, status: { in: OPEN_STATUSES } },
    });
    if (existingOpen) continue;

    if (campaign.status === "launched") {
      created.push(
        await prisma.optimizationRecommendation.create({
          data: {
            organizationId: input.organizationId,
            workspaceId: campaign.workspaceId,
            brandId: campaign.brandId,
            relatedAdCampaignId: campaign.id,
            type: "pause_unmonitored_spend",
            rationale: `"${campaign.name}" is launched and can spend up to $${Number(campaign.dailyBudgetMicros) / 1_000_000}/day, but this account has no real spend/performance reporting connected yet, so that spend cannot be verified against results. Recommend pausing until reporting is in place.`,
            dataQuality: "missing",
            proposedChange: { action: "pause", adCampaignId: campaign.id },
            createdByUserId: input.actorUserId,
          },
        }),
      );
    } else {
      created.push(
        await prisma.optimizationRecommendation.create({
          data: {
            organizationId: input.organizationId,
            workspaceId: campaign.workspaceId,
            brandId: campaign.brandId,
            relatedAdCampaignId: campaign.id,
            type: "review_failed_launch",
            rationale: `"${campaign.name}" failed to launch on the provider: ${campaign.failureReason ?? "unknown error"}. There is no automated fix for this -- recommend a manual review of account access/billing before resubmitting.`,
            dataQuality: "provider_reported",
            proposedChange: Prisma.JsonNull,
            createdByUserId: input.actorUserId,
          },
        }),
      );
    }
  }

  return created;
}

export async function listOptimizationRecommendations(organizationId: string, actorUserId: string) {
  await requireMembership(organizationId, actorUserId);
  return prisma.optimizationRecommendation.findMany({
    where: { organizationId },
    include: { relatedAdCampaign: true },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Approve -> Execute -> Validate -> Measure, gated behind one explicit human
 * approval (spec: "no autonomous financial changes" -- nothing reaches
 * "executing" without this call). For an automated type this makes a real
 * provider call through Phase 6's unchanged pauseAdCampaign and only ever
 * reports what the provider actually confirmed; for an informational type
 * there is no automated action, and the measurement says so honestly rather
 * than claiming a fix that didn't happen.
 */
export async function approveOptimizationRecommendation(input: {
  organizationId: string;
  recommendationId: string;
  actorUserId: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.CAMPAIGN_MANAGE);

  const rec = await prisma.optimizationRecommendation.findFirst({
    where: { id: input.recommendationId, organizationId: input.organizationId },
  });
  if (!rec) throw new NotFoundError("Optimization recommendation not found in this organization");
  if (rec.status !== "awaiting_approval") {
    throw new ConflictError(`Recommendation is "${rec.status}", not awaiting approval`);
  }

  await prisma.optimizationRecommendation.update({
    where: { id: rec.id },
    data: { status: "executing", approvedByUserId: input.actorUserId },
  });

  await writeAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "optimization_recommendation.approved",
    targetType: "OptimizationRecommendation",
    targetId: rec.id,
  });

  try {
    let measurement: Record<string, unknown>;

    if (rec.type === "pause_unmonitored_spend" && rec.relatedAdCampaignId) {
      const before = await prisma.adCampaign.findUnique({ where: { id: rec.relatedAdCampaignId } });
      const paused = await pauseAdCampaign({
        organizationId: input.organizationId,
        adCampaignId: rec.relatedAdCampaignId,
        actorUserId: input.actorUserId,
      });
      measurement = {
        action: "pause",
        statusBefore: before?.status,
        statusAfter: paused.status,
        providerStatusAfter: paused.providerStatus,
      };
    } else {
      measurement = { action: "none", note: "Informational recommendation; no automated action exists for this type." };
    }

    const final = await prisma.optimizationRecommendation.update({
      where: { id: rec.id },
      data: { status: "measured", measurement: measurement as Prisma.InputJsonValue },
    });

    await writeAuditLog({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "optimization_recommendation.measured",
      targetType: "OptimizationRecommendation",
      targetId: rec.id,
      metadata: measurement,
    });

    return final;
  } catch (err) {
    const failureReason = err instanceof Error ? err.message : "Unknown error";
    return prisma.optimizationRecommendation.update({
      where: { id: rec.id },
      data: { status: "failed", failureReason },
    });
  }
}

export async function rejectOptimizationRecommendation(input: {
  organizationId: string;
  recommendationId: string;
  actorUserId: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.CAMPAIGN_MANAGE);

  const rec = await prisma.optimizationRecommendation.findFirst({
    where: { id: input.recommendationId, organizationId: input.organizationId },
  });
  if (!rec) throw new NotFoundError("Optimization recommendation not found in this organization");
  if (rec.status !== "awaiting_approval") {
    throw new ConflictError(`Recommendation is "${rec.status}", not awaiting approval`);
  }

  const updated = await prisma.optimizationRecommendation.update({
    where: { id: rec.id },
    data: { status: "rejected", approvedByUserId: input.actorUserId },
  });

  await writeAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "optimization_recommendation.rejected",
    targetType: "OptimizationRecommendation",
    targetId: rec.id,
  });

  return updated;
}
