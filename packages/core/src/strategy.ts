import { prisma } from "@growthpilot/db";
import { generateMarketingStrategy, type BrandBrief } from "@growthpilot/ai";
import { requireMembership, requirePermission } from "./rbac";
import { PERMISSIONS } from "./permissions";
import { recordUsage } from "./usage";
import { writeAuditLog } from "./audit";
import { NotFoundError } from "./errors";

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

export async function generateAndSaveStrategy(input: {
  organizationId: string;
  brandId: string;
  actorUserId: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.STRATEGY_MANAGE);

  const brand = await loadBrand(input.organizationId, input.brandId);
  const result = await generateMarketingStrategy(toBrandBrief(brand));

  const strategy = await prisma.marketingStrategy.create({
    data: {
      organizationId: input.organizationId,
      workspaceId: brand.workspaceId,
      brandId: input.brandId,
      positioning: result.data.positioning,
      plan30: result.data.plan30,
      plan60: result.data.plan60,
      plan90: result.data.plan90,
      createdByUserId: input.actorUserId,
      personas: {
        create: result.data.personas.map((p) => ({
          name: p.name,
          description: p.description,
          painPoints: p.painPoints,
          goals: p.goals,
        })),
      },
      messagingPillars: {
        create: result.data.messagingPillars,
      },
      recommendations: {
        create: result.data.recommendations,
      },
    },
    include: { personas: true, messagingPillars: true, recommendations: true },
  });

  await recordUsage({
    organizationId: input.organizationId,
    workspaceId: brand.workspaceId,
    feature: "strategy_generation",
    provider: "openai",
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    createdByUserId: input.actorUserId,
  });

  await writeAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "strategy.generated",
    targetType: "MarketingStrategy",
    targetId: strategy.id,
  });

  return strategy;
}

export async function listStrategiesForBrand(
  organizationId: string,
  brandId: string,
  actorUserId: string,
) {
  await requireMembership(organizationId, actorUserId);

  return prisma.marketingStrategy.findMany({
    where: { organizationId, brandId },
    include: { personas: true, messagingPillars: true, recommendations: true },
    orderBy: { createdAt: "desc" },
  });
}
