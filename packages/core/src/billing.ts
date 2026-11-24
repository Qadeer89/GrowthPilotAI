import { Paddle, Environment, EventName, type EventEntity } from "@paddle/paddle-node-sdk";
import { prisma, Prisma } from "@growthpilot/db";
import { requireMembership, requirePermission } from "./rbac";
import { PERMISSIONS } from "./permissions";
import { writeAuditLog } from "./audit";
import { NotFoundError, ForbiddenError, ValidationError } from "./errors";

let paddleClient: Paddle | null = null;

function getPaddleClient(): Paddle {
  if (paddleClient) return paddleClient;

  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) {
    throw new Error("PADDLE_API_KEY is not set");
  }

  paddleClient = new Paddle(apiKey, {
    environment: process.env.PADDLE_ENV === "production" ? Environment.production : Environment.sandbox,
  });
  return paddleClient;
}

/**
 * There is no platform-admin role in the RBAC model (every role is scoped to
 * one organization) -- plan catalog management is a platform-wide concern,
 * so it's gated by an env allowlist of admin emails instead of inventing a
 * new cross-organization role. Anyone not on this list gets ForbiddenError.
 */
async function requirePlatformAdmin(actorUserId: string): Promise<void> {
  const adminEmails = (process.env.BILLING_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.length === 0) {
    throw new ForbiddenError("No BILLING_ADMIN_EMAILS configured -- plan management is locked");
  }

  const user = await prisma.user.findUnique({ where: { id: actorUserId } });
  if (!user || !adminEmails.includes(user.email.toLowerCase())) {
    throw new ForbiddenError("Not authorized to manage billing plans");
  }
}

// ---------- Plans (admin-managed catalog) ----------

