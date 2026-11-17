import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCreativeAssetFile, getPrimaryOrganizationForUser, NotFoundError } from "@growthpilot/core";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return NextResponse.json({ error: "No organization found" }, { status: 403 });

  const { id } = await params;

  try {
    const { filePath, mimeType } = await getCreativeAssetFile(context.organization.id, id, session.user.id);
    const data = await fs.readFile(filePath);
    return new NextResponse(data, { headers: { "Content-Type": mimeType, "Cache-Control": "private, max-age=3600" } });
  } catch (err) {
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
