import { prisma } from "@growthpilot/db";
import { generateAgentPlan, type AgentToolDescriptor, type BrandBrief } from "@growthpilot/ai";
import { requireMembership, requirePermission } from "./rbac";
import { PERMISSIONS } from "./permissions";
import { writeAuditLog } from "./audit";
import { NotFoundError, ConflictError, ValidationError } from "./errors";
import { generateAndSaveContentDraft } from "./content";
import { CONTENT_TYPES, type ContentType } from "@growthpilot/ai";
import { createLandingPage } from "./leads";
import { createAdCampaign, approveAdCampaign, launchAdCampaign } from "./ads";

// The tool registry is the only source of truth for which tools exist and
// whether they require human approval. The AI planner is told about these
// tools (name/description/input shape) but never gets to decide
// requiresApproval itself -- that is looked up from here, every time, for
// every step, regardless of what the model's JSON output claims.
type ToolDefinition = {
  description: string;
  inputShape: string;
  requiresApproval: boolean;
  // Executes the tool for real. `priorResult` is the most recent completed
  // step's result in this task whose toolName matches `dependsOn`, if any --
  // this is how steps are wired together without ever trusting an ID from
  // the AI's own output.
  run: (ctx: ToolRunContext) => Promise<Record<string, unknown>>;
};

type ToolRunContext = {
  organizationId: string;
  workspaceId: string;
  brandId: string;
  actorUserId: string;
  input: Record<string, unknown>;
  findPriorResult: (toolName: string) => Promise<Record<string, unknown> | null>;
};

function str(input: Record<string, unknown>, key: string, fallback = ""): string {
  const v = input[key];
  return typeof v === "string" ? v : fallback;
}

