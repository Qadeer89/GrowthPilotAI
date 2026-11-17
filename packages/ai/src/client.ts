import OpenAI from "openai";

let client: OpenAI | null = null;

/**
 * The only place packages/ai talks to the OpenAI SDK directly. Every
 * feature (strategy, content) goes through generateJson/generateText below
 * instead of importing `openai` itself — per spec Section 2.3/17, no UI or
 * route handler calls a provider SDK directly.
 */
export function getOpenAiClient(): OpenAI {
  if (client) return client;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Set it in apps/web/.env.local before using AI features.",
    );
  }

  client = new OpenAI({
    apiKey,
    // Node's native fetch + this SDK's stream handling intermittently throws
    // "Premature close" while decompressing larger gzip/br response bodies
    // (reproduced outside Next.js too, on Node 24). Requesting an
    // uncompressed body sidesteps the race entirely.
    defaultHeaders: { "Accept-Encoding": "identity" },
  });
  return client;
}

export function getModel(): string {
  return process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
}