export async function listPlans(actorUserId: string, opts?: { activeOnly?: boolean }) {
  await requirePlatformAdmin(actorUserId).catch(() => {
    // Non-admins can still list active plans -- needed to render pricing/checkout.
    if (opts?.activeOnly === false) throw new ForbiddenError("Not authorized to list inactive plans");
  });
  return prisma.plan.findMany({
    where: opts?.activeOnly === false ? undefined : { isActive: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function listActivePlans() {
  return prisma.plan.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
}

export type PlanInput = {
  key: string;
  name: string;
  description?: string;
  billingInterval: "month" | "year" | "one_time" | "free";
  amountMicros?: bigint | null;
  currency?: string;
  paddleProductId?: string;
  paddlePriceId?: string;
  trialDays?: number;
  featureEntitlements: Record<string, unknown>;
  usageLimits: Record<string, unknown>;
};

export async function createPlan(actorUserId: string, input: PlanInput) {
  await requirePlatformAdmin(actorUserId);
  if (!input.key.trim() || !input.name.trim()) {
    throw new ValidationError("Plan key and name are required");
  }
  const plan = await prisma.plan.create({
    data: {
      key: input.key,
      name: input.name,
      description: input.description,
      billingInterval: input.billingInterval,
      amountMicros: input.amountMicros ?? null,
      currency: input.currency ?? "USD",
      paddleProductId: input.paddleProductId,
      paddlePriceId: input.paddlePriceId,
      trialDays: input.trialDays,
      featureEntitlements: input.featureEntitlements as Prisma.InputJsonValue,
      usageLimits: input.usageLimits as Prisma.InputJsonValue,
      isActive: false, // plans always start inactive -- activation is a deliberate, separate step
    },
  });
  await writeAuditLog({ actorUserId, action: "billing.plan_created", targetType: "Plan", targetId: plan.id });
  return plan;
}

export async function setPlanActive(actorUserId: string, planId: string, isActive: boolean) {
  await requirePlatformAdmin(actorUserId);
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new NotFoundError("Plan not found");

  if (isActive && (!plan.paddleProductId || !plan.paddlePriceId) && plan.billingInterval !== "free") {
    throw new ValidationError("Plan needs a Paddle product and price before it can be activated");
  }

  const updated = await prisma.plan.update({ where: { id: planId }, data: { isActive } });
  await writeAuditLog({
    actorUserId,
    action: isActive ? "billing.plan_activated" : "billing.plan_deactivated",
    targetType: "Plan",
    targetId: planId,
  });
  return updated;
}

// ---------- Customer & subscription (per organization) ----------

export async function getSubscription(organizationId: string, actorUserId: string) {
  await requireMembership(organizationId, actorUserId);
  return prisma.subscription.findUnique({ where: { organizationId }, include: { plan: true } });
}

export async function getTransactionHistory(organizationId: string, actorUserId: string, limit = 20) {
  await requireMembership(organizationId, actorUserId);
  return prisma.transaction.findMany({
    where: { organizationId },
    orderBy: { occurredAt: "desc" },
    take: limit,
  });
}

/**
 * Finds or creates the Paddle customer for this organization. The org's
 * earliest member's email is used as the billing email -- there's no
 * separate billing-contact field on Organization yet.
 */
export async function getOrCreatePaddleCustomer(organizationId: string): Promise<string> {
  const existing = await prisma.billingCustomer.findUnique({ where: { organizationId } });
  if (existing) return existing.paddleCustomerId;

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { members: { include: { user: true }, orderBy: { createdAt: "asc" }, take: 1 } },
  });
  if (!organization) throw new NotFoundError("Organization not found");

  const billingEmail = organization.members[0]?.user.email;
  if (!billingEmail) throw new NotFoundError("Organization has no members to bill");

  const paddle = getPaddleClient();
  const customer = await paddle.customers.create({
    email: billingEmail,
    name: organization.name,
    customData: { organizationId },
  });

  await prisma.billingCustomer.create({
    data: { organizationId, paddleCustomerId: customer.id, email: billingEmail },
  });

  return customer.id;
}

/**
 * Returns everything the client-side Paddle.js checkout overlay needs.
 * Paddle Billing checkout runs client-side against the price id; this
 * server call only exists to (a) verify the plan is actually active and
 * (b) mint/attach a Paddle customer first, so the checkout opens pre-filled
 * and tied to the right organization via customData.
 */
export async function prepareCheckout(
  organizationId: string,
  actorUserId: string,
  planId: string,
): Promise<{ organizationId: string; paddleCustomerId: string; paddlePriceId: string; planName: string }> {
  await requirePermission(organizationId, actorUserId, PERMISSIONS.ORG_MANAGE_BILLING);

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.isActive) {
    throw new NotFoundError("Plan not found or not available for checkout");
  }
  if (!plan.paddlePriceId) {
    throw new ValidationError("Plan has no Paddle price configured");
  }

  const paddleCustomerId = await getOrCreatePaddleCustomer(organizationId);

  return { organizationId, paddleCustomerId, paddlePriceId: plan.paddlePriceId, planName: plan.name };
}

export async function createCustomerPortalSession(
  organizationId: string,
  actorUserId: string,
): Promise<string> {
  await requirePermission(organizationId, actorUserId, PERMISSIONS.ORG_MANAGE_BILLING);

  const customer = await prisma.billingCustomer.findUnique({ where: { organizationId } });
  if (!customer) {
    throw new NotFoundError("No Paddle customer on file for this organization yet");
  }

  const paddle = getPaddleClient();
  const session = await paddle.customerPortalSessions.create(customer.paddleCustomerId, []);
  return session.urls.general.overview;
}

export async function cancelSubscription(organizationId: string, actorUserId: string) {
  await requirePermission(organizationId, actorUserId, PERMISSIONS.ORG_MANAGE_BILLING);

  const subscription = await prisma.subscription.findUnique({ where: { organizationId } });
  if (!subscription?.paddleSubscriptionId) {
    throw new NotFoundError("No active Paddle subscription for this organization");
  }

  const paddle = getPaddleClient();
  await paddle.subscriptions.cancel(subscription.paddleSubscriptionId, { effectiveFrom: "next_billing_period" });

  await writeAuditLog({
    organizationId,
    actorUserId,
    action: "billing.subscription_cancel_requested",
    targetType: "Subscription",
    targetId: subscription.id,
  });

  // The webhook is the source of truth for the resulting status; this just
  // reflects the user's intent immediately so the UI doesn't look stale.
  return prisma.subscription.update({
    where: { organizationId },
    data: { cancelAtPeriodEnd: true },
  });
}

// ---------- Entitlements ----------

export type Entitlements = {
  planKey: string | null;
  planName: string | null;
  status: string;
  features: Record<string, unknown>;
  limits: Record<string, unknown>;
};

const FREE_TIER_ENTITLEMENTS: Entitlements = {
  planKey: "free",
  planName: "Free",
  status: "free",
  features: {},
  limits: {},
};

/**
 * The single place that answers "what can this organization do right now".
 * Past-due subscriptions keep their plan's entitlements (grace period --
 * Paddle itself decides when to actually cancel for non-payment); canceled
 * or expired subscriptions fall back to the Free tier, never to no access.
 */
export async function getEntitlements(organizationId: string): Promise<Entitlements> {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
    include: { plan: true },
  });

  if (!subscription || !subscription.plan) return FREE_TIER_ENTITLEMENTS;

  const activeStatuses = ["trialing", "active", "past_due"];
  if (!activeStatuses.includes(subscription.status)) return FREE_TIER_ENTITLEMENTS;

  return {
    planKey: subscription.plan.key,
    planName: subscription.plan.name,
    status: subscription.status,
    features: subscription.plan.featureEntitlements as Record<string, unknown>,
    limits: subscription.plan.usageLimits as Record<string, unknown>,
  };
}

