"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getPrimaryOrganizationForUser, planAgentTask, executeAgentTask, approveAgentStep } from "@growthpilot/core";

export type ActionResult = { error: string } | undefined;

export async function planAgentTaskAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };
  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return { error: "No organization found." };

  const brandId = String(formData.get("brandId") ?? "");
  const requestText = String(formData.get("requestText") ?? "").trim();
  if (!brandId || !requestText) return { error: "Brand and a request are required." };

  try {
    const task = await planAgentTask({
      organizationId: context.organization.id,
      brandId,
      requestText,
      actorUserId: session.user.id,
    });
    // Auto-run everything up to the first step that needs approval.
    await executeAgentTask({ organizationId: context.organization.id, agentTaskId: task.id, actorUserId: session.user.id });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not plan the task." };
  }

  revalidatePath("/dashboard/ai-agent");
  return undefined;
}

export async function approveAgentStepAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;
  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return;

  const agentStepId = String(formData.get("agentStepId") ?? "");
  if (!agentStepId) return;

  await approveAgentStep({ organizationId: context.organization.id, agentStepId, actorUserId: session.user.id });
  revalidatePath("/dashboard/ai-agent");
}
