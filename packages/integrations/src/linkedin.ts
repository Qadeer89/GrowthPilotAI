// LinkedIn connector -- the only place this codebase talks to LinkedIn's
// API directly. Endpoints/headers verified against LinkedIn's current
// official docs (OAuth 2.0 authorization-code flow + the Posts API, which
// replaced the deprecated UGC Posts API) before writing this, not guessed.
const AUTH_BASE = "https://www.linkedin.com/oauth/v2";
const API_BASE = "https://api.linkedin.com";

// LinkedIn requires a YYYYMM version header on every /rest/* call, and
// retires versions roughly a year after release. Override via env once
// this one sunsets (docs noted 202611 is current; check
// https://learn.microsoft.com/en-us/linkedin/marketing/integrations/migrations
// for the live status table).
const LINKEDIN_API_VERSION = process.env.LINKEDIN_API_VERSION ?? "202611";

type LinkedInConfig = { clientId: string; clientSecret: string; redirectUri: string };

function config(): LinkedInConfig {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI ?? "http://localhost:3000/api/auth/linkedin/callback";
  if (!clientId || !clientSecret) {
    throw new Error("LINKEDIN_CLIENT_ID/LINKEDIN_CLIENT_SECRET are not configured in apps/web/.env.local");
  }
  return { clientId, clientSecret, redirectUri };
}

export function buildLinkedInAuthorizationUrl(state: string): string {
  const { clientId, redirectUri } = config();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    // openid+profile identify the member (needed to construct the author
    // URN for posting); w_member_social is the actual posting permission.
    scope: "openid profile w_member_social",
  });
  return `${AUTH_BASE}/authorization?${params.toString()}`;
}

export type LinkedInTokenResult = { accessToken: string; expiresInSeconds: number; scope: string };

export async function exchangeLinkedInCode(code: string): Promise<LinkedInTokenResult> {
  const { clientId, clientSecret, redirectUri } = config();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  const response = await fetch(`${AUTH_BASE}/accessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`LinkedIn token exchange failed (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number; scope: string };
  return { accessToken: data.access_token, expiresInSeconds: data.expires_in, scope: data.scope };
}

export type LinkedInIdentity = { memberId: string; name: string | null };

export async function fetchLinkedInIdentity(accessToken: string): Promise<LinkedInIdentity> {
  const response = await fetch(`${API_BASE}/v2/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`LinkedIn userinfo failed (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as { sub: string; name?: string };
  return { memberId: data.sub, name: data.name ?? null };
}

export type LinkedInPublishResult = { postUrn: string; postUrl: string };

export async function publishLinkedInTextPost(input: {
  accessToken: string;
  memberId: string;
  text: string;
}): Promise<LinkedInPublishResult> {
  const response = await fetch(`${API_BASE}/rest/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
      "Linkedin-Version": LINKEDIN_API_VERSION,
    },
    body: JSON.stringify({
      author: `urn:li:person:${input.memberId}`,
      commentary: input.text,
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`LinkedIn post failed (${response.status}): ${await response.text()}`);
  }

  // A successful create returns 201 with an empty body -- the new post's
  // URN comes back only in this header, per LinkedIn's docs.
  const postUrn = response.headers.get("x-restli-id");
  if (!postUrn) {
    throw new Error("LinkedIn accepted the post but returned no x-restli-id header");
  }

  return { postUrn, postUrl: `https://www.linkedin.com/feed/update/${encodeURIComponent(postUrn)}/` };
}
