"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { createPlan, setPlanActive, type PlanInput } from "@growthpilot/core";

export type ActionResult = { error: string } | undefined;

export async function createPlanAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };

  const billingInterval = String(formData.get("billingInterval") ?? "month") as PlanInput["billingInterval"];
  const amountRaw = String(formData.get("amount") ?? "").trim();

  const input: PlanInput = {
    key: String(formData.get("key") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || undefined,
    billingInterval,
    amountMicros: billingInterval === "free" || !amountRaw ? null : BigInt(Math.round(Number(amountRaw) * 100)),
    currency: String(formData.get("currency") ?? "USD").trim() || "USD",
    paddleProductId: String(formData.get("paddleProductId") ?? "").trim() || undefined,
    paddlePriceId: String(formData.get("paddlePriceId") ?? "").trim() || undefined,
    trialDays: formData.get("trialDays") ? Number(formData.get("trialDays")) : undefined,
    featureEntitlements: {},
    usageLimits: {},
  };

  try {
    await createPlan(session.user.id, input);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create plan." };
  }

  revalidatePath("/dashboard/admin/plans");
  return undefined;
}

export async function togglePlanAction(planId: string, isActive: boolean) {
  const session = await auth();
  if (!session?.user) return;
  await setPlanActive(session.user.id, planId, isActive);
  revalidatePath("/dashboard/admin/plans");
  revalidatePath("/dashboard/billing");
}
