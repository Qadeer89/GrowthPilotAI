import { prisma } from "@growthpilot/db";
import { askMarketingAnalyst, type AnalyticsMetricInput, type BrandBrief } from "@growthpilot/ai";
import { requireMembership, requirePermission } from "./rbac";
import { PERMISSIONS } from "./permissions";
import { recordUsage } from "./usage";
import { writeAuditLog } from "./audit";
import { NotFoundError, ValidationError } from "./errors";

async function loadBrand(organizationId: string, brandId: string) {
  const brand = await prisma.brand.findFirst({ where: { id: brandId, organizationId } });
  if (!brand) throw new NotFoundError("Brand not found in this organization");
  return brand;
}

function toBrandBrief(brand: Awaited<ReturnType<typeof loadBrand>>): BrandBrief {
  return {
    name: brand.name,
    website: brand.website,
    industry: brand.industry,
    description: brand.description,
    valueProposition: brand.valueProposition,
    targetAudience: brand.targetAudience,
    targetCountries: brand.targetCountries,
    tone: brand.tone,
    languages: brand.languages,
    monthlyBudget: brand.monthlyBudget,
  };
}

/**
 * Unified, real-data analytics (spec Section 10): every metric is labeled
 * with a data_quality flag. Nothing here is fabricated -- a channel with no
 * real data yet (e.g. ad spend, since no campaign in this environment has
 * reached a provider-confirmed "launched" status) is reported as "missing"
 * with a reason, never estimated or guessed.
 */
export async function getAnalyticsSummary(
  organizationId: string,
  actorUserId: string,
): Promise<AnalyticsMetricInput[]> {
  await requireMembership(organizationId, actorUserId);

  const metrics: AnalyticsMetricInput[] = [];

  const emailSends = await prisma.emailSend.findMany({ where: { organizationId }, select: { status: true } });
  metrics.push({
    channel: "email",
    metricKey: "emails_sent_total",
    value: emailSends.length,
    dataQuality: "provider_reported",
  });
  for (const status of ["sent", "bounced", "complained", "failed"]) {
    metrics.push({
      channel: "email",
      metricKey: `emails_${status}`,
      value: emailSends.filter((e) => e.status === status).length,
      dataQuality: "provider_reported",
    });
  }

  const leadCount = await prisma.lead.count({ where: { organizationId } });
  metrics.push({ channel: "leads", metricKey: "leads_captured", value: leadCount, dataQuality: "provider_reported" });

  const publishedLandingPages = await prisma.landingPage.count({ where: { organizationId, published: true } });
  metrics.push({
    channel: "leads",
    metricKey: "published_landing_pages",
    value: publishedLandingPages,
    dataQuality: "provider_reported",
  });

  const adCampaigns = await prisma.adCampaign.findMany({ where: { organizationId } });
  const launched = adCampaigns.filter((c) => c.status === "launched");
  if (launched.length === 0) {
    metrics.push({
      channel: "ads",
      metricKey: "ad_spend",
      value: null,
      dataQuality: "missing",
      note:
        adCampaigns.length === 0
          ? "No ad campaigns created yet."
          : "No ad campaign has reached a provider-confirmed 'launched' status yet, so there is no real spend or performance data to report.",
    });
  } else {
    for (const campaign of launched) {
      metrics.push({
        channel: "ads",
        metricKey: `ad_daily_budget:${campaign.name}`,
        value: Number(campaign.dailyBudgetMicros) / 1_000_000,
        dataQuality: "provider_reported",
        note: "Daily budget as configured and confirmed launched on the provider. Spend/performance reporting is not pulled yet.",
      });
    }
  }

  return metrics;
}

export async function askAnalyst(input: {
  organizationId: string;
  brandId: string;
  question: string;
  actorUserId: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.ANALYTICS_VIEW);
  if (!input.question.trim()) throw new ValidationError("A question is required");

  const brand = await loadBrand(input.organizationId, input.brandId);
  const metrics = await getAnalyticsSummary(input.organizationId, input.actorUserId);

  const result = await askMarketingAnalyst({
    brand: toBrandBrief(brand),
    question: input.question,
    metrics,
  });

  const saved = await prisma.analystQuery.create({
    data: {
      organizationId: input.organizationId,
      workspaceId: brand.workspaceId,
      brandId: input.brandId,
      question: input.question,
      answer: result.data,
      createdByUserId: input.actorUserId,
    },
  });

  await recordUsage({
    organizationId: input.organizationId,
    workspaceId: brand.workspaceId,
    feature: "analyst_query",
    provider: "openai",
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    createdByUserId: input.actorUserId,
  });

  await writeAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "analyst_query.asked",
    targetType: "AnalystQuery",
    targetId: saved.id,
  });

  return saved;
}

export async function listAnalystQueries(organizationId: string, brandId: string, actorUserId: string) {
  await requireMembership(organizationId, actorUserId);
  return prisma.analystQuery.findMany({
    where: { organizationId, brandId },
    orderBy: { createdAt: "desc" },
  });
}
