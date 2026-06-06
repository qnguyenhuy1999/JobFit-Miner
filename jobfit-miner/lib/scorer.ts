import OpenAI from "openai";
import { z } from "zod";
import {
  type CompletionLike,
  parseStructuredCompletion,
} from "./ai-completion.ts";

const ScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  reason: z.string(),
});

const CoverLetterSchema = z.object({
  coverLetter: z.string(),
});

function tokenize(text: string) {
  const aliases: Record<string, string> = {
    reactjs: "react",
    "react.js": "react",
    nextjs: "next",
    "next.js": "next",
    nodejs: "node",
    "node.js": "node",
    typescript: "ts",
    javascript: "js",
    postgresql: "postgres",
    "full-stack": "fullstack",
  };
  const stopWords = new Set([
    "and",
    "the",
    "for",
    "with",
    "from",
    "this",
    "that",
    "your",
    "their",
    "into",
    "over",
    "well",
    "years",
    "year",
    "city",
    "viet",
    "nam",
    "vietnam",
    "remote",
    "office",
    "hybrid",
    "full",
    "stack",
    "developer",
    "engineer",
    "senior",
    "junior",
    "lead",
    "chi",
    "minh",
    "noi",
    "nang",
    "based",
  ]);

  return (text.toLowerCase().match(/[a-z0-9+#./-]+/g) ?? [])
    .map((token) => aliases[token] ?? token)
    .filter((token) => token.length > 1 && !stopWords.has(token));
}

function buildKeywordSet(text: string) {
  return new Set(tokenize(text));
}

function scoreLocally(
  profile: string,
  job: {
    title: string;
    company?: string | null;
    location?: string | null;
    description?: string | null;
  },
  expectations?: string,
): ScoreResult {
  const profileTerms = buildKeywordSet(profile);
  const expectationTerms = buildKeywordSet(expectations ?? "");
  const jobText = [job.title, job.company, job.location, job.description]
    .filter(Boolean)
    .join(" ");
  const jobTerms = tokenize(jobText);
  const titleTerms = tokenize(job.title);
  const matches = [...new Set(jobTerms)].filter((term) =>
    profileTerms.has(term),
  );
  const expectationMatches = [...new Set(jobTerms)].filter((term) =>
    expectationTerms.has(term),
  );
  const titleMatches = [...new Set(titleTerms)].filter((term) =>
    profileTerms.has(term),
  );
  const baseScore =
    25 + matches.length * 8 + titleMatches.length * 10 + expectationMatches.length * 6;
  const score =
    jobTerms.length === 0 ? 35 : Math.max(20, Math.min(96, baseScore));
  const reason = [
    `JD evaluation: ${score >= 70 ? "strong" : score >= 40 ? "partial" : "low"} expectation fit.`,
    matches.length > 0
      ? `Profile alignment: shared skills include ${matches.slice(0, 8).join(", ")}.`
      : "Profile alignment: limited keyword overlap with your saved profile.",
    expectationMatches.length > 0
      ? `Expectation match: the JD reflects ${expectationMatches.slice(0, 6).join(", ")}.`
      : "Expectation match: add clearer expectations to improve this evaluation.",
  ].join(" ");

  return { score, reason };
}

function generateCoverLetterLocally(
  profile: string,
  job: { title: string; company?: string | null; description?: string | null },
) {
  const company = job.company ?? "your company";
  const profileSummary = profile.trim().replace(/\s+/g, " ").slice(0, 280);
  const jobSummary = (job.description ?? "the role requirements")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 240);

  return `Dear Hiring Team at ${company},

I am applying for the ${job.title} role. My background includes ${profileSummary || "relevant software engineering experience"}, and I believe that foundation aligns well with what you are seeking.

From the job description, I am particularly drawn to ${jobSummary}. I can contribute with practical execution, clear communication, and a strong focus on delivering reliable results in a team environment.

Thank you for your time and consideration. I would welcome the opportunity to discuss how my experience can support ${company}'s goals.`;
}

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL?.trim() || undefined;
  if (!apiKey) return null;
  return new OpenAI({ apiKey, baseURL });
}

export type ScoreResult = z.infer<typeof ScoreSchema>;
export type CoverLetterResult = z.infer<typeof CoverLetterSchema>;

function parseStructuredOutput<T>(
  completion: CompletionLike,
  schema?: z.ZodType<T>,
): T {
  return parseStructuredCompletion(completion, schema);
}

export const __testables = {
  parseStructuredOutput,
  buildScorePrompt,
};

async function callWithRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const is429 =
        err instanceof Error &&
        (err.message.includes("429") || err.message.includes("concurrent"));
      if (is429 && i < retries - 1) {
        await new Promise((r) => setTimeout(r, 5000 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

export async function scoreJob(
  profile: string,
  job: {
    title: string;
    company?: string | null;
    location?: string | null;
    description?: string | null;
  },
  expectations?: string,
): Promise<ScoreResult> {
  const client = getClient();
  if (!client) return scoreLocally(profile, job, expectations);

  const completion = await callWithRetry(() =>
    client.chat.completions.create({
      model: "kr/claude-haiku-4.5",
      messages: [
        {
          role: "user",
          content: buildScorePrompt(profile, job, expectations),
        },
      ],
    }),
  );

  return parseStructuredOutput(completion, ScoreSchema);
}

function buildScorePrompt(
  profile: string,
  job: {
    title: string;
    company?: string | null;
    location?: string | null;
    description?: string | null;
  },
  expectations?: string,
) {
  return `Evaluate this JD against the candidate profile and candidate expectations. Return valid JSON only with this shape: {"score": number, "reason": string}. Score must be an integer from 0 to 100.

The reason must be a concise JD evaluation, not a generic summary. Include:
- expectation fit: whether the JD matches what the candidate wants
- profile alignment: strongest matching skills or experience
- gaps or risks: missing skills, seniority mismatch, unclear role scope, or weak JD evidence
- next action: why this job should be applied to, reviewed, or ignored

Candidate profile:
${profile}

Candidate expectations:
${expectations?.trim() || "Use the candidate profile as the expectation baseline."}

Job:
Title: ${job.title}
Company: ${job.company ?? "Unknown"}
Location: ${job.location ?? "Unknown"}
Description: ${job.description ?? "No description"}`;
}

export async function generateCoverLetter(
  profile: string,
  job: { title: string; company?: string | null; description?: string | null },
): Promise<string> {
  const client = getClient();
  if (!client) return generateCoverLetterLocally(profile, job);

  const completion = await client.chat.completions.create({
    model: "kr/claude-haiku-4.5",
    messages: [
      {
        role: "user",
        content: `Write a concise, professional cover letter (3 paragraphs) for this job application. Return valid JSON only with this shape: {"coverLetter": string}.

        Candidate profile:
        ${profile}

        Job:
        Title: ${job.title}
        Company: ${job.company ?? "Unknown"}
        Description: ${job.description ?? "No description"}`,
      },
    ],
  });

  const result = parseStructuredOutput(completion, CoverLetterSchema);
  return result.coverLetter;
}
