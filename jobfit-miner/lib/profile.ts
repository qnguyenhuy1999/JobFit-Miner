import OpenAI from "openai";
import { z } from "zod";
import { parseStructuredCompletion } from "./ai-completion.ts";

const CvProfileSchema = z.object({
  summary: z.string().min(1),
});

export type CvProfileResult = z.infer<typeof CvProfileSchema>;

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL?.trim() || undefined;
  if (!apiKey) return null;
  return new OpenAI({ apiKey, baseURL });
}

function cleanCvText(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/\b(phone|email|portfolio|linkedin|github)\b\s*:/i.test(line))
    .filter((line) => !/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(line))
    .filter((line) => !/https?:\/\/\S+/i.test(line))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function summarizeCvLocally(text: string) {
  const cleaned = cleanCvText(text);
  if (!cleaned) return "";

  const sentences = cleaned
    .split(/(?<=[.!?])\s+|\s{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
  const summary = sentences.length > 0 ? sentences.slice(0, 6).join(" ") : cleaned;

  return summary.slice(0, 1200).trim();
}

function buildCvProfilePrompt(cvText: string) {
  return `Read this CV and return valid JSON only with this shape: {"summary": string}.

The summary will be reused for job fit scoring and cover letter generation. Make it concise but specific:
- current or target role
- years of experience when available
- core technical skills
- strongest domains or responsibilities
- notable achievements
- candidate expectations only if clearly present

Do not include private contact details like phone, email, address, or links.

CV:
${cvText}`;
}

export async function extractProfileFromCv(text: string): Promise<CvProfileResult> {
  const cleaned = cleanCvText(text);
  if (!cleaned) throw new Error("CV text is empty");

  const client = getClient();
  if (!client) return { summary: summarizeCvLocally(cleaned) };

  const completion = await client.chat.completions.create({
    model: "kr/claude-haiku-4.5",
    messages: [
      {
        role: "user",
        content: buildCvProfilePrompt(cleaned),
      },
    ],
  });

  return parseStructuredCompletion(completion, CvProfileSchema);
}

export const __testables = {
  buildCvProfilePrompt,
  cleanCvText,
  summarizeCvLocally,
};
