"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { generateAndSaveStrategy, getPrimaryOrganizationForUser } from "@growthpilot/core";

export type GenerateStrategyResult = { error: string } | undefined;

export async function generateStrategyAction(
  _prev: GenerateStrategyResult,
  formData: FormData,
): Promise<GenerateStrategyResult> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };

  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return { error: "No organization found." };

  const brandId = String(formData.get("brandId") ?? "");
  if (!brandId) return { error: "Missing brand." };

  try {
    await generateAndSaveStrategy({
      organizationId: context.organization.id,
      brandId,
      actorUserId: session.user.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not generate strategy.";
    return { error: message };
  }

  revalidatePath("/dashboard/strategy");
  return undefined;
}
