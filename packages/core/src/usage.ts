import { prisma } from "@growthpilot/db";
import { requireMembership } from "./rbac";

export async function recordUsage(entry: {
  organizationId: string;
  workspaceId?: string;
  feature: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  createdByUserId?: string;
}) {
  await prisma.usageRecord.create({
    data: {
      organizationId: entry.organizationId,
      workspaceId: entry.workspaceId,
      feature: entry.feature,
      provider: entry.provider,
      model: entry.model,
      inputTokens: entry.inputTokens,
      outputTokens: entry.outputTokens,
      createdByUserId: entry.createdByUserId,
    },
  });
}

export async function getUsageSummary(organizationId: string, actorUserId: string) {
  await requireMembership(organizationId, actorUserId);

  const records = await prisma.usageRecord.findMany({ where: { organizationId } });

  const totals = records.reduce(
    (acc, r) => {
      acc.calls += 1;
      acc.inputTokens += r.inputTokens;
      acc.outputTokens += r.outputTokens;
      return acc;
    },
    { calls: 0, inputTokens: 0, outputTokens: 0 },
  );

  return totals;
}
