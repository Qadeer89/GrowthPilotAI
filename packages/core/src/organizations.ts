import { prisma } from "@growthpilot/db";
import { ConflictError } from "./errors";
import { DEFAULT_ROLE_PERMISSIONS, PERMISSION_CATALOG, SYSTEM_ROLES } from "./permissions";
import { slugify } from "./slug";
import { writeAuditLog } from "./audit";

/** Ensures the global permission catalog rows exist. Idempotent. */
async function ensurePermissionCatalog() {
  await Promise.all(
    PERMISSION_CATALOG.map((p) =>
      prisma.permission.upsert({
        where: { key: p.key },
        update: { description: p.description },
        create: { key: p.key, description: p.description },
      }),
    ),
  );
}

/** Seeds the six system roles (spec Section 3) for a newly created organization. */
async function seedSystemRoles(organizationId: string) {
  await ensurePermissionCatalog();
  const permissions = await prisma.permission.findMany();
  const permissionByKey = new Map(permissions.map((p) => [p.key, p]));

  const roles: Record<string, { id: string }> = {};

  for (const roleName of Object.values(SYSTEM_ROLES)) {
    const role = await prisma.role.create({
      data: { organizationId, name: roleName, isSystem: true },
    });
    roles[roleName] = role;

    const keysForRole = DEFAULT_ROLE_PERMISSIONS[roleName];
    const permissionIds = keysForRole
      .map((key) => permissionByKey.get(key)?.id)
      .filter((id): id is string => Boolean(id));

    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
    });
  }

  return roles;
}

export async function createOrganizationWithOwner(input: {
  name: string;
  ownerUserId: string;
}) {
  const baseSlug = slugify(input.name) || "organization";
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const organization = await prisma.organization.create({
    data: { name: input.name, slug },
  });

  const roles = await seedSystemRoles(organization.id);

  await prisma.organizationMember.create({
    data: {
      organizationId: organization.id,
      userId: input.ownerUserId,
      roleId: roles[SYSTEM_ROLES.OWNER].id,
    },
  });

  await writeAuditLog({
    organizationId: organization.id,
    actorUserId: input.ownerUserId,
    action: "organization.created",
    targetType: "Organization",
    targetId: organization.id,
  });

  return organization;
}

export async function listOrganizationsForUser(userId: string) {
  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    include: { organization: true, role: true },
  });
  return memberships.map((m) => ({ organization: m.organization, role: m.role }));
}

/**
 * Phase 1 has no org switcher UI yet, so callers default to the user's
 * earliest-joined organization. Replace with an explicit selection once
 * multi-org switching ships.
 */
export async function getPrimaryOrganizationForUser(userId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    include: {
      organization: true,
      role: { include: { permissions: { include: { permission: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) return null;

  return {
    organization: membership.organization,
    role: membership.role,
    permissionKeys: membership.role.permissions.map((rp) => rp.permission.key),
  };
}

export async function assertSlugAvailable(slug: string) {
  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) throw new ConflictError("Slug already in use");
}

// Public: used by the public-facing landing page route, which has no logged-in
// user to resolve an org from. No permission check -- the slug is the URL.
export async function findOrganizationBySlug(slug: string) {
  return prisma.organization.findUnique({ where: { slug } });
}