function strArray(input: Record<string, unknown>, key: string): string[] {
  const v = input[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function num(input: Record<string, unknown>, key: string): number {
  const v = input[key];
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  return NaN;
}

export const TOOL_REGISTRY: Record<string, ToolDefinition> = {
  draft_content: {
    description: "Draft a piece of marketing content (post, blog, email copy, etc). Does not publish or spend money.",
    inputShape: `{ contentType: one of "${CONTENT_TYPES.join('" | "')}" (exact string, with underscores), platform?: string, topic: string, audience?: string, tone?: string, keywords?: string[], cta?: string }`,
    requiresApproval: false,
    async run(ctx) {
      const contentType = str(ctx.input, "contentType").trim().toLowerCase().replace(/[\s-]+/g, "_");
      if (!CONTENT_TYPES.includes(contentType as ContentType) || !str(ctx.input, "topic")) {
        throw new ValidationError(`draft_content requires topic and a contentType of: ${CONTENT_TYPES.join(", ")}`);
      }
      const keywords = strArray(ctx.input, "keywords");
      const item = await generateAndSaveContentDraft({
        organizationId: ctx.organizationId,
        brandId: ctx.brandId,
        actorUserId: ctx.actorUserId,
        contentType: contentType as ContentType,
        platform: str(ctx.input, "platform") || undefined,
        audience: str(ctx.input, "audience") || undefined,
        tone: str(ctx.input, "tone") || undefined,
        topic: str(ctx.input, "topic"),
        keywords: keywords.length > 0 ? keywords.join(", ") : undefined,
        cta: str(ctx.input, "cta") || undefined,
      });
      return { contentItemId: item.id };
    },
  },

  create_landing_page: {
    description: "Create a landing page with a headline, body, and CTA to capture leads for a campaign. Does not spend money.",
    inputShape: '{ name: string, headline: string, body: string, ctaLabel?: string }',
    requiresApproval: false,
    async run(ctx) {
      if (!str(ctx.input, "name") || !str(ctx.input, "headline") || !str(ctx.input, "body")) {
        throw new ValidationError("create_landing_page requires name, headline, and body");
      }
      const page = await createLandingPage({
        organizationId: ctx.organizationId,
        workspaceId: ctx.workspaceId,
        brandId: ctx.brandId,
        actorUserId: ctx.actorUserId,
        name: str(ctx.input, "name"),
        headline: str(ctx.input, "headline"),
        body: str(ctx.input, "body"),
        ctaLabel: str(ctx.input, "ctaLabel") || undefined,
      });
      return { landingPageId: page.id, slug: page.slug };
    },
  },

  draft_ad_campaign: {
    description: "Draft (but do not launch) a Google Ads campaign against the organization's connected Google Ads account. No spend occurs.",
    inputShape: '{ name: string, dailyBudgetCurrencyUnits: number }',
    requiresApproval: false,
    async run(ctx) {
      const name = str(ctx.input, "name");
      const dailyBudget = num(ctx.input, "dailyBudgetCurrencyUnits");
      if (!name || !Number.isFinite(dailyBudget) || dailyBudget <= 0) {
        throw new ValidationError("draft_ad_campaign requires name and a positive dailyBudgetCurrencyUnits");
      }
      const account = await prisma.connectedAccount.findFirst({
        where: { organizationId: ctx.organizationId, provider: "google_ads", status: "connected" },
      });
      if (!account) throw new ConflictError("No connected Google Ads account; connect one before drafting an ad campaign");

      const campaign = await createAdCampaign({
        organizationId: ctx.organizationId,
        workspaceId: ctx.workspaceId,
        brandId: ctx.brandId,
        connectedAccountId: account.id,
        name,
        dailyBudgetCurrencyUnits: dailyBudget,
        actorUserId: ctx.actorUserId,
      });
      return { adCampaignId: campaign.id };
    },
  },

  // The only paid tool today. Executing it reuses launchAdCampaign() from
  // Phase 6 unchanged -- it independently re-checks for a real AdApproval
  // row, so this tool cannot launch anything just because the agent step
  // itself was marked "approved".
  launch_ad_campaign: {
    description: "Launch a previously drafted ad campaign for real on Google Ads. Spends real money once enabled. Requires human approval.",
    inputShape: "{} (operates on the ad campaign drafted by the most recent draft_ad_campaign step in this task)",
    requiresApproval: true,
    async run(ctx) {
      const prior = await ctx.findPriorResult("draft_ad_campaign");
      const adCampaignId = prior?.adCampaignId;
      if (typeof adCampaignId !== "string") {
        throw new ConflictError("launch_ad_campaign has no preceding draft_ad_campaign step to launch");
      }
      const campaign = await launchAdCampaign({
        organizationId: ctx.organizationId,
        adCampaignId,
        actorUserId: ctx.actorUserId,
      });
      return { adCampaignId: campaign.id, providerStatus: campaign.providerStatus };
    },
  },
};

export function listAgentTools(): AgentToolDescriptor[] {
  return Object.entries(TOOL_REGISTRY).map(([name, def]) => ({
    name,
    description: def.description,
    inputShape: def.inputShape,
    requiresApproval: def.requiresApproval,
  }));
}

async function loadBrand(organizationId: string, brandId: string) {
  const brand = await prisma.brand.findFirst({ where: { id: brandId, organizationId } });
  if (!brand) throw new NotFoundError("Brand not found in this organization");
  return brand;
}

function toBrandBrief(brand: Awaited<ReturnType<typeof loadBrand>>): BrandBrief {
  return {
    name: brand.name,
    website: brand.website,
    industry: brand.industry,
    description: brand.description,
    valueProposition: brand.valueProposition,
    targetAudience: brand.targetAudience,
    targetCountries: brand.targetCountries,
    tone: brand.tone,
    languages: brand.languages,
    monthlyBudget: brand.monthlyBudget,
  };
}

export async function planAgentTask(input: {
  organizationId: string;
  brandId: string;
  requestText: string;
  actorUserId: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.CAMPAIGN_CREATE);
  if (!input.requestText.trim()) throw new ValidationError("A request is required");

  const brand = await loadBrand(input.organizationId, input.brandId);
  const plan = await generateAgentPlan({
    requestText: input.requestText,
    brand: toBrandBrief(brand),
    tools: listAgentTools(),
  });

  // Never trust the model's tool name: silently drop any step naming a tool
  // that doesn't exist in our own registry rather than executing it.
  const validSteps = plan.data.steps.filter((s) => s.toolName in TOOL_REGISTRY);
  if (validSteps.length === 0) {
    throw new ConflictError("The agent could not produce a valid plan for this request using available tools");
  }

  const task = await prisma.agentTask.create({
    data: {
      organizationId: input.organizationId,
      workspaceId: brand.workspaceId,
      brandId: input.brandId,
      requestText: input.requestText,
      status: "planned",
      createdByUserId: input.actorUserId,
      steps: {
        create: validSteps.map((s, i) => ({
          order: i,
          toolName: s.toolName,
          toolInput: s.input as object,
          reason: s.reason,
          requiresApproval: TOOL_REGISTRY[s.toolName].requiresApproval,
          status: "pending",
        })),
      },
    },
    include: { steps: { orderBy: { order: "asc" } } },
  });

  await writeAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "agent_task.planned",
    targetType: "AgentTask",
    targetId: task.id,
    metadata: { stepCount: validSteps.length, tools: validSteps.map((s) => s.toolName) },
  });

  return task;
}

async function findPriorResultFor(agentTaskId: string, beforeOrder: number, toolName: string): Promise<Record<string, unknown> | null> {
  const step = await prisma.agentStep.findFirst({
    where: { agentTaskId, toolName, status: "completed", order: { lt: beforeOrder } },
    orderBy: { order: "desc" },
  });
  return (step?.result as Record<string, unknown> | null) ?? null;
}

