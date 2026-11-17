"use server";

import { redirect } from "next/navigation";
import { createOrganizationWithOwner, createUser, createWorkspace } from "@growthpilot/core";
import { signIn } from "@/lib/auth";

export type SignupResult = { error: string } | undefined;

export async function signupAction(_prev: SignupResult, formData: FormData): Promise<SignupResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const companyName = String(formData.get("companyName") ?? "").trim();

  if (!name || !email || !password || !companyName) {
    return { error: "All fields are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  try {
    const user = await createUser({ email, password, name });
    const organization = await createOrganizationWithOwner({ name: companyName, ownerUserId: user.id });
    await createWorkspace({
      organizationId: organization.id,
      actorUserId: user.id,
      name: "Default",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create account.";
    return { error: message };
  }

  await signIn("credentials", { email, password, redirect: false });
  redirect("/dashboard");
}
