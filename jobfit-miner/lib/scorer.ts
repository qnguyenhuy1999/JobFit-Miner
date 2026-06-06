import OpenAI from "openai";
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

type CompletionMessage = {
  parsed?: unknown;
  content?: string | Array<{ type?: string; text?: string | { value?: string } }>;
};

type CompletionLike = {
  choices?: Array<{
    message?: CompletionMessage;
  }>;
};

function extractTextContent(content: CompletionMessage["content"]) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;

  const text = content
    .map((part) => {
      if (typeof part?.text === "string") return part.text;
      if (typeof part?.text?.value === "string") return part.text.value;
      return "";
    })
    .join("")
    .trim();

  return text || null;
}

function parseStructuredOutput<T>(completion: CompletionLike, schema?: z.ZodType<T>): T {
  const message = completion.choices?.[0]?.message;
  if (message?.parsed != null) {
    return schema ? schema.parse(message.parsed) : (message.parsed as T);
  }

  const rawContent = extractTextContent(message?.content);
  if (!rawContent) {
    throw new Error("No structured result returned by model");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    throw new Error("No structured result returned by model");
  }

  return schema ? schema.parse(parsed) : (parsed as T);
}

export const __testables = {
  parseStructuredOutput,
};

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

  const completion = await client.chat.completions.create({
    model: "glm-4.7-flash",
    messages: [
      {
        role: "user",
        content: `Rate how well this job matches the candidate profile. Return valid JSON only with this shape: {"score": number, "reason": string}. Score must be an integer from 0 to 100.

        Candidate profile:
        ${profile}

        Job:
        Title: ${job.title}
        Company: ${job.company ?? "Unknown"}
        Location: ${job.location ?? "Unknown"}
        Description: ${job.description ?? "No description"}`,
      },
    ],
  });

  return parseStructuredOutput(completion, ScoreSchema);
}

export async function generateCoverLetter(
  profile: string,
  job: { title: string; company?: string | null; description?: string | null },
): Promise<string> {
  const client = getClient();
  if (!client) return generateCoverLetterLocally(profile, job);

  const completion = await client.chat.completions.create({
    model: "glm-4.7-flash",
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
