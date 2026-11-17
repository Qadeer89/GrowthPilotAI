import { getOpenAiClient } from "./client";

// "gpt-image-1" isn't available on every account (some need separate org
// verification); gpt-image-1-mini is broadly available and far cheaper.
const IMAGE_MODEL = "gpt-image-1-mini";
const IMAGE_SIZE = "1024x1024";

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

export async function generateImage(prompt: string): Promise<GeneratedImage> {
  const client = getOpenAiClient();

  const response = await client.images.generate({
    model: IMAGE_MODEL,
    prompt,
    size: IMAGE_SIZE,
    n: 1,
  });

  const base64 = response.data?.[0]?.b64_json;
  if (!base64) {
    throw new Error("OpenAI image generation returned no image data");
  }

  return { base64, model: IMAGE_MODEL, estimatedCostUsd: ESTIMATED_COST_USD };
}
