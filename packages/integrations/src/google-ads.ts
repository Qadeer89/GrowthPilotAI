// Google Ads connector -- the only place this codebase talks to Google Ads'
// API directly. Endpoints/headers verified against Google's current official
// REST docs (developers.google.com/google-ads/api/rest/*) before writing
// this, not guessed. Current API version per those docs: v26.
//
// Note on the developer-token header: the fetched REST auth/examples pages
// (as of this writing) show only Authorization + login-customer-id on their
// curl examples and don't mention developer-token at all, which may mean
// Google has moved access control to the Cloud project itself (Test/Explorer
// access, see the API Center / Cloud Console). We still send
// `developer-token` defensively -- it's been a universal Ads API requirement
// for years, an extra header is harmless if unused, and omitting it risks
// every call failing outright if it's still required. If Google's error
// response says otherwise, drop it.
const API_VERSION = "v26";
const ADS_API_BASE = `https://googleads.googleapis.com/${API_VERSION}`;
const OAUTH_TOKEN_URL = "https://www.googleapis.com/oauth2/v3/token";
const OAUTH_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const ADWORDS_SCOPE = "https://www.googleapis.com/auth/adwords";

type GoogleAdsConfig = { clientId: string; clientSecret: string; redirectUri: string; developerToken: string };

function config(): GoogleAdsConfig {
  const clientId = process.env.GOOGLE_ADS_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_OAUTH_CLIENT_SECRET;
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const redirectUri =
    process.env.GOOGLE_ADS_REDIRECT_URI ?? "http://localhost:3000/api/auth/google-ads/callback";
  if (!clientId || !clientSecret || !developerToken) {
    throw new Error(
      "GOOGLE_ADS_OAUTH_CLIENT_ID/GOOGLE_ADS_OAUTH_CLIENT_SECRET/GOOGLE_ADS_DEVELOPER_TOKEN are not configured in apps/web/.env.local",
    );
  }
  return { clientId, clientSecret, redirectUri, developerToken };
}

export function buildGoogleAdsAuthorizationUrl(state: string): string {
  const { clientId, redirectUri } = config();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: ADWORDS_SCOPE,
    // offline + consent guarantee a refresh_token comes back even on a
    // repeat consent from the same Google account.
    access_type: "offline",
    prompt: "consent",
  });
  return `${OAUTH_AUTH_BASE}?${params.toString()}`;
}

export type GoogleAdsTokenResult = { accessToken: string; refreshToken: string | null; expiresInSeconds: number };

export async function exchangeGoogleAdsCode(code: string): Promise<GoogleAdsTokenResult> {
  const { clientId, clientSecret, redirectUri } = config();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  const response = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Google OAuth code exchange failed (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  return { accessToken: data.access_token, refreshToken: data.refresh_token ?? null, expiresInSeconds: data.expires_in };
}

export async function refreshGoogleAdsAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresInSeconds: number }> {
  const { clientId, clientSecret } = config();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Google OAuth token refresh failed (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  return { accessToken: data.access_token, expiresInSeconds: data.expires_in };
}

function authHeaders(accessToken: string, loginCustomerId?: string): Record<string, string> {
  const { developerToken } = config();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
    "developer-token": developerToken,
  };
  if (loginCustomerId) headers["login-customer-id"] = loginCustomerId;
  return headers;
}

