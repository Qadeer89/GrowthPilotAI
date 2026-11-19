import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { appUrl } from "@/lib/url";
import { getXAuthorizationUrl } from "@growthpilot/core";
import { createPkcePair } from "@growthpilot/integrations";

const STATE_COOKIE = "x_oauth_state";
const VERIFIER_COOKIE = "x_oauth_verifier";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(appUrl("/login"));

  const state = crypto.randomUUID();
  const { codeVerifier, codeChallenge } = createPkcePair();

  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/" });
  cookieStore.set(VERIFIER_COOKIE, codeVerifier, { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/" });

  return NextResponse.redirect(getXAuthorizationUrl(state, codeChallenge));
}
