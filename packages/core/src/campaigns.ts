import { prisma } from "@growthpilot/db";
import { requireMembership, requirePermission } from "./rbac";
import { PERMISSIONS } from "./permissions";
import { writeAuditLog } from "./audit";
import { NotFoundError } from "./errors";

export async function createCampaign(input: {
  organizationId: string;
  brandId: string;
  actorUserId: string;
  name: string;
  objective?: string;
  keyMessage?: string;
  cta?: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.CAMPAIGN_CREATE);

  const brand = await prisma.brand.findFirst({ where: { id: input.brandId, organizationId: input.organizationId } });
  if (!brand) throw new NotFoundError("Brand not found in this organization");

  const campaign = await prisma.campaign.create({
    data: {
      organizationId: input.organizationId,
      workspaceId: brand.workspaceId,
      brandId: input.brandId,
      name: input.name,
      objective: input.objective,
      keyMessage: input.keyMessage,
      cta: input.cta,
      createdByUserId: input.actorUserId,
    },
  });

  await writeAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "campaign.created",
    targetType: "Campaign",
    targetId: campaign.id,
  });

  return campaign;
}

export async function listCampaigns(organizationId: string, actorUserId: string) {
  await requireMembership(organizationId, actorUserId);
  return prisma.campaign.findMany({
    where: { organizationId },
    include: { brand: true },
    orderBy: { createdAt: "desc" },
  });
}
