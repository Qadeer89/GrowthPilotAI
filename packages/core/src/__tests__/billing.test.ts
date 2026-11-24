import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EventName, type EventEntity } from "@paddle/paddle-node-sdk";
import { prisma } from "@growthpilot/db";
import { createUser } from "../users";
import { createOrganizationWithOwner } from "../organizations";
import {
  createPlan,
  setPlanActive,
  getEntitlements,
  enforceUsageLimit,
  prepareCheckout,
  processPaddleWebhookEvent,
} from "../billing";
import { ForbiddenError, NotFoundError, ValidationError } from "../errors";

// Covers the realistically-testable billing scenarios from the spec: plan
// catalog admin-gating, entitlement fallback, usage-limit enforcement,
// checkout preconditions, and webhook idempotency/routing. Runs against the
// real dev database (same pattern as tenant-isolation.test.ts) -- nothing
// here calls out to the real Paddle API, so no sandbox key is required.

const suffix = Date.now().toString(36);

describe("billing", () => {
  let owner: { id: string; email: string };
  let outsider: { id: string; email: string };
  let orgA: { id: string };
  let orgB: { id: string };
  const planIds: string[] = [];

  beforeAll(async () => {
    owner = await createUser({
      email: `billing-owner-${suffix}@test.growthpilot.local`,
      password: "password123",
      name: "Billing Owner",
    });
    outsider = await createUser({
      email: `billing-outsider-${suffix}@test.growthpilot.local`,
      password: "password123",
      name: "Billing Outsider",
    });

    orgA = await createOrganizationWithOwner({ name: `Billing Org A ${suffix}`, ownerUserId: owner.id });
    orgB = await createOrganizationWithOwner({ name: `Billing Org B ${suffix}`, ownerUserId: outsider.id });
  });

  afterAll(async () => {
    await prisma.webhookEvent.deleteMany({ where: { paddleEventId: { contains: suffix } } }).catch(() => undefined);
    await prisma.transaction.deleteMany({ where: { organizationId: { in: [orgA?.id, orgB?.id].filter(Boolean) } } }).catch(() => undefined);
    await prisma.subscription.deleteMany({ where: { organizationId: { in: [orgA?.id, orgB?.id].filter(Boolean) } } }).catch(() => undefined);
    for (const id of planIds) await prisma.plan.delete({ where: { id } }).catch(() => undefined);
    if (orgA?.id) await prisma.organization.delete({ where: { id: orgA.id } }).catch(() => undefined);
    if (orgB?.id) await prisma.organization.delete({ where: { id: orgB.id } }).catch(() => undefined);
    if (owner?.id) await prisma.user.delete({ where: { id: owner.id } }).catch(() => undefined);
    if (outsider?.id) await prisma.user.delete({ where: { id: outsider.id } }).catch(() => undefined);
  });

  describe("plan catalog (platform-admin gated)", () => {
    it("rejects plan creation from a user who is not on BILLING_ADMIN_EMAILS", async () => {
      const prevAdmins = process.env.BILLING_ADMIN_EMAILS;
      process.env.BILLING_ADMIN_EMAILS = "someone-else@example.com";
      try {
        await expect(
          createPlan(owner.id, {
            key: `rejected_${suffix}`,
            name: "Rejected",
            billingInterval: "month",
            featureEntitlements: {},
            usageLimits: {},
          }),
        ).rejects.toThrow(ForbiddenError);
      } finally {
        process.env.BILLING_ADMIN_EMAILS = prevAdmins;
      }
    });

    it("rejects plan creation entirely when BILLING_ADMIN_EMAILS is unset", async () => {
      const prevAdmins = process.env.BILLING_ADMIN_EMAILS;
      delete process.env.BILLING_ADMIN_EMAILS;
      try {
        await expect(
          createPlan(owner.id, {
            key: `rejected2_${suffix}`,
            name: "Rejected 2",
            billingInterval: "month",
            featureEntitlements: {},
            usageLimits: {},
          }),
        ).rejects.toThrow(ForbiddenError);
      } finally {
        process.env.BILLING_ADMIN_EMAILS = prevAdmins;
      }
    });

    it("creates a plan as inactive even for an admin, and requires an explicit activation step", async () => {
      const prevAdmins = process.env.BILLING_ADMIN_EMAILS;
      process.env.BILLING_ADMIN_EMAILS = owner.email;
      try {
        const plan = await createPlan(owner.id, {
          key: `starter_${suffix}`,
          name: "Starter",
          billingInterval: "month",
          featureEntitlements: { advancedAnalytics: true },
          usageLimits: { monthlyVideoProjects: 2 },
        });
        planIds.push(plan.id);
        expect(plan.isActive).toBe(false);
      } finally {
        process.env.BILLING_ADMIN_EMAILS = prevAdmins;
      }
    });

    it("refuses to activate a paid plan with no Paddle product/price configured", async () => {
      const prevAdmins = process.env.BILLING_ADMIN_EMAILS;
      process.env.BILLING_ADMIN_EMAILS = owner.email;
      try {
        const plan = await createPlan(owner.id, {
          key: `paid_no_price_${suffix}`,
          name: "Paid No Price",
          billingInterval: "month",
          featureEntitlements: {},
          usageLimits: {},
        });
        planIds.push(plan.id);

        await expect(setPlanActive(owner.id, plan.id, true)).rejects.toThrow(ValidationError);
      } finally {
        process.env.BILLING_ADMIN_EMAILS = prevAdmins;
      }
    });

    it("allows activating a free plan with no Paddle product/price", async () => {
      const prevAdmins = process.env.BILLING_ADMIN_EMAILS;
      process.env.BILLING_ADMIN_EMAILS = owner.email;
      try {
        const plan = await createPlan(owner.id, {
          key: `free_${suffix}`,
          name: "Free",
          billingInterval: "free",
          featureEntitlements: {},
          usageLimits: {},
        });
        planIds.push(plan.id);

        const activated = await setPlanActive(owner.id, plan.id, true);
        expect(activated.isActive).toBe(true);
      } finally {
        process.env.BILLING_ADMIN_EMAILS = prevAdmins;
      }
    });
  });

  describe("entitlements", () => {
    it("falls back to the Free tier when the organization has no subscription row", async () => {
      const entitlements = await getEntitlements(orgA.id);
      expect(entitlements.planKey).toBe("free");
      expect(entitlements.status).toBe("free");
    });

    it("uses the linked plan's entitlements while active, keeps them while past_due, and falls back to Free once canceled", async () => {
      const prevAdmins = process.env.BILLING_ADMIN_EMAILS;
      process.env.BILLING_ADMIN_EMAILS = owner.email;
      let plan: { id: string; key: string };
      try {
        plan = await createPlan(owner.id, {
          key: `entitlement_plan_${suffix}`,
          name: "Entitlement Plan",
          billingInterval: "month",
          featureEntitlements: { advancedAnalytics: true },
          usageLimits: { monthlyVideoProjects: 3 },
        });
        planIds.push(plan.id);
      } finally {
        process.env.BILLING_ADMIN_EMAILS = prevAdmins;
      }

      await prisma.subscription.create({
        data: { organizationId: orgA.id, planId: plan.id, status: "active" },
      });

      const active = await getEntitlements(orgA.id);
      expect(active.planKey).toBe(plan.key);
      expect(active.features.advancedAnalytics).toBe(true);
      expect(active.limits.monthlyVideoProjects).toBe(3);

      await prisma.subscription.update({ where: { organizationId: orgA.id }, data: { status: "past_due" } });
      const pastDue = await getEntitlements(orgA.id);
      expect(pastDue.planKey).toBe(plan.key);
      expect(pastDue.status).toBe("past_due");

      await prisma.subscription.update({ where: { organizationId: orgA.id }, data: { status: "canceled" } });
      const canceled = await getEntitlements(orgA.id);
      expect(canceled.planKey).toBe("free");
    });
  });

  describe("usage limits", () => {
    it("allows the action when the plan defines no limit for that key", async () => {
      await prisma.subscription.update({ where: { organizationId: orgA.id }, data: { status: "active" } });
      await expect(enforceUsageLimit(orgA.id, "someUndefinedLimitKey", 999)).resolves.toBeUndefined();
    });

    it("blocks the action once the current count reaches the plan's configured limit", async () => {
      await expect(enforceUsageLimit(orgA.id, "monthlyVideoProjects", 3)).rejects.toThrow(ForbiddenError);
      await expect(enforceUsageLimit(orgA.id, "monthlyVideoProjects", 2)).resolves.toBeUndefined();
    });
  });

  describe("checkout preconditions", () => {
    it("rejects checkout for a user who is not a member of the organization", async () => {
      const activePlan = await prisma.plan.findFirst({ where: { key: `free_${suffix}`, isActive: true } });
      expect(activePlan).toBeTruthy();
      await expect(prepareCheckout(orgA.id, outsider.id, activePlan!.id)).rejects.toThrow(ForbiddenError);
    });

    it("rejects checkout for a plan that is not active", async () => {
      const prevAdmins = process.env.BILLING_ADMIN_EMAILS;
      process.env.BILLING_ADMIN_EMAILS = owner.email;
      let inactivePlan: { id: string };
      try {
        inactivePlan = await createPlan(owner.id, {
          key: `inactive_checkout_${suffix}`,
          name: "Inactive Checkout",
          billingInterval: "month",
          featureEntitlements: {},
          usageLimits: {},
        });
        planIds.push(inactivePlan.id);
      } finally {
        process.env.BILLING_ADMIN_EMAILS = prevAdmins;
      }

      await expect(prepareCheckout(orgA.id, owner.id, inactivePlan.id)).rejects.toThrow(NotFoundError);
    });

    it("rejects checkout for an active plan with no Paddle price configured", async () => {
      // Force isActive without going through setPlanActive's price check, to
      // isolate prepareCheckout's own validation from the activation guard.
      const plan = await prisma.plan.create({
        data: {
          key: `active_no_price_${suffix}`,
          name: "Active No Price",
          billingInterval: "month",
          isActive: true,
          featureEntitlements: {},
          usageLimits: {},
        },
      });
      planIds.push(plan.id);

      await expect(prepareCheckout(orgA.id, owner.id, plan.id)).rejects.toThrow(ValidationError);
    });
  });

  describe("webhook processing", () => {
    it("treats an unrecognized event type as ignored, and a repeat delivery of the same event id as a duplicate", async () => {
      const event = {
        eventId: `evt_unknown_${suffix}`,
        eventType: "some.unhandled.event",
        data: {},
      } as unknown as EventEntity;

      const first = await processPaddleWebhookEvent(event);
      expect(first).toBe("ignored");

      const second = await processPaddleWebhookEvent(event);
      expect(second).toBe("duplicate");
    });

    it("syncs a subscription-created event to the matching plan via paddlePriceId, keyed by customData.organizationId", async () => {
      const prevAdmins = process.env.BILLING_ADMIN_EMAILS;
      process.env.BILLING_ADMIN_EMAILS = owner.email;
      let plan: { id: string; key: string };
      try {
        plan = await createPlan(owner.id, {
          key: `webhook_plan_${suffix}`,
          name: "Webhook Plan",
          billingInterval: "month",
          paddleProductId: `pro_test_${suffix}`,
          paddlePriceId: `pri_test_${suffix}`,
          featureEntitlements: {},
          usageLimits: {},
        });
        planIds.push(plan.id);
        await setPlanActive(owner.id, plan.id, true);
      } finally {
        process.env.BILLING_ADMIN_EMAILS = prevAdmins;
      }

      const event = {
        eventId: `evt_sub_created_${suffix}`,
        eventType: EventName.SubscriptionCreated,
        data: {
          id: `sub_test_${suffix}`,
          status: "active",
          customerId: `ctm_test_${suffix}`,
          customData: { organizationId: orgB.id },
          currentBillingPeriod: { startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 30 * 86400000).toISOString() },
          scheduledChange: null,
          items: [{ price: { id: `pri_test_${suffix}`, productId: `pro_test_${suffix}`, name: plan.key } }],
        },
      } as unknown as EventEntity;

      const result = await processPaddleWebhookEvent(event);
      expect(result).toBe("processed");

      const subscription = await prisma.subscription.findUnique({ where: { organizationId: orgB.id } });
      expect(subscription?.planId).toBe(plan.id);
      expect(subscription?.status).toBe("active");
      expect(subscription?.paddleSubscriptionId).toBe(`sub_test_${suffix}`);

      // Redelivery of the same event id must not reprocess it.
      const redelivered = await processPaddleWebhookEvent(event);
      expect(redelivered).toBe("duplicate");
    });

    it("ignores a webhook event whose customData carries no organizationId", async () => {
      const event = {
        eventId: `evt_no_org_${suffix}`,
        eventType: EventName.SubscriptionUpdated,
        data: {
          id: `sub_no_org_${suffix}`,
          status: "active",
          customerId: `ctm_test_${suffix}`,
          customData: {},
          currentBillingPeriod: null,
          scheduledChange: null,
          items: [],
        },
      } as unknown as EventEntity;

      const result = await processPaddleWebhookEvent(event);
      expect(result).toBe("ignored");
    });
  });
});
