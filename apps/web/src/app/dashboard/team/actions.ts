"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getPrimaryOrganizationForUser, inviteMember } from "@growthpilot/core";

export type InviteResult = { error: string } | { success: true } | undefined;

export async function inviteMemberAction(
  _prev: InviteResult,
  formData: FormData,
): Promise<InviteResult> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };

  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return { error: "No organization found." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleId = String(formData.get("roleId") ?? "");

  if (!email || !roleId) {
    return { error: "Email and role are required." };
  }

  try {
    await inviteMember({
      organizationId: context.organization.id,
      actorUserId: session.user.id,
      email,
      roleId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not send invitation.";
    return { error: message };
  }

  revalidatePath("/dashboard/team");
  return { success: true };
}
