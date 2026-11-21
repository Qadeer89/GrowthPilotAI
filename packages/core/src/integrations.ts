import crypto from "node:crypto";
import { prisma } from "@growthpilot/db";
import {
  buildLinkedInAuthorizationUrl,
  exchangeLinkedInCode,
  fetchLinkedInIdentity,
  publishLinkedInTextPost,
  buildFacebookAuthorizationUrl,
  listFacebookPages,
  publishFacebookPagePost,
  publishFacebookPageVideo,
  buildInstagramAuthorizationUrl,
  listInstagramAccounts,
  buildXAuthorizationUrl,
  exchangeXCode,
  fetchXIdentity,
  publishXPost,
} from "@growthpilot/integrations";
import { requireMembership, requirePermission } from "./rbac";
import { PERMISSIONS } from "./permissions";
import { writeAuditLog } from "./audit";
import { NotFoundError, ConflictError } from "./errors";
import { encryptSecret, decryptSecret } from "./crypto";

export function getLinkedInAuthorizationUrl(state: string): string {
  return buildLinkedInAuthorizationUrl(state);
}

export function getFacebookAuthorizationUrl(state: string): string {
  return buildFacebookAuthorizationUrl(state);
}

export function getXAuthorizationUrl(state: string, codeChallenge: string): string {
  return buildXAuthorizationUrl(state, codeChallenge);
}

export function getInstagramAuthorizationUrl(state: string): string {
  return buildInstagramAuthorizationUrl(state);
}

// A Facebook user can manage multiple Pages; each Page becomes its own
// ConnectedAccount (its own token, its own publish target) rather than
// forcing a single-Page choice during connect.
export async function connectFacebookPages(input: {
  organizationId: string;
  actorUserId: string;
  code: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.ORG_MANAGE_INTEGRATIONS);

  const pages = await listFacebookPages(input.code);
  if (pages.length === 0) {
    throw new ConflictError("No Facebook Pages found for this account. You need to manage at least one Page.");
  }

  const accounts = [];
  // Meta's long-lived Page tokens don't carry their own expiry; 60 days
  // matches the practical lifetime of the long-lived user token they were
  // minted from, after which reconnecting is the safe default.
  const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

  for (const page of pages) {
    const account = await prisma.connectedAccount.upsert({
      where: {
        organizationId_provider_providerAccountId: {
          organizationId: input.organizationId,
          provider: "facebook",
          providerAccountId: page.pageId,
        },
      },
      create: {
        organizationId: input.organizationId,
        provider: "facebook",
        providerAccountId: page.pageId,
        displayName: page.name,
        status: "connected",
        connectedByUserId: input.actorUserId,
      },
      update: { status: "connected", displayName: page.name },
    });

    await prisma.oAuthToken.upsert({
      where: { connectedAccountId: account.id },
      create: {
        connectedAccountId: account.id,
        accessTokenEncrypted: encryptSecret(page.accessToken),
        scope: "pages_manage_posts",
        expiresAt,
      },
      update: { accessTokenEncrypted: encryptSecret(page.accessToken), expiresAt },
    });

    await writeAuditLog({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "integration.connected",
      targetType: "ConnectedAccount",
      targetId: account.id,
    });

    accounts.push(account);
  }

  return accounts;
}

/** Same account-discovery shape as connectFacebookPages, for the linked Instagram accounts instead. */
export async function connectInstagramAccounts(input: {
  organizationId: string;
  actorUserId: string;
  code: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.ORG_MANAGE_INTEGRATIONS);

  const igAccounts = await listInstagramAccounts(input.code);
  if (igAccounts.length === 0) {
    throw new ConflictError(
      "No Instagram professional account found. Link an Instagram Business/Creator account to one of your Facebook Pages first.",
    );
  }

  const accounts = [];
  const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

  for (const ig of igAccounts) {
    const account = await prisma.connectedAccount.upsert({
      where: {
        organizationId_provider_providerAccountId: {
          organizationId: input.organizationId,
          provider: "instagram",
          providerAccountId: ig.igUserId,
        },
      },
      create: {
        organizationId: input.organizationId,
        provider: "instagram",
        providerAccountId: ig.igUserId,
        displayName: ig.username,
        status: "connected",
        connectedByUserId: input.actorUserId,
      },
      update: { status: "connected", displayName: ig.username },
    });

    await prisma.oAuthToken.upsert({
      where: { connectedAccountId: account.id },
      create: {
        connectedAccountId: account.id,
        accessTokenEncrypted: encryptSecret(ig.pageAccessToken),
        scope: "instagram_content_publish",
        expiresAt,
      },
      update: { accessTokenEncrypted: encryptSecret(ig.pageAccessToken), expiresAt },
    });

    await writeAuditLog({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "integration.connected",
      targetType: "ConnectedAccount",
      targetId: account.id,
    });

    accounts.push(account);
  }

  return accounts;
}

