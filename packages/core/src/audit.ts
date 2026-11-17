import { prisma } from "@growthpilot/db";

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
