"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { disconnectConnectedAccount, getPrimaryOrganizationForUser } from "@growthpilot/core";

export async function disconnectAccountAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;
  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return;

  const connectedAccountId = String(formData.get("connectedAccountId") ?? "");
  if (!connectedAccountId) return;

  await disconnectConnectedAccount({
    organizationId: context.organization.id,
    connectedAccountId,
    actorUserId: session.user.id,
  });

  revalidatePath("/dashboard/social-accounts");
}
