import crypto from "node:crypto";
import { prisma } from "@growthpilot/db";
import {
  buildLinkedInAuthorizationUrl,
  exchangeLinkedInCode,
  fetchLinkedInIdentity,
  publishLinkedInTextPost,
} from "@growthpilot/integrations";
import { requireMembership, requirePermission } from "./rbac";
import { PERMISSIONS } from "./permissions";
import { writeAuditLog } from "./audit";
import { NotFoundError, ConflictError } from "./errors";
import { encryptSecret, decryptSecret } from "./crypto";

export function getLinkedInAuthorizationUrl(state: string): string {
  return buildLinkedInAuthorizationUrl(state);
}

export async function connectLinkedInAccount(input: {
  organizationId: string;
  actorUserId: string;
  code: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.ORG_MANAGE_INTEGRATIONS);

  const token = await exchangeLinkedInCode(input.code);
  const identity = await fetchLinkedInIdentity(token.accessToken);

  const account = await prisma.connectedAccount.upsert({
    where: {
      organizationId_provider_providerAccountId: {
        organizationId: input.organizationId,
        provider: "linkedin",
        providerAccountId: identity.memberId,
      },
    },
    create: {
      organizationId: input.organizationId,
      provider: "linkedin",
      providerAccountId: identity.memberId,
      displayName: identity.name,
      status: "connected",
      connectedByUserId: input.actorUserId,
    },
    update: { status: "connected", displayName: identity.name },
  });

  const expiresAt = new Date(Date.now() + token.expiresInSeconds * 1000);
  await prisma.oAuthToken.upsert({
    where: { connectedAccountId: account.id },
    create: {
      connectedAccountId: account.id,
      accessTokenEncrypted: encryptSecret(token.accessToken),
      scope: token.scope,
      expiresAt,
    },
    update: { accessTokenEncrypted: encryptSecret(token.accessToken), scope: token.scope, expiresAt },
  });

  await writeAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "integration.connected",
    targetType: "ConnectedAccount",
    targetId: account.id,
  });

  return account;
}

export async function disconnectConnectedAccount(input: {
  organizationId: string;
  connectedAccountId: string;
  actorUserId: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.ORG_MANAGE_INTEGRATIONS);

  const account = await prisma.connectedAccount.findFirst({
    where: { id: input.connectedAccountId, organizationId: input.organizationId },
  });
  if (!account) throw new NotFoundError("Connected account not found in this organization");

  await prisma.connectedAccount.update({ where: { id: account.id }, data: { status: "disconnected" } });

  await writeAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "integration.disconnected",
    targetType: "ConnectedAccount",
    targetId: account.id,
  });
}

export async function listConnectedAccounts(organizationId: string, actorUserId: string) {
  await requireMembership(organizationId, actorUserId);
  return prisma.connectedAccount.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } });
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function doPublish(account: { providerAccountId: string }, accessTokenEncrypted: string, text: string) {
  const accessToken = decryptSecret(accessTokenEncrypted);
  return publishLinkedInTextPost({ accessToken, memberId: account.providerAccountId, text });
}

export async function publishSocialPost(input: {
  organizationId: string;
  connectedAccountId: string;
  campaignId?: string;
  body: string;
  actorUserId: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.CONTENT_PUBLISH);

  const account = await prisma.connectedAccount.findFirst({
    where: { id: input.connectedAccountId, organizationId: input.organizationId },
    include: { oauthToken: true },
  });
  if (!account) throw new NotFoundError("Connected account not found in this organization");
  if (account.status !== "connected" || !account.oauthToken) {
    throw new ConflictError("This account is not connected. Reconnect it before publishing.");
  }
  if (account.oauthToken.expiresAt <= new Date()) {
    await prisma.connectedAccount.update({ where: { id: account.id }, data: { status: "expired" } });
    throw new ConflictError("This account's connection has expired. Reconnect it before publishing.");
  }

  const campaign = input.campaignId ? await prisma.campaign.findUnique({ where: { id: input.campaignId } }) : null;

  const post = await prisma.socialPost.create({
    data: {
      organizationId: input.organizationId,
      workspaceId: campaign?.workspaceId,
      campaignId: input.campaignId,
      connectedAccountId: account.id,
      provider: account.provider,
      body: input.body,
      status: "publishing",
      idempotencyKey: crypto.randomUUID(),
      attempts: 1,
      createdByUserId: input.actorUserId,
    },
  });

  try {
    const result = await doPublish(account, account.oauthToken.accessTokenEncrypted, input.body);

    const updated = await prisma.socialPost.update({
      where: { id: post.id },
      data: { status: "published", providerPostId: result.postUrn, providerPostUrl: result.postUrl },
    });

    await writeAuditLog({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "social.published",
      targetType: "SocialPost",
      targetId: post.id,
      metadata: { provider: account.provider, providerPostId: result.postUrn },
    });

    return updated;
  } catch (err) {
    await prisma.socialPost.update({
      where: { id: post.id },
      data: { status: "failed", failureReason: errorMessage(err) },
    });
    throw err;
  }
}

export async function retryPublishSocialPost(input: {
  organizationId: string;
  socialPostId: string;
  actorUserId: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.CONTENT_PUBLISH);

  const post = await prisma.socialPost.findFirst({
    where: { id: input.socialPostId, organizationId: input.organizationId },
    include: { connectedAccount: { include: { oauthToken: true } } },
  });
  if (!post) throw new NotFoundError("Post not found in this organization");
  if (post.status === "published") return post;

  const account = post.connectedAccount;
  if (account.status !== "connected" || !account.oauthToken) {
    throw new ConflictError("This account is not connected. Reconnect it before publishing.");
  }

  await prisma.socialPost.update({
    where: { id: post.id },
    data: { status: "publishing", attempts: { increment: 1 } },
  });

  try {
    const result = await doPublish(account, account.oauthToken.accessTokenEncrypted, post.body);
    return await prisma.socialPost.update({
      where: { id: post.id },
      data: {
        status: "published",
        providerPostId: result.postUrn,
        providerPostUrl: result.postUrl,
        failureReason: null,
      },
    });
  } catch (err) {
    return await prisma.socialPost.update({
      where: { id: post.id },
      data: { status: "failed", failureReason: errorMessage(err) },
    });
  }
}

export async function listSocialPosts(organizationId: string, actorUserId: string) {
  await requireMembership(organizationId, actorUserId);
  return prisma.socialPost.findMany({
    where: { organizationId },
    include: { connectedAccount: true, campaign: true },
    orderBy: { createdAt: "desc" },
  });
}
