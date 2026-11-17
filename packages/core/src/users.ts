import bcrypt from "bcryptjs";
import { prisma } from "@growthpilot/db";
import { ConflictError } from "./errors";

const BCRYPT_ROUNDS = 12;

export async function createUser(input: { email: string; password: string; name?: string }) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ConflictError("An account with this email already exists");

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  return prisma.user.create({
    data: { email: input.email, passwordHash, name: input.name },
  });
}

export async function verifyUserPassword(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  return valid ? user : null;
}