export async function hasFeature(organizationId: string, featureKey: string): Promise<boolean> {
  const entitlements = await getEntitlements(organizationId);
  return Boolean(entitlements.features[featureKey]);
}

/**
 * Single enforcement point for numeric usage limits (e.g. "how many video
 * projects this org can create this month"). A plan that doesn't define the
 * given limit key allows the action -- limits are opt-in per plan, not a
 * default cap, since no plan's numbers are finalized yet. Callers pass the
 * count they've already computed (this never queries usage itself) so the
 * counting logic stays with whatever feature owns that resource.
 */
export async function enforceUsageLimit(organizationId: string, limitKey: string, currentCount: number): Promise<void> {
  const entitlements = await getEntitlements(organizationId);
  const limit = entitlements.limits[limitKey];
  if (typeof limit !== "number") return;
  if (currentCount >= limit) {
    throw new ForbiddenError(`Your "${entitlements.planName}" plan allows up to ${limit} for "${limitKey}". Upgrade to continue.`);
  }
}

// ---------- Webhook processing ----------

function extractOrganizationId(customData: unknown): string | null {
  if (customData && typeof customData === "object" && "organizationId" in customData) {
    const value = (customData as Record<string, unknown>).organizationId;
    return typeof value === "string" ? value : null;
  }
  return null;
}

/**
 * Idempotent entry point for a verified Paddle webhook event. Signature
 * verification happens at the route handler, before this is called --
 * nothing here re-checks authenticity. Returns "duplicate" | "processed" |
 * "ignored" (event type we don't act on) | "failed" (and logs the error).
 */
export async function processPaddleWebhookEvent(
  event: EventEntity,
): Promise<"duplicate" | "processed" | "ignored" | "failed"> {
  const existing = await prisma.webhookEvent.findUnique({ where: { paddleEventId: event.eventId } });
  if (existing && existing.status === "processed") return "duplicate";

  const record = existing
    ? existing
    : await prisma.webhookEvent.create({
        data: {
          paddleEventId: event.eventId,
          eventType: event.eventType,
          payload: JSON.parse(JSON.stringify(event)),
          status: "pending",
        },
      });

  try {
    const acted = await applySubscriptionOrTransactionEvent(event);
    await prisma.webhookEvent.update({
      where: { id: record.id },
      data: { status: "processed", processedAt: new Date() },
    });
    return acted ? "processed" : "ignored";
  } catch (err) {
    await prisma.webhookEvent.update({
      where: { id: record.id },
      data: { status: "failed", errorDetail: err instanceof Error ? err.message : String(err) },
    });
    return "failed";
  }
}

