import { prisma } from "@growthpilot/db";
import { generateContentDraft as aiGenerateContentDraft, type ContentBrief } from "@growthpilot/ai";

export type { ContentBrief, ContentType } from "@growthpilot/ai";
import { requireMembership, requirePermission } from "./rbac";
import { PERMISSIONS } from "./permissions";
import { recordUsage } from "./usage";
import { writeAuditLog } from "./audit";
import { NotFoundError } from "./errors";
import { publishSocialPost } from "./integrations";

const SOCIAL_PROVIDERS = ["linkedin", "facebook", "x"] as const;

async function loadBrandBrief(organizationId: string, brandId: string) {
  const brand = await prisma.brand.findFirst({ where: { id: brandId, organizationId } });
  if (!brand) throw new NotFoundError("Brand not found in this organization");
  return brand;
}

async function loadContentItem(organizationId: string, contentItemId: string) {
  const item = await prisma.contentItem.findFirst({
    where: { id: contentItemId, organizationId },
  });
  if (!item) throw new NotFoundError("Content item not found in this organization");
  return item;
}

export async function generateAndSaveContentDraft(
  input: {
    organizationId: string;
    brandId: string;
    actorUserId: string;
  } & ContentBrief,
) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.CONTENT_CREATE);

  const brand = await loadBrandBrief(input.organizationId, input.brandId);
  const result = await aiGenerateContentDraft(
    {
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
    },
    {
      contentType: input.contentType,
      platform: input.platform,
      audience: input.audience,
      tone: input.tone,
      topic: input.topic,
      keywords: input.keywords,
      cta: input.cta,
    },
  );

  const item = await prisma.contentItem.create({
    data: {
      organizationId: input.organizationId,
      workspaceId: brand.workspaceId,
      brandId: input.brandId,
      contentType: input.contentType,
      platform: input.platform,
      body: result.text,
      status: "draft",
      createdByUserId: input.actorUserId,
      versions: {
        create: { body: result.text, createdByUserId: input.actorUserId },
      },
    },
  });

  await recordUsage({
    organizationId: input.organizationId,
    workspaceId: brand.workspaceId,
    feature: "content_generation",
    provider: "openai",
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    createdByUserId: input.actorUserId,
  });

  await writeAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "content.generated",
    targetType: "ContentItem",
    targetId: item.id,
  });

  return item;
}

export async function updateContentItemBody(input: {
  organizationId: string;
  contentItemId: string;
  actorUserId: string;
  body: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.CONTENT_CREATE);
  await loadContentItem(input.organizationId, input.contentItemId);

  const item = await prisma.contentItem.update({
    where: { id: input.contentItemId },
    data: {
      body: input.body,
      status: "draft",
      versions: { create: { body: input.body, createdByUserId: input.actorUserId } },
    },
  });

  await writeAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "content.edited",
    targetType: "ContentItem",
    targetId: item.id,
  });

  return item;
}

async function decideContentItem(input: {
  organizationId: string;
  contentItemId: string;
  actorUserId: string;
  status: "approved" | "rejected";
  note?: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.CONTENT_APPROVE);
  await loadContentItem(input.organizationId, input.contentItemId);

  const [item] = await prisma.$transaction([
    prisma.contentItem.update({
      where: { id: input.contentItemId },
      data: { status: input.status },
    }),
    prisma.contentApproval.create({
      data: {
        contentItemId: input.contentItemId,
        approverId: input.actorUserId,
        status: input.status,
        note: input.note,
      },
    }),
  ]);

  await writeAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: `content.${input.status}`,
    targetType: "ContentItem",
    targetId: input.contentItemId,
  });

  return item;
}

export type AutoPublishResult = {
  attempted: number;
  published: { provider: string; account: string; postUrl: string }[];
  failed: { provider: string; account: string; reason: string }[];
};

/**
 * Approving a social_post item auto-publishes it to every connected account
 * for its platform (e.g. every connected Facebook Page). A platform with no
 * connected account, or a non-social content type, is a no-op, not an
 * error -- approval itself always succeeds regardless of publish outcome.
 */
async function autoPublishApprovedItem(
  item: { organizationId: string; id: string; contentType: string; platform: string | null; body: string },
  actorUserId: string,
): Promise<AutoPublishResult | null> {
  if (item.contentType !== "social_post" || !item.platform) return null;
  const provider = item.platform.toLowerCase();
  if (!SOCIAL_PROVIDERS.includes(provider as (typeof SOCIAL_PROVIDERS)[number])) return null;

  const accounts = await prisma.connectedAccount.findMany({
    where: { organizationId: item.organizationId, provider, status: "connected" },
  });
  if (accounts.length === 0) return null;

  const result: AutoPublishResult = { attempted: accounts.length, published: [], failed: [] };

  for (const account of accounts) {
    try {
      const post = await publishSocialPost({
        organizationId: item.organizationId,
        connectedAccountId: account.id,
        body: item.body,
        actorUserId,
      });
      result.published.push({
        provider,
        account: account.displayName ?? account.providerAccountId,
        postUrl: post.providerPostUrl ?? "",
      });
    } catch (err) {
      result.failed.push({
        provider,
        account: account.displayName ?? account.providerAccountId,
        reason: err instanceof Error ? err.message : "Publish failed",
      });
    }
  }

  return result;
}

export async function approveContentItem(input: {
  organizationId: string;
  contentItemId: string;
  actorUserId: string;
  note?: string;
}) {
  const item = await decideContentItem({ ...input, status: "approved" });
  const publishResult = await autoPublishApprovedItem(
    { organizationId: input.organizationId, id: item.id, contentType: item.contentType, platform: item.platform, body: item.body },
    input.actorUserId,
  );
  return { item, publishResult };
}

export async function rejectContentItem(input: {
  organizationId: string;
  contentItemId: string;
  actorUserId: string;
  note?: string;
}) {
  return decideContentItem({ ...input, status: "rejected" });
}

export async function listContentItems(organizationId: string, actorUserId: string) {
  await requireMembership(organizationId, actorUserId);

  return prisma.contentItem.findMany({
    where: { organizationId },
    include: { brand: true, approvals: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
}
