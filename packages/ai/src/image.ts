import { getOpenAiClient } from "./client";

// gpt-image-1 (full) isn't available on this OpenAI account (returns "model
// does not exist" -- needs separate org verification not yet done);
// gpt-image-1-mini is what's actually usable, so quality improvements have
// to come from prompting instead of the pricier model for now.
const IMAGE_MODEL = "gpt-image-1-mini";
const IMAGE_SIZE = "1024x1024";
const IMAGE_QUALITY = "high";

// OpenAI's image API doesn't return a per-call cost. This is a static
// estimate from published per-image pricing at this size/quality tier, kept
// here so callers can record *something* into usage/cost tracking rather
// than nothing — it is explicitly an estimate, never a provider-confirmed
// billed amount.
const ESTIMATED_COST_USD = 0.01;

export type GeneratedImage = {
  base64: string;
  model: string;
  estimatedCostUsd: number;
};

// Prepended to every image prompt so scenes read as shot by a professional
// marketing photographer/videographer rather than generic stock-art or
// cartoonish AI renders -- the video script's own visualPrompt still carries
// the subject/composition, this just sets the production-quality bar.
const STYLE_PREFIX =
  "Professional marketing photography, shot on a high-end camera, natural lighting, " +
  "realistic textures and depth of field, polished commercial advertising quality, " +
  "no cartoonish or illustrated style, no text or logos in the image. Scene: ";

export async function generateImage(prompt: string): Promise<GeneratedImage> {
  const client = getOpenAiClient();

  const response = await client.images.generate({
    model: IMAGE_MODEL,
    prompt: `${STYLE_PREFIX}${prompt}`,
    size: IMAGE_SIZE,
    quality: IMAGE_QUALITY,
    n: 1,
  });

  const base64 = response.data?.[0]?.b64_json;
  if (!base64) {
    throw new Error("OpenAI image generation returned no image data");
  }

  return { base64, model: IMAGE_MODEL, estimatedCostUsd: ESTIMATED_COST_USD };
}
