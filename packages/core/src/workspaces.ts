import { prisma } from "@growthpilot/db";
import { suggestBrandProfile } from "@growthpilot/ai";
import { requireMembership, requirePermission } from "./rbac";
import { PERMISSIONS } from "./permissions";
import { slugify } from "./slug";
import { writeAuditLog } from "./audit";
import { recordUsage } from "./usage";
import { ConflictError } from "./errors";

export async function createWorkspace(input: {
  organizationId: string;
  actorUserId: string;
  name: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.WORKSPACE_CREATE);

  const slug = slugify(input.name) || "workspace";
  const existing = await prisma.workspace.findUnique({
    where: { organizationId_slug: { organizationId: input.organizationId, slug } },
  });
  if (existing) throw new ConflictError("A workspace with this name already exists");

  const workspace = await prisma.workspace.create({
    data: { organizationId: input.organizationId, name: input.name, slug },
  });

  await writeAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "workspace.created",
    targetType: "Workspace",
    targetId: workspace.id,
  });

  return workspace;
}

/** Scoped by organizationId — never list across tenants. Any member can view. */
export async function listWorkspaces(organizationId: string, actorUserId: string) {
  await requireMembership(organizationId, actorUserId);

  return prisma.workspace.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
  });
}

export async function createBrand(input: {
  organizationId: string;
  workspaceId: string;
  actorUserId: string;
  name: string;
  website?: string;
  industry?: string;
  description?: string;
  valueProposition?: string;
  targetCountries?: string[];
  targetAudience?: string;
  tone?: string;
  brandColors?: string[];
  languages?: string[];
  monthlyBudget?: number;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.BRAND_MANAGE);

  const workspace = await prisma.workspace.findFirst({
    where: { id: input.workspaceId, organizationId: input.organizationId },
  });
  if (!workspace) {
    throw new Error("Workspace not found in this organization");
  }

  const brand = await prisma.brand.create({
    data: {
      organizationId: input.organizationId,
      workspaceId: input.workspaceId,
      name: input.name,
      website: input.website,
      industry: input.industry,
      description: input.description,
      valueProposition: input.valueProposition,
      targetCountries: input.targetCountries ?? [],
      targetAudience: input.targetAudience,
      tone: input.tone,
      brandColors: input.brandColors ?? [],
      languages: input.languages ?? [],
      monthlyBudget: input.monthlyBudget,
    },
  });

  await writeAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "brand.created",
    targetType: "Brand",
    targetId: brand.id,
  });

  return brand;
}

/**
 * Preview-only: does not write a Brand row. The caller shows the suggestion
 * to the user, who reviews and edits it before saving via createBrand.
 */
export async function suggestBrandDetails(input: {
  organizationId: string;
  actorUserId: string;
  name: string;
  website?: string;
  description?: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.BRAND_MANAGE);

  const result = await suggestBrandProfile({
    name: input.name,
    website: input.website,
    description: input.description,
  });

  await recordUsage({
    organizationId: input.organizationId,
    feature: "brand_suggestion",
    provider: "openai",
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    createdByUserId: input.actorUserId,
  });

  return result.data;
}

export async function listBrands(organizationId: string, actorUserId: string) {
  await requireMembership(organizationId, actorUserId);

  return prisma.brand.findMany({
    where: { organizationId },
    include: { workspace: true },
    orderBy: { createdAt: "desc" },
  });
}
