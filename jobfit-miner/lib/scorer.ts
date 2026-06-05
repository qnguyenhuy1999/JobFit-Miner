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
): ScoreResult {
  const profileTerms = buildKeywordSet(profile);
  const jobText = [job.title, job.company, job.location, job.description]
    .filter(Boolean)
    .join(" ");
  const jobTerms = tokenize(jobText);
  const titleTerms = tokenize(job.title);
  const matches = [...new Set(jobTerms)].filter((term) =>
    profileTerms.has(term),
  );
  const titleMatches = [...new Set(titleTerms)].filter((term) =>
    profileTerms.has(term),
  );
  const baseScore = 25 + matches.length * 8 + titleMatches.length * 10;
  const score =
    jobTerms.length === 0 ? 35 : Math.max(20, Math.min(96, baseScore));
  const reason =
    matches.length > 0
      ? `Local fallback score based on shared keywords: ${matches.slice(0, 8).join(", ")}.`
      : "Local fallback score based on limited keyword overlap between your profile and this job.";

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

export async function scoreJob(
  profile: string,
  job: {
    title: string;
    company?: string | null;
    location?: string | null;
    description?: string | null;
  },
): Promise<ScoreResult> {
  const client = getClient();
  if (!client) return scoreLocally(profile, job);

  const completion = await client.chat.completions.parse({
    model: "glm-4.7-flash",
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
  job: { title: string; company?: string | null; description?: string | null },
): Promise<string> {
  const client = getClient();
  if (!client) return generateCoverLetterLocally(profile, job);

  const completion = await client.chat.completions.parse({
    model: "glm-4.7-flash",
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
    response_format: zodResponseFormat(
      CoverLetterSchema,
      "cover_letter_result",
    ),
  });

  const result = completion.choices[0].message.parsed;
  if (!result) throw new Error("No parsed result from OpenAI");
  return result.coverLetter;
}
