import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { resolvePublicAsset, NotFoundError } from "@growthpilot/core";

/**
 * Unauthenticated by design -- Instagram's own servers fetch media by public
 * URL, not an authenticated session. Access is instead gated by a short-lived
 * signed token (see getPublicAssetUrl in @growthpilot/core), scoped to one
 * specific asset id and expiring in 30 minutes.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  try {
    const { filePath, mimeType } = await resolvePublicAsset(id, token);
    const data = await fs.readFile(filePath);
    return new NextResponse(data, { headers: { "Content-Type": mimeType, "Cache-Control": "private, max-age=60" } });
  } catch (err) {
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
