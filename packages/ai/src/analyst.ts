import { z } from "zod";
import { generateJson } from "./generate";
import type { BrandBrief } from "./strategy";

export type AnalyticsMetricInput = {
  channel: string;
  metricKey: string;
  value: number | null;
  dataQuality: "provider_reported" | "estimated" | "attributed" | "missing";
  note?: string;
};

const AnalystResponseSchema = z.object({
  summary: z.string(),
  answer: z.string(),
  dataGaps: z.array(z.string()),
  recommendations: z.array(z.string()),
});

export type AnalystResponse = z.infer<typeof AnalystResponseSchema>;

// Hard rule: the model only ever sees metrics that are already real and
// already labeled with a data_quality flag (spec Section 10) -- it is never
// asked to estimate a number itself, only to explain or caveat what's given.
const SYSTEM_PROMPT = `You are an honest marketing analyst. You are given a brand profile, a question, and a list of real metrics, each already labeled with a data_quality flag:
- "provider_reported": a real number from a connected provider or this app's own database.
- "estimated": a derived/calculated number.
- "attributed": tied to a channel via attribution logic.
- "missing": no real data exists yet, with a reason given.

Hard rules:
- Never invent or guess a number. Only cite values that literally appear in the metrics list, with their exact data_quality label attached whenever you cite them.
- If the question asks about something not covered by the metrics (e.g. ROI with no spend data, or a channel with no data at all), say so plainly in dataGaps instead of estimating or speaking as if the data exists.
- Base recommendations only on what the real data actually shows, or mark them as "not yet verifiable" when the underlying data is missing.
- Return strict JSON matching the schema, nothing else.`;

function buildPrompt(input: { brand: BrandBrief; question: string; metrics: AnalyticsMetricInput[] }): string {
  const metricsText = input.metrics
    .map(
      (m) =>
        `- [${m.channel}] ${m.metricKey} = ${m.value === null ? "null" : m.value} (data_quality: ${m.dataQuality}${m.note ? `, note: ${m.note}` : ""})`,
    )
    .join("\n");

  return [
    `Brand: ${input.brand.name}`,
    input.brand.industry ? `Industry: ${input.brand.industry}` : null,
    input.brand.description ? `Description: ${input.brand.description}` : null,
    "",
    "Real available metrics (use ONLY these, with their data_quality labels):",
    metricsText || "(no metrics available at all)",
    "",
    `Question: ${input.question}`,
    "",
    'Respond as JSON: { "summary": string, "answer": string, "dataGaps": string[], "recommendations": string[] }',
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

export async function askMarketingAnalyst(input: {
  brand: BrandBrief;
  question: string;
  metrics: AnalyticsMetricInput[];
}) {
  return generateJson({
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(input),
    schema: AnalystResponseSchema,
  });
}
