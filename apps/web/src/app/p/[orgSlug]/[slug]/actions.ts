"use server";

import { findOrganizationBySlug, submitLeadForm } from "@growthpilot/core";

export type LeadFormResult = { error: string } | { success: true } | undefined;

export async function submitLeadFormAction(
  orgSlug: string,
  landingPageId: string,
  _prev: LeadFormResult,
  formData: FormData,
): Promise<LeadFormResult> {
  const organization = await findOrganizationBySlug(orgSlug);
  if (!organization) return { error: "Page not found." };

  const email = String(formData.get("email") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  try {
    await submitLeadForm({ organizationId: organization.id, landingPageId, email, name, message });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not submit. Check your email and try again." };
  }

  return { success: true };
}
