import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@growthpilot/db";
import { createUser } from "../users";
import { createOrganizationWithOwner } from "../organizations";
import { createWorkspace } from "../workspaces";
import { executeAgentTask, approveAgentStep } from "../agent";

// Phase 7 exit criteria (spec Section 21): "the agent executes a real
// multi-step campaign request end-to-end for organic content, and correctly
// stops at the approval gate for anything paid." Steps are constructed
// directly here (bypassing the AI planner) for a deterministic, fast test of
// the execution/approval-gate logic itself -- the real AI planning call is
// verified separately, end-to-end, in the browser.

const suffix = Date.now().toString(36);

describe("autonomous agent execution", () => {
  let owner: { id: string };
  let org: { id: string };
  let brandId: string;
  let workspaceId: string;

  beforeAll(async () => {
    owner = await createUser({
      email: `agent-${suffix}@test.growthpilot.local`,
      password: "password123",
      name: "Agent Test Owner",
    });
    org = await createOrganizationWithOwner({ name: `Agent Org ${suffix}`, ownerUserId: owner.id });

    const workspace = await createWorkspace({ organizationId: org.id, actorUserId: owner.id, name: "Launch" });
    workspaceId = workspace.id;

    const brand = await prisma.brand.create({
      data: { organizationId: org.id, workspaceId, name: `Agent Test Brand ${suffix}` },
    });
    brandId = brand.id;
  });

  afterAll(async () => {
    if (org?.id) await prisma.organization.delete({ where: { id: org.id } }).catch(() => undefined);
    if (owner?.id) await prisma.user.delete({ where: { id: owner.id } }).catch(() => undefined);
  });

  it("executes a real multi-step organic plan end-to-end", async () => {
    const task = await prisma.agentTask.create({
      data: {
        organizationId: org.id,
        workspaceId,
        brandId,
        requestText: "Draft a post and a landing page for our new service",
        status: "planned",
        createdByUserId: owner.id,
        steps: {
          create: [
            {
              order: 0,
              toolName: "draft_content",
              toolInput: { contentType: "social_post", topic: "New rehab service launch" },
              requiresApproval: false,
              status: "pending",
            },
            {
              order: 1,
              toolName: "create_landing_page",
              toolInput: { name: "Launch Page", headline: "We're live", body: "Come try our new service." },
              requiresApproval: false,
              status: "pending",
            },
          ],
        },
      },
    });

    const result = await executeAgentTask({ organizationId: org.id, agentTaskId: task.id, actorUserId: owner.id });
    expect(result.status).toBe("completed");
    expect(result.steps.every((s) => s.status === "completed")).toBe(true);

    const contentStep = result.steps.find((s) => s.toolName === "draft_content")!;
    const landingStep = result.steps.find((s) => s.toolName === "create_landing_page")!;

    const contentItemId = (contentStep.result as { contentItemId?: string })?.contentItemId;
    const landingPageId = (landingStep.result as { landingPageId?: string })?.landingPageId;
    expect(contentItemId).toBeTruthy();
    expect(landingPageId).toBeTruthy();

    // Prove these aren't just claimed in the step result -- they're real rows.
    const contentItem = await prisma.contentItem.findUnique({ where: { id: contentItemId! } });
    const landingPage = await prisma.landingPage.findUnique({ where: { id: landingPageId! } });
    expect(contentItem).not.toBeNull();
    expect(landingPage).not.toBeNull();
  }, 30000);

  it("stops at the approval gate for a paid step and never calls the provider until approved", async () => {
    const account = await prisma.connectedAccount.create({
      data: {
        organizationId: org.id,
        provider: "google_ads",
        providerAccountId: `test-customer-${Date.now()}`,
        status: "connected",
        connectedByUserId: owner.id,
      },
    });

    const task = await prisma.agentTask.create({
      data: {
        organizationId: org.id,
        workspaceId,
        brandId,
        requestText: "Launch a $5/day Google ad campaign for our new service",
        status: "planned",
        createdByUserId: owner.id,
        steps: {
          create: [
            {
              order: 0,
              toolName: "draft_ad_campaign",
              toolInput: { name: "Launch Ads", dailyBudgetCurrencyUnits: 5 },
              requiresApproval: false,
              status: "pending",
            },
            {
              order: 1,
              toolName: "launch_ad_campaign",
              toolInput: {},
              requiresApproval: true,
              status: "pending",
            },
          ],
        },
      },
    });

    const afterFirstRun = await executeAgentTask({ organizationId: org.id, agentTaskId: task.id, actorUserId: owner.id });
    expect(afterFirstRun.status).toBe("awaiting_approval");

    const draftStep = afterFirstRun.steps.find((s) => s.toolName === "draft_ad_campaign")!;
    expect(draftStep.status).toBe("completed");
    const launchStep = afterFirstRun.steps.find((s) => s.toolName === "launch_ad_campaign")!;
    expect(launchStep.status).toBe("pending");

    const adCampaignId = (draftStep.result as { adCampaignId?: string })?.adCampaignId;
    expect(adCampaignId).toBeTruthy();

    // No approval record exists yet -- the draft is real, but nothing was
    // ever sent to Google for the launch.
    const approvalBefore = await prisma.adApproval.findFirst({ where: { adCampaignId: adCampaignId! } });
    expect(approvalBefore).toBeNull();
    const campaignBefore = await prisma.adCampaign.findUnique({ where: { id: adCampaignId! } });
    expect(campaignBefore?.status).toBe("draft");

    // Approving the agent step is what creates the real ad_approvals row and
    // attempts the real launch -- which fails honestly here because this
    // test account has no real OAuth token, proving no fabricated success.
    const afterApproval = await approveAgentStep({ organizationId: org.id, agentStepId: launchStep.id, actorUserId: owner.id });
    const approvalAfter = await prisma.adApproval.findFirst({ where: { adCampaignId: adCampaignId!, status: "approved" } });
    expect(approvalAfter).not.toBeNull();
    expect(afterApproval.status).toBe("failed");

    await prisma.connectedAccount.delete({ where: { id: account.id } }).catch(() => undefined);
  }, 30000);
});
