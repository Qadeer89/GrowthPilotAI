import type { ZodType } from "zod";
import { getModel, getOpenAiClient } from "./client";
import type { AiJsonResult, AiTextResult } from "./types";

// The model doesn't reliably follow the "no em/en dash" system prompt rule,
// so this is enforced deterministically on every generated text as a safety
// net rather than relying on the prompt alone.
function stripDashes(text: string): string {
  return text.replace(/\s*[—–]\s*/g, ", ");
}

export async function generateText(input: {
  system: string;
  prompt: string;
  temperature?: number;
}): Promise<AiTextResult> {
  const client = getOpenAiClient();
  const model = getModel();

  const response = await client.chat.completions.create({
    model,
    temperature: input.temperature ?? 0.7,
    messages: [
      { role: "system", content: input.system },
      { role: "user", content: input.prompt },
    ],
  });

  const text = stripDashes(response.choices[0]?.message?.content ?? "");

  return {
    text,
    model,
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  };
}

/**
 * JSON-mode generation validated against a zod schema. Throws if the model's
 * output doesn't parse or doesn't match the schema — callers should not
 * silently fall back to fabricated data on a shape mismatch.
 */
export async function generateJson<T>(input: {
  system: string;
  prompt: string;
  schema: ZodType<T>;
  temperature?: number;
}): Promise<AiJsonResult<T>> {
  const client = getOpenAiClient();
  const model = getModel();

  const response = await client.chat.completions.create({
    model,
    temperature: input.temperature ?? 0.5,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: input.system },
      { role: "user", content: input.prompt },
    ],
  });

  const raw = stripDashes(response.choices[0]?.message?.content ?? "{}");
  const parsed = JSON.parse(raw);
  const data = input.schema.parse(parsed);

  return {
    data,
    model,
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  };
}
