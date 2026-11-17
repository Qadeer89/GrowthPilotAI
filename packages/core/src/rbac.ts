import { prisma } from "@growthpilot/db";
import { ForbiddenError } from "./errors";
import type { PermissionKey } from "./permissions";

/**
 * The single tenant-isolation checkpoint every service function must call
 * before touching organization-scoped data. It is not enough that a Prisma
 * query filters by organizationId — the caller must also be proven to be a
 * member of that exact organization with the required permission, server
 * side, every time. Never trust organizationId from client input alone.
 */
export async function requirePermission(
  organizationId: string,
  actorUserId: string,
  permission: PermissionKey,
): Promise<{ memberId: string; roleId: string }> {
  const membership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId: actorUserId } },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });

  if (!membership) {
    throw new ForbiddenError("User is not a member of this organization");
  }

  const hasPermission = membership.role.permissions.some(
    (rp) => rp.permission.key === permission,
  );

  if (!hasPermission) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }

  return { memberId: membership.id, roleId: membership.roleId };
}

/** Looser check used for read paths that only need org membership, no specific permission. */
export async function requireMembership(
  organizationId: string,
  actorUserId: string,
): Promise<{ memberId: string; roleId: string }> {
  const membership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId: actorUserId } },
  });

  if (!membership) {
    throw new ForbiddenError("User is not a member of this organization");
  }

  return { memberId: membership.id, roleId: membership.roleId };
}
