export type AiUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
};

export type AiTextResult = AiUsage & { text: string };
export type AiJsonResult<T> = AiUsage & { data: T };
