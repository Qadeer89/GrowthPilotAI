// Meta (Facebook Pages) connector -- the only place this codebase talks to
// the Graph API directly. Endpoints verified against Meta's current docs
// (Facebook Login for Business authorization-code flow, long-lived token
// exchange, Page access tokens via /me/accounts, and the Page Feed publish
// endpoint) before writing this, not guessed.
const FB_API_VERSION = process.env.FACEBOOK_API_VERSION ?? "v21.0";
const AUTH_BASE = `https://www.facebook.com/${FB_API_VERSION}/dialog/oauth`;
const GRAPH_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;

type FacebookConfig = { appId: string; appSecret: string; redirectUri: string };

function config(): FacebookConfig {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const redirectUri =
    process.env.FACEBOOK_REDIRECT_URI ?? "http://localhost:3000/api/auth/facebook/callback";
  if (!appId || !appSecret) {
    throw new Error("FACEBOOK_APP_ID/FACEBOOK_APP_SECRET are not configured in apps/web/.env.local");
  }
  return { appId, appSecret, redirectUri };
}

export function buildFacebookAuthorizationUrl(state: string): string {
  const { appId, redirectUri } = config();
  const configId = process.env.FACEBOOK_CONFIG_ID;
  if (!configId) {
    throw new Error("FACEBOOK_CONFIG_ID is not configured in apps/web/.env.local");
  }
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    // This app uses Facebook Login for Business: permissions are bundled
    // into a Configuration (created in the App Dashboard) rather than
    // passed as a raw "scope" list.
    config_id: configId,
  });
  return `${AUTH_BASE}?${params.toString()}`;
}

async function exchangeCodeForUserToken(code: string): Promise<string> {
  const { appId, appSecret, redirectUri } = config();
  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Facebook token exchange failed (${response.status}): ${await response.text()}`);
  }
  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

/** Short-lived user tokens expire in ~2h; exchange for a ~60-day token before listing Pages. */
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
    throw new Error(`Facebook long-lived token exchange failed (${response.status}): ${await response.text()}`);
  }
  const data = (await response.json()) as { access_token: string; expires_in?: number };
  return data.access_token;
}

export type FacebookPage = { pageId: string; name: string; accessToken: string };

/** Page tokens minted from a long-lived user token are themselves long-lived (no separate expiry). */
export async function listFacebookPages(code: string): Promise<FacebookPage[]> {
  const shortLivedToken = await exchangeCodeForUserToken(code);
  const userToken = await exchangeForLongLivedUserToken(shortLivedToken);

  const response = await fetch(
    `${GRAPH_BASE}/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(userToken)}`,
  );
  if (!response.ok) {
    throw new Error(`Facebook page list failed (${response.status}): ${await response.text()}`);
  }
  const data = (await response.json()) as { data: { id: string; name: string; access_token: string }[] };
  return data.data.map((p) => ({ pageId: p.id, name: p.name, accessToken: p.access_token }));
}

export type FacebookPublishResult = { postId: string; postUrl: string };

export async function publishFacebookPagePost(input: {
  pageId: string;
  pageAccessToken: string;
  text: string;
}): Promise<FacebookPublishResult> {
  const response = await fetch(`${GRAPH_BASE}/${input.pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ message: input.text, access_token: input.pageAccessToken }).toString(),
  });

  if (!response.ok) {
    throw new Error(`Facebook post failed (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as { id: string };
  return { postId: data.id, postUrl: `https://www.facebook.com/${data.id}` };
}
