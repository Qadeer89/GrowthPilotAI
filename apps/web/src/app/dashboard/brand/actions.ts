"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { createBrand, getPrimaryOrganizationForUser, suggestBrandDetails } from "@growthpilot/core";

export type CreateBrandResult = { error: string } | undefined;

export type SuggestBrandResult =
  | {
      error: string;
    }
  | {
      industry: string;
      targetAudience: string;
      tone: string;
      targetCountries: string[];
      languages: string[];
      valueProposition: string;
      description: string;
    }
  | undefined;

export async function suggestBrandAction(
  _prev: SuggestBrandResult,
  formData: FormData,
): Promise<SuggestBrandResult> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };

  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return { error: "No organization found." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter a brand name first." };

  try {
    const suggestion = await suggestBrandDetails({
      organizationId: context.organization.id,
      actorUserId: session.user.id,
      name,
      website: String(formData.get("website") ?? "") || undefined,
      description: String(formData.get("description") ?? "") || undefined,
    });
    return suggestion;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not generate suggestions.";
    return { error: message };
  }
}

export async function createBrandAction(
  _prev: CreateBrandResult,
  formData: FormData,
): Promise<CreateBrandResult> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };

  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return { error: "No organization found." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!workspaceId || !name) return { error: "Workspace and brand name are required." };

  const toList = (value: FormDataEntryValue | null) =>
    String(value ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  try {
    await createBrand({
      organizationId: context.organization.id,
      workspaceId,
      actorUserId: session.user.id,
      name,
      website: String(formData.get("website") ?? "") || undefined,
      industry: String(formData.get("industry") ?? "") || undefined,
      description: String(formData.get("description") ?? "") || undefined,
      valueProposition: String(formData.get("valueProposition") ?? "") || undefined,
      targetAudience: String(formData.get("targetAudience") ?? "") || undefined,
      tone: String(formData.get("tone") ?? "") || undefined,
      targetCountries: toList(formData.get("targetCountries")),
      brandColors: toList(formData.get("brandColors")),
      languages: toList(formData.get("languages")),
      monthlyBudget: formData.get("monthlyBudget")
        ? Number(formData.get("monthlyBudget"))
        : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save brand.";
    return { error: message };
  }

  revalidatePath("/dashboard/brand");
  return undefined;
}
