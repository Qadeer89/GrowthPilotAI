import { prisma } from "@growthpilot/db";
import { NotFoundError } from "./errors";
import { resolveAssetFile } from "./storage";
import { createPublicAssetToken, verifyPublicAssetToken } from "./crypto";

/**
 * Instagram's publish API only accepts media by public URL. Creative assets
 * otherwise live behind an authenticated route, so this mints a short-lived
 * signed URL at the unauthenticated /api/public-assets route that Instagram's
 * own servers can fetch once, before the token expires.
 *
 * Lives in its own module (not creative.ts) so integrations.ts can import it
 * without a circular dependency, since creative.ts already imports from
 * integrations.ts.
 */
export function getPublicAssetUrl(organizationId: string, assetId: string): string {
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  const token = createPublicAssetToken(organizationId, assetId, expiresAt);
  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
  return `${base}/api/public-assets/${assetId}?token=${encodeURIComponent(token)}`;
}

export async function resolvePublicAsset(assetId: string, token: string) {
  const verified = verifyPublicAssetToken(token, assetId);
  if (!verified) throw new NotFoundError("Asset not found or link expired");

  const asset = await prisma.creativeAsset.findFirst({
    where: { id: assetId, organizationId: verified.organizationId },
  });
  if (!asset || asset.status !== "completed" || !asset.storageKey) {
    throw new NotFoundError("Asset not found or not ready");
  }

  return {
    filePath: resolveAssetFile(verified.organizationId, asset.storageKey),
    mimeType: asset.mimeType ?? "application/octet-stream",
  };
}
