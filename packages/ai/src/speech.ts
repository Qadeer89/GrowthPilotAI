import { getOpenAiClient } from "./client";

const TTS_MODEL = "tts-1";
const VOICE = "alloy";

// Published OpenAI tts-1 pricing is $15 per 1M characters ($0.000015/char).
// Like the image cost estimate, this is derived from published per-unit
// pricing, not a provider-confirmed billed amount.
const COST_USD_PER_CHAR = 15 / 1_000_000;

export type GeneratedSpeech = {
  base64: string;
  model: string;
  estimatedCostUsd: number;
};

export async function generateSpeech(text: string): Promise<GeneratedSpeech> {
  const client = getOpenAiClient();

  const response = await client.audio.speech.create({
    model: TTS_MODEL,
    voice: VOICE,
    input: text,
    response_format: "mp3",
  });

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  return {
    base64,
    model: TTS_MODEL,
    estimatedCostUsd: text.length * COST_USD_PER_CHAR,
  };
}
