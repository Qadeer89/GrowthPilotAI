import { generateText } from "./generate";
import type { BrandBrief } from "./strategy";

export const CONTENT_TYPES = [
  "social_post",
  "blog_article",
  "email",
  "ad_copy",
  "landing_page_copy",
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export type ContentBrief = {
  contentType: ContentType;
  platform?: string | null;
  audience?: string | null;
  tone?: string | null;
  topic: string;
  keywords?: string | null;
  cta?: string | null;
};

const SYSTEM_PROMPT = `You are a marketing copywriter writing on behalf of a specific brand.
Hard rules:
- Only state product features, pricing, or results that were explicitly given to you about the
  brand. Never invent customer testimonials, reviews, case studies, or performance numbers.
- Match the requested tone, audience, and content type exactly.
- Output only the content itself — no preamble like "Here is your post", no markdown headers
  unless the content type is a blog article (then normal markdown headings are fine).`;

function buildPrompt(brand: BrandBrief, brief: ContentBrief): string {
  const lines = [
    `Brand: ${brand.name}`,
    brand.description ? `About the brand: ${brand.description}` : null,
    brand.valueProposition ? `Value proposition: ${brand.valueProposition}` : null,
    brand.tone ? `Default brand tone: ${brand.tone}` : null,
    "",
    `Content type: ${brief.contentType}`,
    brief.platform ? `Platform: ${brief.platform}` : null,
    brief.audience ? `Target audience: ${brief.audience}` : null,
    brief.tone ? `Requested tone for this piece: ${brief.tone}` : null,
    `Topic / brief: ${brief.topic}`,
    brief.keywords ? `Keywords to include where natural: ${brief.keywords}` : null,
    brief.cta ? `Call to action: ${brief.cta}` : null,
  ].filter(Boolean);

  return lines.join("\n");
}

export async function generateContentDraft(brand: BrandBrief, brief: ContentBrief) {
  return generateText({
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(brand, brief),
  });
}
