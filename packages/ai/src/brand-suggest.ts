import { z } from "zod";
import { generateJson } from "./generate";

const BrandSuggestionSchema = z.object({
  industry: z.string(),
  targetAudience: z.string(),
  tone: z.string(),
  targetCountries: z.array(z.string()),
  languages: z.array(z.string()),
  valueProposition: z.string(),
  description: z.string(),
});

export type BrandSuggestion = z.infer<typeof BrandSuggestionSchema>;

export type BrandSuggestionInput = {
  name: string;
  website?: string | null;
  description?: string | null;
};

const SYSTEM_PROMPT = `You are a marketing analyst helping a user fill out a new brand profile.
Hard rules:
- Base your answer only on the brand name, website, and description given to you.
- Never invent specific facts you cannot know (exact revenue, exact customer counts, named
  competitors) -- these are reasonable starting-point suggestions for the user to review and
  edit, not verified facts.
- Keep answers concise and practical.
- Never use an em dash (—) or en dash (–) in any text field. Use a period, comma, colon, or
  parentheses instead.
- Respond with a single JSON object matching the required schema exactly. No prose outside JSON.`;

function buildPrompt(input: BrandSuggestionInput): string {
  const lines = [
    `Brand name: ${input.name}`,
    input.website ? `Website: ${input.website}` : null,
    input.description ? `Description so far: ${input.description}` : null,
  ].filter(Boolean);

  return [
    "Suggest a starting-point brand profile for this brand based only on the information below.",
    ...lines,
    "",
    'Return JSON with: industry (string, a short common industry label), targetAudience (one',
    'sentence), tone (string, e.g. "Professional and friendly"), targetCountries (array of',
    "country names, 1-5), languages (array of language names, 1-3), valueProposition (one",
    "sentence), and description (2-3 sentences describing what the brand does).",
  ].join("\n");
}

export async function suggestBrandProfile(input: BrandSuggestionInput) {
  return generateJson({
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(input),
    schema: BrandSuggestionSchema,
  });
}
