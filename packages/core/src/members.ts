import { prisma } from "@growthpilot/db";
import { requireMembership } from "./rbac";

export async function listMembers(organizationId: string, actorUserId: string) {
  await requireMembership(organizationId, actorUserId);

  return prisma.organizationMember.findMany({
    where: { organizationId },
    include: { user: true, role: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function listRoles(organizationId: string, actorUserId: string) {
  await requireMembership(organizationId, actorUserId);

  return prisma.role.findMany({ where: { organizationId }, orderBy: { name: "asc" } });
}

export async function listPendingInvitations(organizationId: string, actorUserId: string) {
  await requireMembership(organizationId, actorUserId);

  return prisma.invitation.findMany({
    where: { organizationId, status: "pending" },
    include: { role: true },
    orderBy: { createdAt: "desc" },
  });
}
