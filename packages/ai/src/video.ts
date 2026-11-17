import { z } from "zod";
import { generateJson } from "./generate";
import type { BrandBrief } from "./strategy";

const RawVideoScriptSchema = z.object({
  script: z.string(),
  scenes: z.array(
    z.object({
      narration: z.string(),
      visualPrompt: z.string(),
    }),
  ),
});

export type VideoScene = {
  order: number;
  narration: string;
  visualPrompt: string;
};

export type VideoScript = {
  script: string;
  scenes: VideoScene[];
};

const SYSTEM_PROMPT = `You are a video scriptwriter producing a short-form marketing video (30-60
seconds) for a brand. Hard rules:
- Never invent real statistics, customer testimonials, or claims not given to you about the brand.
- Break the video into 3 to 6 scenes. Each scene needs:
  - narration: one or two spoken sentences (this is read aloud as voiceover, so write it to be
    spoken, not read).
  - visualPrompt: a description of the shot for an AI image generator. Describe composition,
    subject, and mood. Never ask for on-image text or logos — image models render text poorly.
- "script" is the full narration (all scenes' narration lines joined in order) as a single string.
- Respond with a single JSON object matching the required schema exactly. No prose outside JSON.`;

function buildPrompt(brand: BrandBrief, topic: string): string {
  const lines = [
    `Brand name: ${brand.name}`,
    brand.industry ? `Industry: ${brand.industry}` : null,
    brand.description ? `Description: ${brand.description}` : null,
    brand.valueProposition ? `Value proposition: ${brand.valueProposition}` : null,
    brand.tone ? `Brand tone: ${brand.tone}` : null,
    brand.targetAudience ? `Target audience: ${brand.targetAudience}` : null,
    `Video topic / brief: ${topic}`,
  ].filter(Boolean);

  return [
    "Write a short marketing video script for this brand based only on the information below.",
    ...lines,
  ].join("\n");
}

export async function generateVideoScript(brand: BrandBrief, topic: string) {
  const result = await generateJson({
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(brand, topic),
    schema: RawVideoScriptSchema,
  });

  const data: VideoScript = {
    script: result.data.script,
    scenes: result.data.scenes.map((s, i) => ({ order: i + 1, ...s })),
  };

  return { ...result, data };
}
