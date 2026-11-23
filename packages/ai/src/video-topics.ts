import { z } from "zod";
import { generateJson } from "./generate";
import type { BrandBrief } from "./strategy";

const TopicsSchema = z.object({ topics: z.array(z.string()).min(1).max(8) });

const SYSTEM_PROMPT = `You suggest short-form marketing video topics for a brand. Hard rules:
- Each topic is a single short sentence (under 15 words) describing what the video would be about
  -- specific and concrete, never vague ("boost your business").
- Base suggestions only on the brand information given. Never invent products, features, offers,
  or claims not given to you.
- Vary the angle across topics: a common customer pain point, how the product/service solves it,
  a behind-the-scenes/process angle, a results-or-outcome angle, an announcement angle.
- Respond with a single JSON object matching the required schema exactly. No prose outside JSON.`;

function buildPrompt(brand: BrandBrief): string {
  const lines = [
    `Brand name: ${brand.name}`,
    brand.industry ? `Industry: ${brand.industry}` : null,
    brand.description ? `Description: ${brand.description}` : null,
    brand.valueProposition ? `Value proposition: ${brand.valueProposition}` : null,
    brand.tone ? `Brand tone: ${brand.tone}` : null,
    brand.targetAudience ? `Target audience: ${brand.targetAudience}` : null,
  ].filter(Boolean);

  return ["Suggest 5 short-form marketing video topics for this brand.", ...lines].join("\n");
}

export async function generateVideoTopicSuggestions(brand: BrandBrief) {
  const result = await generateJson({
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(brand),
    schema: TopicsSchema,
  });

  return { ...result, data: result.data.topics };
}