export async function connectXAccount(input: {
  organizationId: string;
  actorUserId: string;
  code: string;
  codeVerifier: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.ORG_MANAGE_INTEGRATIONS);

  const token = await exchangeXCode(input.code, input.codeVerifier);
  const identity = await fetchXIdentity(token.accessToken);

  const account = await prisma.connectedAccount.upsert({
    where: {
      organizationId_provider_providerAccountId: {
        organizationId: input.organizationId,
        provider: "x",
        providerAccountId: identity.userId,
      },
    },
    create: {
      organizationId: input.organizationId,
      provider: "x",
      providerAccountId: identity.userId,
      displayName: identity.username,
      status: "connected",
      connectedByUserId: input.actorUserId,
    },
    update: { status: "connected", displayName: identity.username },
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

async function doPublish(
  account: { provider: string; providerAccountId: string; displayName: string | null },
  accessTokenEncrypted: string,
  text: string,
) {
  const accessToken = decryptSecret(accessTokenEncrypted);

  switch (account.provider) {
    case "linkedin": {
      const result = await publishLinkedInTextPost({ accessToken, memberId: account.providerAccountId, text });
      return { postUrn: result.postUrn, postUrl: result.postUrl };
    }
    case "facebook": {
      const result = await publishFacebookPagePost({
        pageId: account.providerAccountId,
        pageAccessToken: accessToken,
        text,
      });
      return { postUrn: result.postId, postUrl: result.postUrl };
    }
    case "x": {
      const result = await publishXPost({
        accessToken,
        username: account.displayName ?? account.providerAccountId,
        text,
      });
      return { postUrn: result.tweetId, postUrl: result.postUrl };
    }
    default:
      throw new Error(`Publishing isn't implemented for provider "${account.provider}"`);
  }
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

async function doPublishVideo(
  account: { provider: string; providerAccountId: string; displayName: string | null },
  accessTokenEncrypted: string,
  fileBuffer: Buffer,
  mimeType: string,
  description?: string,
) {
  switch (account.provider) {
    case "facebook": {
      const accessToken = decryptSecret(accessTokenEncrypted);
      const result = await publishFacebookPageVideo({
        pageId: account.providerAccountId,
        pageAccessToken: accessToken,
        fileBuffer,
        mimeType,
        description,
      });
      return { postUrn: result.postId, postUrl: result.postUrl };
    }
    default:
      throw new Error(`Video publishing isn't implemented yet for "${account.provider}" (text posts work there today).`);
  }
}

/**
 * Publishes a rendered video to every connected account for the given
 * organization. Each account is attempted independently -- one account's
 * failure (including providers that don't support video yet) never blocks
 * the others, so callers get a per-account result list rather than an
 * all-or-nothing outcome.
 */
export async function publishSocialVideo(input: {
  organizationId: string;
  videoProjectId: string;
  fileBuffer: Buffer;
  mimeType: string;
  description?: string;
  actorUserId: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.CONTENT_PUBLISH);

  const accounts = await prisma.connectedAccount.findMany({
    where: { organizationId: input.organizationId, status: "connected" },
    include: { oauthToken: true },
  });

  const results: { provider: string; account: string; status: "published" | "failed"; postUrl?: string; reason?: string }[] = [];

  for (const account of accounts) {
    if (!account.oauthToken) continue;

    const post = await prisma.socialPost.create({
      data: {
        organizationId: input.organizationId,
        videoProjectId: input.videoProjectId,
        connectedAccountId: account.id,
        provider: account.provider,
        body: input.description ?? "",
        status: "publishing",
        idempotencyKey: crypto.randomUUID(),
        attempts: 1,
        createdByUserId: input.actorUserId,
      },
    });

    try {
      const result = await doPublishVideo(account, account.oauthToken.accessTokenEncrypted, input.fileBuffer, input.mimeType, input.description);
      await prisma.socialPost.update({
        where: { id: post.id },
        data: { status: "published", providerPostId: result.postUrn, providerPostUrl: result.postUrl },
      });
      results.push({ provider: account.provider, account: account.displayName ?? account.providerAccountId, status: "published", postUrl: result.postUrl });

      await writeAuditLog({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: "social.video_published",
        targetType: "SocialPost",
        targetId: post.id,
        metadata: { provider: account.provider, providerPostId: result.postUrn },
      });
    } catch (err) {
      const reason = errorMessage(err);
      await prisma.socialPost.update({ where: { id: post.id }, data: { status: "failed", failureReason: reason } });
      results.push({ provider: account.provider, account: account.displayName ?? account.providerAccountId, status: "failed", reason });
    }
  }

  return results;
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
