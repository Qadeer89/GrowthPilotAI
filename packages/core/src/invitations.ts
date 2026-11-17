import { prisma } from "@growthpilot/db";
import { requirePermission } from "./rbac";
import { PERMISSIONS } from "./permissions";
import { writeAuditLog } from "./audit";
import { ConflictError, NotFoundError } from "./errors";

const INVITATION_TTL_DAYS = 7;

export async function inviteMember(input: {
  organizationId: string;
  actorUserId: string;
  email: string;
  roleId: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.ORG_MANAGE_USERS);

  const role = await prisma.role.findFirst({
    where: { id: input.roleId, organizationId: input.organizationId },
  });
  if (!role) throw new NotFoundError("Role not found in this organization");

  const existingMember = await prisma.organizationMember.findFirst({
    where: { organizationId: input.organizationId, user: { email: input.email } },
  });
  if (existingMember) throw new ConflictError("User is already a member of this organization");

  // Web Crypto, not node:crypto — this module is reachable from Edge
  // middleware via the @growthpilot/core barrel export, and node:crypto is
  // not available there.
  const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const invitation = await prisma.invitation.create({
    data: {
      organizationId: input.organizationId,
      email: input.email,
      roleId: input.roleId,
      token,
      invitedByUserId: input.actorUserId,
      expiresAt,
    },
  });

  await writeAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "invitation.created",
    targetType: "Invitation",
    targetId: invitation.id,
    metadata: { email: input.email, roleId: input.roleId },
  });

  return invitation;
}

export async function acceptInvitation(input: { token: string; acceptingUserId: string }) {
  const invitation = await prisma.invitation.findUnique({ where: { token: input.token } });
  if (!invitation) throw new NotFoundError("Invitation not found");
  if (invitation.status !== "pending") throw new ConflictError("Invitation is no longer pending");
  if (invitation.expiresAt < new Date()) {
    await prisma.invitation.update({ where: { id: invitation.id }, data: { status: "expired" } });
    throw new ConflictError("Invitation has expired");
  }

  const member = await prisma.organizationMember.create({
    data: {
      organizationId: invitation.organizationId,
      userId: input.acceptingUserId,
      roleId: invitation.roleId,
    },
  });

  await prisma.invitation.update({ where: { id: invitation.id }, data: { status: "accepted" } });

  await writeAuditLog({
    organizationId: invitation.organizationId,
    actorUserId: input.acceptingUserId,
    action: "invitation.accepted",
    targetType: "Invitation",
    targetId: invitation.id,
  });

  return member;
}