export async function listAccessibleGoogleAdsCustomers(accessToken: string): Promise<string[]> {
  const response = await fetch(`${ADS_API_BASE}/customers:listAccessibleCustomers`, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Google Ads listAccessibleCustomers failed (${response.status}): ${await response.text()}`);
  }
  const data = (await response.json()) as { resourceNames?: string[] };
  // "customers/1234567890" -> "1234567890"
  return (data.resourceNames ?? []).map((rn) => rn.split("/")[1]).filter(Boolean);
}

export type CreateGoogleAdsCampaignInput = {
  accessToken: string;
  loginCustomerId?: string;
  customerId: string; // digits only, no hyphens
  name: string;
  dailyBudgetMicros: bigint;
};

export type CreateGoogleAdsCampaignResult = {
  campaignBudgetResourceName: string;
  campaignResourceName: string;
};

// Creates a CampaignBudget + a SEARCH Campaign in one atomic bulk mutate,
// per Google's recommended pattern (temp resource names -1/-2 link them).
// The campaign is always created PAUSED -- this connector never creates a
// campaign that can serve/spend without a separate, explicit enable call.
export async function createGoogleAdsCampaign(
  input: CreateGoogleAdsCampaignInput,
): Promise<CreateGoogleAdsCampaignResult> {
  const body = {
    mutateOperations: [
      {
        campaignBudgetOperation: {
          create: {
            resourceName: `customers/${input.customerId}/campaignBudgets/-1`,
            name: `${input.name} Budget`,
            deliveryMethod: "STANDARD",
            amountMicros: input.dailyBudgetMicros.toString(),
            explicitlyShared: false,
          },
        },
      },
      {
        campaignOperation: {
          create: {
            resourceName: `customers/${input.customerId}/campaigns/-2`,
            name: input.name,
            advertisingChannelType: "SEARCH",
            status: "PAUSED",
            manualCpc: {},
            campaignBudget: `customers/${input.customerId}/campaignBudgets/-1`,
            networkSettings: {
              targetGoogleSearch: true,
              targetSearchNetwork: true,
              targetContentNetwork: false,
              targetPartnerSearchNetwork: false,
            },
            containsEuPoliticalAdvertising: "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING",
          },
        },
      },
    ],
  };

  const response = await fetch(`${ADS_API_BASE}/customers/${input.customerId}/googleAds:mutate`, {
    method: "POST",
    headers: authHeaders(input.accessToken, input.loginCustomerId),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Google Ads campaign create failed (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as {
    mutateOperationResponses: Array<{
      campaignBudgetResult?: { resourceName: string };
      campaignResult?: { resourceName: string };
    }>;
  };

  const campaignBudgetResourceName = data.mutateOperationResponses[0]?.campaignBudgetResult?.resourceName;
  const campaignResourceName = data.mutateOperationResponses[1]?.campaignResult?.resourceName;
  if (!campaignBudgetResourceName || !campaignResourceName) {
    throw new Error(`Google Ads campaign create returned an unexpected response shape: ${JSON.stringify(data)}`);
  }

  return { campaignBudgetResourceName, campaignResourceName };
}

export type GoogleAdsCampaignStatus = { id: string; name: string; status: string };

// Reads the campaign's status back from Google Ads itself -- the caller must
// never assume a mutate response implies the campaign is actually in the
// state requested; this is the confirmation step.
export async function fetchGoogleAdsCampaignStatus(input: {
  accessToken: string;
  loginCustomerId?: string;
  customerId: string;
  campaignResourceName: string;
}): Promise<GoogleAdsCampaignStatus | null> {
  const query = `SELECT campaign.id, campaign.name, campaign.status FROM campaign WHERE campaign.resource_name = '${input.campaignResourceName}'`;

  const response = await fetch(`${ADS_API_BASE}/customers/${input.customerId}/googleAds:search`, {
    method: "POST",
    headers: authHeaders(input.accessToken, input.loginCustomerId),
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`Google Ads campaign status query failed (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as {
    results?: Array<{ campaign: { id: string; name: string; status: string } }>;
  };
  const row = data.results?.[0];
  if (!row) return null;
  return { id: row.campaign.id, name: row.campaign.name, status: row.campaign.status };
}

// Emergency stop -- pauses a campaign that was already created/enabled in
// Google Ads. Idempotent: pausing an already-paused campaign just succeeds.
export async function pauseGoogleAdsCampaign(input: {
  accessToken: string;
  loginCustomerId?: string;
  customerId: string;
  campaignResourceName: string;
}): Promise<void> {
  const response = await fetch(`${ADS_API_BASE}/customers/${input.customerId}/campaigns:mutate`, {
    method: "POST",
    headers: authHeaders(input.accessToken, input.loginCustomerId),
    body: JSON.stringify({
      operations: [
        {
          updateMask: "status",
          update: { resourceName: input.campaignResourceName, status: "PAUSED" },
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Ads campaign pause failed (${response.status}): ${await response.text()}`);
  }
}
