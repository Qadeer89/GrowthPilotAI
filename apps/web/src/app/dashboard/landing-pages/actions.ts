"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getPrimaryOrganizationForUser, createLandingPage } from "@growthpilot/core";
import { prisma } from "@growthpilot/db";

export type ActionResult = { error: string } | undefined;

export async function createLandingPageAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };
  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return { error: "No organization found." };

  const brandId = String(formData.get("brandId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const headline = String(formData.get("headline") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!brandId || !name || !headline || !body) return { error: "Brand, name, headline, and body are required." };

  const brand = await prisma.brand.findFirst({ where: { id: brandId, organizationId: context.organization.id } });
  if (!brand) return { error: "Brand not found." };

  try {
    await createLandingPage({
      organizationId: context.organization.id,
      workspaceId: brand.workspaceId,
      brandId,
      actorUserId: session.user.id,
      name,
      headline,
      body,
      ctaLabel: String(formData.get("ctaLabel") ?? "") || undefined,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create landing page." };
  }

  revalidatePath("/dashboard/landing-pages");
  return undefined;
}
