import { auth } from "@/lib/auth";
import {
  getPrimaryOrganizationForUser,
  listMembers,
  listPendingInvitations,
  listRoles,
} from "@growthpilot/core";
import { InviteForm } from "./InviteForm";

export default async function TeamPage() {
  const session = await auth();
  const context = await getPrimaryOrganizationForUser(session!.user.id);
  const organizationId = context!.organization.id;

  const [members, roles, invitations] = await Promise.all([
    listMembers(organizationId, session!.user.id),
    listRoles(organizationId, session!.user.id),
    listPendingInvitations(organizationId, session!.user.id),
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-[var(--color-text)]">Team & Permissions</h1>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Invite a teammate</h2>
        <div className="mt-2">
          <InviteForm roles={roles.map((r) => ({ id: r.id, name: r.name }))} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Members</h2>
        <ul className="mt-2 divide-y divide-[var(--color-border)] gp-card">
          {members.map((m) => (
            <li key={m.id} className="flex justify-between px-4 py-3 text-sm">
              <span className="text-[var(--color-text)]">{m.user.name ?? m.user.email}</span>
              <span className="text-[var(--color-text-muted)]">{m.role.name}</span>
            </li>
          ))}
        </ul>
      </section>

      {invitations.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Pending invitations</h2>
          <ul className="mt-2 divide-y divide-[var(--color-border)] gp-card">
            {invitations.map((inv) => (
              <li key={inv.id} className="flex justify-between px-4 py-3 text-sm">
                <span className="text-[var(--color-text)]">{inv.email}</span>
                <span className="text-[var(--color-text-muted)]">{inv.role.name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
