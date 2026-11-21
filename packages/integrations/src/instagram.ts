// Instagram connector -- Instagram publishing only exists through the
// Instagram Graph API, which is reached via a Facebook Page that has an
// Instagram professional (Business/Creator) account linked to it. There is
// no separate Instagram app/login: this reuses the same Meta app and OAuth
// flow as facebook.ts, just with a different Configuration (so it can
// request instagram_basic/instagram_content_publish without touching the
// Facebook Page config) and a step that resolves each Page's linked IG
// account instead of just the Page itself.
const FB_API_VERSION = process.env.FACEBOOK_API_VERSION ?? "v21.0";
const AUTH_BASE = `https://www.facebook.com/${FB_API_VERSION}/dialog/oauth`;
const GRAPH_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;

type InstagramConfig = { appId: string; appSecret: string; redirectUri: string };

function config(): InstagramConfig {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const redirectUri =
    process.env.INSTAGRAM_REDIRECT_URI ?? "http://localhost:3000/api/auth/instagram/callback";
  if (!appId || !appSecret) {
    throw new Error("FACEBOOK_APP_ID/FACEBOOK_APP_SECRET are not configured in apps/web/.env.local");
  }
  return { appId, appSecret, redirectUri };
}

export function buildInstagramAuthorizationUrl(state: string): string {
  const { appId, redirectUri } = config();
  const configId = process.env.INSTAGRAM_CONFIG_ID;
  if (!configId) {
    throw new Error("INSTAGRAM_CONFIG_ID is not configured in apps/web/.env.local");
  }
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    config_id: configId,
  });
  return `${AUTH_BASE}?${params.toString()}`;
}

async function exchangeCodeForUserToken(code: string): Promise<string> {
  const { appId, appSecret, redirectUri } = config();
  const params = new URLSearchParams({ client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code });

  const response = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Instagram token exchange failed (${response.status}): ${await response.text()}`);
  }
  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

async function exchangeForLongLivedUserToken(shortLivedToken: string): Promise<string> {
  const { appId, appSecret } = config();
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Instagram long-lived token exchange failed (${response.status}): ${await response.text()}`);
  }
  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

export type InstagramAccount = { igUserId: string; username: string; pageAccessToken: string };

/** Only Pages with a linked Instagram professional account are returned. */
export async function listInstagramAccounts(code: string): Promise<InstagramAccount[]> {
  const shortLivedToken = await exchangeCodeForUserToken(code);
  const userToken = await exchangeForLongLivedUserToken(shortLivedToken);

  const permsResponse = await fetch(`${GRAPH_BASE}/me/permissions?access_token=${encodeURIComponent(userToken)}`);
  const permsData = await permsResponse.json().catch(() => null);
  console.error("[instagram-debug] granted permissions:", JSON.stringify(permsData));

  const directPageCheck = await fetch(
    `${GRAPH_BASE}/1344202022220358?fields=name,instagram_business_account{id,username}&access_token=${encodeURIComponent(userToken)}`,
  );
  console.error("[instagram-debug] direct page check status:", directPageCheck.status, "body:", await directPageCheck.clone().text());

  const response = await fetch(
    `${GRAPH_BASE}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${encodeURIComponent(userToken)}`,
  );
  if (!response.ok) {
    throw new Error(`Instagram account list failed (${response.status}): ${await response.text()}`);
  }
  const data = (await response.json()) as {
    data: { id: string; name: string; access_token: string; instagram_business_account?: { id: string; username: string } }[];
  };

  console.error(
    "[instagram-debug] pages returned:",
    JSON.stringify(data.data.map((p) => ({ id: p.id, name: p.name, instagram_business_account: p.instagram_business_account ?? null }))),
  );

  return data.data
    .filter((p): p is typeof p & { instagram_business_account: { id: string; username: string } } =>
      Boolean(p.instagram_business_account),
    )
    .map((p) => ({
      igUserId: p.instagram_business_account.id,
      username: p.instagram_business_account.username,
      pageAccessToken: p.access_token,
    }));
}

export type InstagramPublishResult = { postId: string; postUrl: string };

/**
 * Instagram's Graph API only accepts media by public URL (image_url /
 * video_url) -- it has no raw-binary upload endpoint like Facebook Pages
 * do, so the caller must already have the asset reachable at a public URL.
 */
export async function publishInstagramPost(input: {
  igUserId: string;
  pageAccessToken: string;
  mediaUrl: string;
  mediaType: "IMAGE" | "VIDEO";
  caption?: string;
}): Promise<InstagramPublishResult> {
  const createParams = new URLSearchParams({
    access_token: input.pageAccessToken,
    ...(input.mediaType === "VIDEO" ? { video_url: input.mediaUrl, media_type: "REELS" } : { image_url: input.mediaUrl }),
    ...(input.caption ? { caption: input.caption } : {}),
  });

  const createResponse = await fetch(`${GRAPH_BASE}/${input.igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: createParams.toString(),
  });
  if (!createResponse.ok) {
    throw new Error(`Instagram media container failed (${createResponse.status}): ${await createResponse.text()}`);
  }
  const { id: creationId } = (await createResponse.json()) as { id: string };

  const publishResponse = await fetch(`${GRAPH_BASE}/${input.igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ creation_id: creationId, access_token: input.pageAccessToken }).toString(),
  });
  if (!publishResponse.ok) {
    throw new Error(`Instagram publish failed (${publishResponse.status}): ${await publishResponse.text()}`);
  }
  const { id: mediaId } = (await publishResponse.json()) as { id: string };

  return { postId: mediaId, postUrl: `https://www.instagram.com/p/${mediaId}` };
}
