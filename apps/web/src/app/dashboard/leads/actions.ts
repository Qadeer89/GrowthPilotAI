"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getPrimaryOrganizationForUser, updateLeadStatus } from "@growthpilot/core";

export async function updateLeadStatusAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;
  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return;

  const leadId = String(formData.get("leadId") ?? "");
  const status = String(formData.get("status") ?? "") as
    | "new"
    | "contacted"
    | "qualified"
    | "unqualified"
    | "converted";
  if (!leadId || !status) return;

  await updateLeadStatus({ organizationId: context.organization.id, leadId, status, actorUserId: session.user.id });
  revalidatePath("/dashboard/leads");
}
