import crypto from "node:crypto";

// X (Twitter) connector -- the only place this codebase talks to the X API
// directly. OAuth 2.0 Authorization Code flow with PKCE + the v2 Tweets
// endpoint, verified against X's current developer docs before writing
// this, not guessed.
const AUTH_BASE = "https://x.com/i/oauth2/authorize";
const TOKEN_URL = "https://api.x.com/2/oauth2/token";
const API_BASE = "https://api.x.com/2";

type XConfig = { clientId: string; clientSecret: string; redirectUri: string };

function config(): XConfig {
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  const redirectUri = process.env.X_REDIRECT_URI ?? "http://localhost:3000/api/auth/x/callback";
  if (!clientId || !clientSecret) {
    throw new Error("X_CLIENT_ID/X_CLIENT_SECRET are not configured in apps/web/.env.local");
  }
  return { clientId, clientSecret, redirectUri };
}

function base64url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function createPkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = base64url(crypto.randomBytes(32));
  const codeChallenge = base64url(crypto.createHash("sha256").update(codeVerifier).digest());
  return { codeVerifier, codeChallenge };
}

export function buildXAuthorizationUrl(state: string, codeChallenge: string): string {
  const { clientId, redirectUri } = config();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    // offline.access requests a refresh token; not used yet (no refresh
    // flow implemented), but keeps the door open without a reconnect flow.
    scope: "tweet.read tweet.write users.read offline.access",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `${AUTH_BASE}?${params.toString()}`;
}

export type XTokenResult = { accessToken: string; expiresInSeconds: number; scope: string };

export async function exchangeXCode(code: string, codeVerifier: string): Promise<XTokenResult> {
  const { clientId, clientSecret, redirectUri } = config();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`X token exchange failed (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number; scope: string };
  return { accessToken: data.access_token, expiresInSeconds: data.expires_in, scope: data.scope };
}

export type XIdentity = { userId: string; username: string };

export async function fetchXIdentity(accessToken: string): Promise<XIdentity> {
  const response = await fetch(`${API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`X users/me failed (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as { data: { id: string; username: string } };
  return { userId: data.data.id, username: data.data.username };
}

export type XPublishResult = { tweetId: string; postUrl: string };

export async function publishXPost(input: { accessToken: string; username: string; text: string }): Promise<XPublishResult> {
  const response = await fetch(`${API_BASE}/tweets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: input.text }),
  });

  if (!response.ok) {
    throw new Error(`X post failed (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as { data: { id: string } };
  return { tweetId: data.data.id, postUrl: `https://x.com/${input.username}/status/${data.data.id}` };
}

const MEDIA_UPLOAD_URL = "https://api.x.com/2/media/upload";
const CHUNK_SIZE_BYTES = 4 * 1024 * 1024;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * X's chunked media upload (INIT/APPEND/FINALIZE, then poll STATUS until
 * processing finishes) via the v2 endpoint, which accepts the same OAuth 2.0
 * user-context Bearer token this codebase already has -- no separate
 * OAuth 1.0a credentials needed.
 */
async function uploadXVideo(accessToken: string, fileBuffer: Buffer, mimeType: string): Promise<string> {
  const initResponse = await fetch(MEDIA_UPLOAD_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      command: "INIT",
      total_bytes: fileBuffer.byteLength,
      media_type: mimeType,
      media_category: "tweet_video",
    }),
  });
  if (!initResponse.ok) {
    throw new Error(`X media upload init failed (${initResponse.status}): ${await initResponse.text()}`);
  }
  const { data: initData } = (await initResponse.json()) as { data: { id: string } };
  const mediaId = initData.id;

  let segmentIndex = 0;
  for (let offset = 0; offset < fileBuffer.byteLength; offset += CHUNK_SIZE_BYTES) {
    const chunk = fileBuffer.subarray(offset, offset + CHUNK_SIZE_BYTES);
    const form = new FormData();
    form.append("command", "APPEND");
    form.append("media_id", mediaId);
    form.append("segment_index", String(segmentIndex));
    form.append("media", new Blob([new Uint8Array(chunk)]));

    const appendResponse = await fetch(MEDIA_UPLOAD_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });
    if (!appendResponse.ok) {
      throw new Error(`X media upload append failed (${appendResponse.status}): ${await appendResponse.text()}`);
    }
    segmentIndex += 1;
  }

  const finalizeResponse = await fetch(MEDIA_UPLOAD_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ command: "FINALIZE", media_id: mediaId }),
  });
  if (!finalizeResponse.ok) {
    throw new Error(`X media upload finalize failed (${finalizeResponse.status}): ${await finalizeResponse.text()}`);
  }
  let finalizeData = (await finalizeResponse.json()) as {
    data: { id: string; processing_info?: { state: string; check_after_secs?: number } };
  };

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const state = finalizeData.data.processing_info?.state;
    if (!state || state === "succeeded") break;
    if (state === "failed") {
      throw new Error(`X media processing failed for media ${mediaId}`);
    }
    await sleep((finalizeData.data.processing_info?.check_after_secs ?? 1) * 1000);
    const statusResponse = await fetch(`${MEDIA_UPLOAD_URL}?command=STATUS&media_id=${encodeURIComponent(mediaId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!statusResponse.ok) {
      throw new Error(`X media upload status check failed (${statusResponse.status}): ${await statusResponse.text()}`);
    }
    finalizeData = (await statusResponse.json()) as typeof finalizeData;
  }

  return mediaId;
}

export async function publishXVideoPost(input: {
  accessToken: string;
  username: string;
  text: string;
  fileBuffer: Buffer;
  mimeType: string;
}): Promise<XPublishResult> {
  const mediaId = await uploadXVideo(input.accessToken, input.fileBuffer, input.mimeType);

  const response = await fetch(`${API_BASE}/tweets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: input.text, media: { media_ids: [mediaId] } }),
  });

  if (!response.ok) {
    throw new Error(`X video post failed (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as { data: { id: string } };
  return { tweetId: data.data.id, postUrl: `https://x.com/${input.username}/status/${data.data.id}` };
}
