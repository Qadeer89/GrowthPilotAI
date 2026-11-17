import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@growthpilot/db";
import { createUser } from "../users";
import { createOrganizationWithOwner } from "../organizations";
import { createWorkspace, listWorkspaces } from "../workspaces";
import { requirePermission } from "../rbac";
import { PERMISSIONS } from "../permissions";
import { ForbiddenError } from "../errors";

// Acceptance test required by spec Section 21: "Users cannot access another
// organization's data" and "unauthorized API requests are rejected." This
// runs against the real dev database (no shared schema with other projects)
// rather than a mock, so a regression in requirePermission/requireMembership
// is actually caught.

const suffix = Date.now().toString(36);

describe("tenant isolation", () => {
  let userA: { id: string };
  let userB: { id: string };
  let orgA: { id: string };
  let orgB: { id: string };

  beforeAll(async () => {
    userA = await createUser({
      email: `tenant-a-${suffix}@test.growthpilot.local`,
      password: "password123",
      name: "Tenant A Owner",
    });
    userB = await createUser({
      email: `tenant-b-${suffix}@test.growthpilot.local`,
      password: "password123",
      name: "Tenant B Owner",
    });

    orgA = await createOrganizationWithOwner({ name: `Org A ${suffix}`, ownerUserId: userA.id });
    orgB = await createOrganizationWithOwner({ name: `Org B ${suffix}`, ownerUserId: userB.id });
  });

  afterAll(async () => {
    // Defensive: if beforeAll partially failed (e.g. a slow Neon cold start
    // blowing the hook timeout), some of these may be unset — never let a
    // missing one skip cleanup of the ones that did get created.
    if (orgA?.id) await prisma.organization.delete({ where: { id: orgA.id } }).catch(() => undefined);
    if (orgB?.id) await prisma.organization.delete({ where: { id: orgB.id } }).catch(() => undefined);
    if (userA?.id) await prisma.user.delete({ where: { id: userA.id } }).catch(() => undefined);
    if (userB?.id) await prisma.user.delete({ where: { id: userB.id } }).catch(() => undefined);
  });

  it("rejects a permission check for a user who is not a member of the target org", async () => {
    await expect(
      requirePermission(orgB.id, userA.id, PERMISSIONS.WORKSPACE_CREATE),
    ).rejects.toThrow(ForbiddenError);
  });

  it("rejects creating a workspace in another organization", async () => {
    await expect(
      createWorkspace({ organizationId: orgB.id, actorUserId: userA.id, name: "Cross-tenant" }),
    ).rejects.toThrow(ForbiddenError);

    const leaked = await prisma.workspace.findFirst({
      where: { organizationId: orgB.id, name: "Cross-tenant" },
    });
    expect(leaked).toBeNull();
  });

  it("allows the owner to create and list workspaces within their own org only", async () => {
    const workspace = await createWorkspace({
      organizationId: orgA.id,
      actorUserId: userA.id,
      name: "Launch",
    });
    expect(workspace.organizationId).toBe(orgA.id);

    const workspacesForA = await listWorkspaces(orgA.id, userA.id);
    expect(workspacesForA.map((w) => w.id)).toContain(workspace.id);

    await expect(listWorkspaces(orgB.id, userA.id)).rejects.toThrow(ForbiddenError);
  });
});