// Runs steps in order until it hits one that needs approval and hasn't
// gotten it, or until all steps are done. Stops immediately (and marks the
// task "failed") on the first step that throws -- never continues past a
// real failure.
export async function executeAgentTask(input: {
  organizationId: string;
  agentTaskId: string;
  actorUserId: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.CAMPAIGN_MANAGE);

  const task = await prisma.agentTask.findFirst({
    where: { id: input.agentTaskId, organizationId: input.organizationId },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  if (!task) throw new NotFoundError("Agent task not found in this organization");

  for (const step of task.steps) {
    if (step.status === "completed") continue;
    if (step.status === "failed") break;

    if (step.status === "pending" && step.requiresApproval) {
      await prisma.agentTask.update({ where: { id: task.id }, data: { status: "awaiting_approval" } });
      return prisma.agentTask.findUniqueOrThrow({ where: { id: task.id }, include: { steps: { orderBy: { order: "asc" } } } });
    }

    const def = TOOL_REGISTRY[step.toolName];
    if (!def) {
      await prisma.agentStep.update({ where: { id: step.id }, data: { status: "failed", failureReason: `Unknown tool: ${step.toolName}` } });
      await prisma.agentTask.update({ where: { id: task.id }, data: { status: "failed" } });
      break;
    }

    try {
      const result = await def.run({
        organizationId: task.organizationId,
        workspaceId: task.workspaceId,
        brandId: task.brandId,
        actorUserId: input.actorUserId,
        input: step.toolInput as Record<string, unknown>,
        findPriorResult: (toolName) => findPriorResultFor(task.id, step.order, toolName),
      });

      await prisma.agentStep.update({ where: { id: step.id }, data: { status: "completed", result: result as object, failureReason: null } });
      await writeAuditLog({
        organizationId: task.organizationId,
        actorUserId: input.actorUserId,
        action: "agent_step.completed",
        targetType: "AgentStep",
        targetId: step.id,
        metadata: { toolName: step.toolName, result },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await prisma.agentStep.update({ where: { id: step.id }, data: { status: "failed", failureReason: message } });
      await prisma.agentTask.update({ where: { id: task.id }, data: { status: "failed" } });
      await writeAuditLog({
        organizationId: task.organizationId,
        actorUserId: input.actorUserId,
        action: "agent_step.failed",
        targetType: "AgentStep",
        targetId: step.id,
        metadata: { toolName: step.toolName, error: message },
      });
      return prisma.agentTask.findUniqueOrThrow({ where: { id: task.id }, include: { steps: { orderBy: { order: "asc" } } } });
    }
  }

  const refreshed = await prisma.agentTask.findUniqueOrThrow({
    where: { id: task.id },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  const allCompleted = refreshed.steps.every((s) => s.status === "completed");
  if (allCompleted && refreshed.status !== "completed") {
    await prisma.agentTask.update({ where: { id: task.id }, data: { status: "completed" } });
    await writeAuditLog({
      organizationId: task.organizationId,
      actorUserId: input.actorUserId,
      action: "agent_task.completed",
      targetType: "AgentTask",
      targetId: task.id,
    });
  }

  return prisma.agentTask.findUniqueOrThrow({ where: { id: task.id }, include: { steps: { orderBy: { order: "asc" } } } });
}

// The approval gate at the agent level. For a paid tool like
// launch_ad_campaign, this is also what creates the real AdApproval row
// (via approveAdCampaign) that launchAdCampaign independently requires --
// approving an agent step is not a shortcut around Phase 6's gate, it IS
// the thing that satisfies it.
export async function approveAgentStep(input: {
  organizationId: string;
  agentStepId: string;
  actorUserId: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.ADS_APPROVE_LAUNCH);

  const step = await prisma.agentStep.findFirst({
    where: { id: input.agentStepId, agentTask: { organizationId: input.organizationId } },
    include: { agentTask: true },
  });
  if (!step) throw new NotFoundError("Agent step not found in this organization");
  if (!step.requiresApproval) throw new ConflictError("This step does not require approval");
  if (step.status !== "pending") throw new ConflictError(`Cannot approve a step in status "${step.status}"`);

  if (step.toolName === "launch_ad_campaign") {
    const prior = await findPriorResultFor(step.agentTaskId, step.order, "draft_ad_campaign");
    const adCampaignId = prior?.adCampaignId;
    if (typeof adCampaignId !== "string") {
      throw new ConflictError("No preceding draft_ad_campaign step to approve a launch for");
    }
    await approveAdCampaign({ organizationId: input.organizationId, adCampaignId, actorUserId: input.actorUserId });
  }

  await prisma.agentStep.update({
    where: { id: step.id },
    data: { status: "approved", approvedByUserId: input.actorUserId },
  });

  await writeAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "agent_step.approved",
    targetType: "AgentStep",
    targetId: step.id,
  });

  return executeAgentTask({ organizationId: input.organizationId, agentTaskId: step.agentTaskId, actorUserId: input.actorUserId });
}

export async function listAgentTasks(organizationId: string, actorUserId: string) {
  await requireMembership(organizationId, actorUserId);
  return prisma.agentTask.findMany({
    where: { organizationId },
    include: { steps: { orderBy: { order: "asc" } }, brand: true },
    orderBy: { createdAt: "desc" },
  });
}
