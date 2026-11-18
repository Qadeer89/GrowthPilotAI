import { prisma } from "@growthpilot/db";
import { requireMembership } from "./rbac";

export async function listRecentAuditLogs(organizationId: string, actorUserId: string, limit = 8) {
  await requireMembership(organizationId, actorUserId);
  return prisma.auditLog.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function writeAuditLog(entry: {
  organizationId?: string;
  actorUserId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      organizationId: entry.organizationId,
      actorUserId: entry.actorUserId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      metadata: entry.metadata as import("@prisma/client").Prisma.InputJsonValue | undefined,
    },
  });
}
