import { z } from "zod";
import { generateJson } from "./generate";
import type { BrandBrief } from "./strategy";

// A single available tool the agent can plan to use. requiresApproval is
// informational for the prompt only -- the caller (packages/core/src/agent.ts)
// never trusts anything the model says about approval; it looks up
// requiresApproval from its own server-side registry for the toolName the
// model picked.
export type AgentToolDescriptor = {
  name: string;
  description: string;
  inputShape: string; // human-readable, shown to the model
  requiresApproval: boolean;
};

const PlanStepSchema = z.object({
  toolName: z.string(),
  input: z.record(z.string(), z.unknown()),
  reason: z.string(),
});

const PlanSchema = z.object({
  steps: z.array(PlanStepSchema),
});

export type AgentPlanStep = z.infer<typeof PlanStepSchema>;

const SYSTEM_PROMPT = `You are a marketing operations planner. Given a natural-language request and a
catalog of available tools, produce an ordered list of tool calls that fulfills the request.
Hard rules:
- Only use tool names from the provided catalog, exactly as spelled. Never invent a tool name.
- Never include any internal IDs (account IDs, campaign IDs, database IDs) in a tool's input --
  you don't have access to those; the system wires steps together automatically.
- A tool that creates something paid (spends real money) must be a separate step from one that
  only drafts it -- never skip straight to a paid action without a preceding draft step.
- Keep the plan to the minimum steps that fulfill the request.
- Respond with a single JSON object: { "steps": [{ "toolName", "input", "reason" }, ...] }. No prose outside JSON.`;

function buildPrompt(requestText: string, brand: BrandBrief, tools: AgentToolDescriptor[]): string {
  const toolLines = tools.map(
    (t) => `- ${t.name}${t.requiresApproval ? " (PAID -- requires human approval before it runs)" : ""}: ${t.description} Input: ${t.inputShape}`,
  );

  return [
    `Brand: ${brand.name}${brand.industry ? ` (${brand.industry})` : ""}`,
    brand.description ? `Description: ${brand.description}` : null,
    brand.targetAudience ? `Target audience: ${brand.targetAudience}` : null,
    "",
    "Available tools:",
    ...toolLines,
    "",
    `Request: ${requestText}`,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

export async function generateAgentPlan(input: {
  requestText: string;
  brand: BrandBrief;
  tools: AgentToolDescriptor[];
}) {
  const result = await generateJson({
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(input.requestText, input.brand, input.tools),
    schema: PlanSchema,
  });
  return result;
}
