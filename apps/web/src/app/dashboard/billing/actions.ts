"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  cancelSubscription,
  createCustomerPortalSession,
  getPrimaryOrganizationForUser,
  prepareCheckout,
} from "@growthpilot/core";

export type CheckoutResult =
  | { organizationId: string; paddleCustomerId: string; paddlePriceId: string; planName: string }
  | { error: string };

export async function prepareCheckoutAction(planId: string): Promise<CheckoutResult> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };
  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return { error: "No organization found." };

  try {
    return await prepareCheckout(context.organization.id, session.user.id, planId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not start checkout." };
  }
}

export async function openCustomerPortalAction() {
  const session = await auth();
  if (!session?.user) return;
  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return;

  const url = await createCustomerPortalSession(context.organization.id, session.user.id);
  redirect(url);
}

export async function cancelSubscriptionAction() {
  const session = await auth();
  if (!session?.user) return;
  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return;

  await cancelSubscription(context.organization.id, session.user.id);
}
