import { prisma } from "@growthpilot/db";

// Public, unauthenticated by design -- this is what a VPS process manager
// (PM2) or an uptime monitor hits to decide whether the app is actually
// serving requests. A real DB round-trip is the check: a process that is
// "up" but can't reach Postgres is not actually healthy.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", database: "ok", timestamp: new Date().toISOString() });
  } catch (err) {
    return Response.json(
      { status: "error", database: "unreachable", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 503 },
    );
  }
}
