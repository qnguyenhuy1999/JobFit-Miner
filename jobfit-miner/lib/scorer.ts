import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const ScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  reason: z.string(),
});

const CoverLetterSchema = z.object({
  coverLetter: z.string(),
});

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
  return new OpenAI({ apiKey });
}

export type ScoreResult = z.infer<typeof ScoreSchema>;
export type CoverLetterResult = z.infer<typeof CoverLetterSchema>;

export async function scoreJob(
  profile: string,
  job: { title: string; company?: string | null; location?: string | null; description?: string | null }
): Promise<ScoreResult> {
  const client = getClient();

  const completion = await client.chat.completions.parse({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "user",
        content: `Rate how well this job matches the candidate profile. Score 0-100.

Candidate profile:
${profile}

Job:
Title: ${job.title}
Company: ${job.company ?? "Unknown"}
Location: ${job.location ?? "Unknown"}
Description: ${job.description ?? "No description"}`,
      },
    ],
    response_format: zodResponseFormat(ScoreSchema, "score_result"),
  });

  const result = completion.choices[0].message.parsed;
  if (!result) throw new Error("No parsed result from OpenAI");
  return result;
}

export async function generateCoverLetter(
  profile: string,
  job: { title: string; company?: string | null; description?: string | null }
): Promise<string> {
  const client = getClient();

  const completion = await client.chat.completions.parse({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "user",
        content: `Write a concise, professional cover letter (3 paragraphs) for this job application.

Candidate profile:
${profile}

Job:
Title: ${job.title}
Company: ${job.company ?? "Unknown"}
Description: ${job.description ?? "No description"}`,
      },
    ],
    response_format: zodResponseFormat(CoverLetterSchema, "cover_letter_result"),
  });

  const result = completion.choices[0].message.parsed;
  if (!result) throw new Error("No parsed result from OpenAI");
  return result.coverLetter;
}