async function applySubscriptionOrTransactionEvent(event: EventEntity): Promise<boolean> {
  switch (event.eventType) {
    case EventName.SubscriptionCreated:
    case EventName.SubscriptionUpdated:
    case EventName.SubscriptionActivated:
    case EventName.SubscriptionTrialing:
    case EventName.SubscriptionCanceled:
    case EventName.SubscriptionPastDue:
    case EventName.SubscriptionPaused:
    case EventName.SubscriptionResumed: {
      // The SDK's discriminated union means `event.data` is already the
      // right notification type for each of these eventTypes.
      const sub = (event as unknown as { data: Record<string, unknown> }).data as {
        id: string;
        status: string;
        customerId: string;
        customData: unknown;
        currentBillingPeriod: { startsAt: string; endsAt: string } | null;
        scheduledChange: { action: string } | null;
        items: { price: { id: string; name: string | null; productId: string } | null }[];
      };

      const organizationId = extractOrganizationId(sub.customData);
      if (!organizationId) return false;

      const item = sub.items[0];
      const plan = item?.price?.id
        ? await prisma.plan.findFirst({ where: { paddlePriceId: item.price.id } })
        : null;

      const data = {
        paddleCustomerId: sub.customerId,
        paddleSubscriptionId: sub.id,
        paddleProductId: item?.price?.productId,
        paddlePriceId: item?.price?.id,
        planId: plan?.id,
        status: sub.status,
        currentPeriodStart: sub.currentBillingPeriod ? new Date(sub.currentBillingPeriod.startsAt) : undefined,
        currentPeriodEnd: sub.currentBillingPeriod ? new Date(sub.currentBillingPeriod.endsAt) : undefined,
        cancelAtPeriodEnd: sub.scheduledChange?.action === "cancel",
        canceledAt: sub.status === "canceled" ? new Date() : undefined,
      };

      await prisma.subscription.upsert({
        where: { organizationId },
        create: { organizationId, ...data },
        update: data,
      });

      await writeAuditLog({
        organizationId,
        action: "billing.subscription_synced",
        targetType: "Subscription",
        targetId: sub.id,
        metadata: { status: sub.status },
      });
      return true;
    }

    case EventName.TransactionCompleted:
    case EventName.TransactionPaid:
    case EventName.TransactionPaymentFailed:
    case EventName.TransactionBilled:
    case EventName.TransactionPastDue:
    case EventName.TransactionCanceled: {
      const tx = (event as unknown as { data: Record<string, unknown> }).data as {
        id: string;
        status: string;
        customData: unknown;
        subscriptionId: string | null;
        currencyCode: string;
        invoiceId: string | null;
        createdAt: string;
        details: { totals: { total: string } | null } | null;
      };

      const organizationId = extractOrganizationId(tx.customData);
      if (!organizationId) return false;

      let subscriptionRowId: string | undefined;
      if (tx.subscriptionId) {
        const subRow = await prisma.subscription.findUnique({ where: { organizationId } });
        if (subRow?.paddleSubscriptionId === tx.subscriptionId) subscriptionRowId = subRow.id;
      }

      await prisma.transaction.upsert({
        where: { paddleTransactionId: tx.id },
        create: {
          organizationId,
          subscriptionId: subscriptionRowId,
          paddleTransactionId: tx.id,
          amountMicros: BigInt(tx.details?.totals?.total ?? "0"),
          currency: tx.currencyCode,
          status: tx.status,
          invoiceId: tx.invoiceId ?? undefined,
          occurredAt: new Date(tx.createdAt),
        },
        update: {
          status: tx.status,
          invoiceId: tx.invoiceId ?? undefined,
        },
      });
      return true;
    }

    default:
      return false;
  }
}
