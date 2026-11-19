import { z } from "zod";
import { generateJson } from "./generate";

// The model doesn't always honor exact casing/shape for enum-ish fields (e.g.
// "High" instead of "high", or an array instead of a joined string) even when
// told to. Parse loosely, then normalize by hand below rather than rejecting a
// response over a cosmetic mismatch — this also keeps the exported
// GeneratedStrategy type exact (zod's preprocess-based inference is not
// reliable for this).
const RawStrategySchema = z.object({
  positioning: z.string(),
  personas: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      painPoints: z.array(z.string()),
      goals: z.array(z.string()),
    }),
  ),
  messagingPillars: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    }),
  ),
  recommendations: z.array(
    z.object({
      recommendation: z.string(),
      reason: z.string(),
      evidenceType: z.union([z.string(), z.array(z.string())]),
      evidence: z.string(),
      targetAudience: z.union([z.string(), z.array(z.string())]),
      suggestedChannel: z.union([z.string(), z.array(z.string())]),
      priority: z.union([z.string(), z.array(z.string())]),
      estimatedEffort: z.union([z.string(), z.array(z.string())]),
      successMetric: z.string(),
      timeframeDays: z.union([z.number(), z.string()]),
    }),
  ),
  plan30: z.string(),
  plan60: z.string(),
  plan90: z.string(),
});

function normalizeString(val: string | string[]): string {
  return Array.isArray(val) ? val.join(", ") : val;
}

function normalizeEnum<T extends string>(val: string | string[], values: readonly T[]): T {
  const normalized = (Array.isArray(val) ? val.join(", ") : val).toLowerCase();
  const match = values.find((v) => v === normalized);
  if (!match) {
    throw new Error(`AI response used an unrecognized value "${normalized}" (expected one of: ${values.join(", ")})`);
  }
  return match;
}

function normalizeTimeframeDays(val: number | string): 30 | 60 | 90 {
  const n = typeof val === "string" ? parseInt(val, 10) : val;
  if (!Number.isFinite(n)) {
    throw new Error(`AI response used a non-numeric timeframeDays value "${val}"`);
  }
  // The model doesn't always land exactly on 30/60/90 (e.g. 45) even when told
  // to. Snap to the nearest bucket rather than rejecting the whole response.
  const buckets = [30, 60, 90] as const;
  return buckets.reduce((closest, b) => (Math.abs(b - n) < Math.abs(closest - n) ? b : closest));
}

export type GeneratedStrategy = {
  positioning: string;
  personas: {
    name: string;
    description: string;
    painPoints: string[];
    goals: string[];
  }[];
  messagingPillars: { title: string; description: string }[];
  recommendations: {
    recommendation: string;
    reason: string;
    evidenceType: "verified" | "assumption";
    evidence: string;
    targetAudience: string;
    suggestedChannel: string;
    priority: "high" | "medium" | "low";
    estimatedEffort: "low" | "medium" | "high";
    successMetric: string;
    timeframeDays: 30 | 60 | 90;
  }[];
  plan30: string;
  plan60: string;
  plan90: string;
};

function normalizeStrategy(raw: z.infer<typeof RawStrategySchema>): GeneratedStrategy {
  return {
    ...raw,
    recommendations: raw.recommendations.map((r) => ({
      ...r,
      evidenceType: normalizeEnum(r.evidenceType, ["verified", "assumption"] as const),
      targetAudience: normalizeString(r.targetAudience),
      suggestedChannel: normalizeString(r.suggestedChannel),
      priority: normalizeEnum(r.priority, ["high", "medium", "low"] as const),
      estimatedEffort: normalizeEnum(r.estimatedEffort, ["low", "medium", "high"] as const),
      timeframeDays: normalizeTimeframeDays(r.timeframeDays),
    })),
  };
}

export type BrandBrief = {
  name: string;
  website?: string | null;
  industry?: string | null;
  description?: string | null;
  valueProposition?: string | null;
  targetAudience?: string | null;
  targetCountries: string[];
  tone?: string | null;
  languages: string[];
  monthlyBudget?: number | null;
};

const SYSTEM_PROMPT = `You are a senior marketing strategist producing a structured plan for a
B2B/B2C brand. Hard rules:
- Never invent real competitor performance numbers, market sizes, or audience statistics.
  Anything not explicitly given to you is an assumption, not a fact — mark it "assumption" in
  evidenceType, and say so plainly in the evidence text (e.g. "Assumption: typical for this
  industry, not verified against real data").
- Only mark evidenceType "verified" when it's a direct restatement of information given to you
  about this specific brand.
- Every recommendation must include a reason, evidence, target audience, suggested channel,
  priority, estimated effort, and a success metric.
- Never use an em dash (—) or en dash (–) in any text field. Use a period, comma, colon, or
  parentheses instead.
- Respond with a single JSON object matching the required schema exactly. No prose outside JSON.`;

function buildPrompt(brand: BrandBrief): string {
  const lines = [
    `Brand name: ${brand.name}`,
    brand.website ? `Website: ${brand.website}` : null,
    brand.industry ? `Industry: ${brand.industry}` : null,
    brand.description ? `Description: ${brand.description}` : null,
    brand.valueProposition ? `Value proposition: ${brand.valueProposition}` : null,
    brand.targetAudience ? `Target audience (as described by the brand): ${brand.targetAudience}` : null,
    brand.targetCountries.length ? `Target countries: ${brand.targetCountries.join(", ")}` : null,
    brand.tone ? `Brand tone: ${brand.tone}` : null,
    brand.languages.length ? `Languages: ${brand.languages.join(", ")}` : null,
    brand.monthlyBudget ? `Monthly marketing budget: ${brand.monthlyBudget}` : null,
  ].filter(Boolean);

  return [
    "Generate a marketing strategy for this brand based only on the information below.",
    ...lines,
    "",
    "Return JSON with: positioning (string), personas (array of {name, description, painPoints[], goals[]}),",
    "messagingPillars (array of {title, description}), recommendations (array of {recommendation, reason,",
    "evidenceType, evidence, targetAudience, suggestedChannel, priority, estimatedEffort, successMetric,",
    "timeframeDays}), and plan30/plan60/plan90 (narrative strings describing what happens in each window).",
  ].join("\n");
}

export async function generateMarketingStrategy(brand: BrandBrief) {
  const result = await generateJson({
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(brand),
    schema: RawStrategySchema,
  });

  return { ...result, data: normalizeStrategy(result.data) };
}
