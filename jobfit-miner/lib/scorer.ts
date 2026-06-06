import OpenAI from "openai";
import { z } from "zod";
import {
  type CompletionLike,
  parseStructuredCompletion,
} from "./ai-completion.ts";

const TriState = z.union([z.boolean(), z.literal("unknown")]);

const AnalysisSchema = z.object({
  score: z.number().int().min(0).max(100),
  fitLevel: z.enum(["strong", "partial", "low"]),
  reason: z.string(),
  matchedSkills: z.array(z.string()).default([]),
  missingSkills: z.array(z.string()).default([]),
  expectationMatches: z.record(z.string(), TriState).default({}),
  redFlags: z.array(z.string()).default([]),
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
): AnalysisResult {
  const profileTerms = buildKeywordSet(profile);
  const expectationTerms = buildKeywordSet(expectations ?? "");
  const jobText = [job.title, job.company, job.location, job.description]
    .filter(Boolean)
    .join(" ");
  const jobTerms = tokenize(jobText);
  const titleTerms = tokenize(job.title);
  const matched = [...new Set(jobTerms)].filter((t) => profileTerms.has(t));
  const expectMatched = [...new Set(jobTerms)].filter((t) => expectationTerms.has(t));
  const titleMatches = [...new Set(titleTerms)].filter((t) => profileTerms.has(t));
  const baseScore = 25 + matched.length * 8 + titleMatches.length * 10 + expectMatched.length * 6;
  const score = jobTerms.length === 0 ? 35 : Math.max(20, Math.min(96, baseScore));
  const fitLevel: AnalysisResult["fitLevel"] = score >= 70 ? "strong" : score >= 40 ? "partial" : "low";

  const profileSet = new Set(tokenize(profile));
  const allJobTokens = new Set(jobTerms);
  const missingSkills = [...profileSet].filter((t) => !allJobTokens.has(t)).slice(0, 6);

  const reason = [
    `Local fallback: ${fitLevel} fit.`,
    matched.length > 0
      ? `Shared skills: ${matched.slice(0, 8).join(", ")}.`
      : "Limited keyword overlap with profile.",
    expectMatched.length > 0
      ? `Expectation terms found: ${expectMatched.slice(0, 6).join(", ")}.`
      : "Add expectations to improve evaluation.",
  ].join(" ");

  return {
    score,
    fitLevel,
    reason,
    matchedSkills: matched.slice(0, 10),
    missingSkills,
    expectationMatches: {},
    redFlags: [],
  };
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

export type AnalysisResult = z.infer<typeof AnalysisSchema>;
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
): Promise<AnalysisResult> {
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

  return parseStructuredOutput(completion, AnalysisSchema);
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
  return `Evaluate this JD against the candidate profile and candidate expectations. Return valid JSON only with this exact shape:
{
  "score": number (0-100),
  "fitLevel": "strong"|"partial"|"low",
  "reason": string,
  "matchedSkills": string[],
  "missingSkills": string[],
  "expectationMatches": { "remote": true|false|"unknown", "hybrid": true|false|"unknown", "socialInsurance": true|false|"unknown", "salary": true|false|"unknown" },
  "redFlags": string[]
}

Rules:
- score is an integer 0–100
- fitLevel: "strong" if score>=70, "partial" if 40-69, "low" otherwise
- reason: concise JD evaluation covering expectation fit, profile alignment, gaps/risks, next action
- matchedSkills: skills from the profile found in the JD
- missingSkills: skills in the profile not mentioned in the JD
- expectationMatches: use true/false/\"unknown\" — only use false if JD explicitly contradicts, use \"unknown\" when not mentioned
- redFlags: list any red flags (unpaid work, unclear salary, excessive overtime, relocation required, etc.)

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

export type CoverLetterStyle =
  | "professional"
  | "friendly"
  | "short"
  | "startup"
  | "corporate"
  | "vietnamese"
  | "bilingual";

export type MessageType =
  | "cover_letter"
  | "recruiter_message"
  | "linkedin_message"
  | "email_application"
  | "resume_tips";

const STYLE_INSTRUCTIONS: Record<CoverLetterStyle, string> = {
  professional: "formal, clear, concise — 3 paragraphs",
  friendly: "warm and personable while still professional — 3 paragraphs",
  short: "brief and direct — maximum 150 words",
  startup: "energetic, casual, show initiative — 3 paragraphs",
  corporate: "formal, structured, detail-oriented — 3 paragraphs",
  vietnamese: "write in Vietnamese — 3 paragraphs",
  bilingual: "write in both English and Vietnamese — English first, then Vietnamese",
};

const MESSAGE_INSTRUCTIONS: Record<MessageType, string> = {
  cover_letter: "a cover letter",
  recruiter_message: "a short direct message to the recruiter (max 100 words)",
  linkedin_message: "a LinkedIn connection request message (max 60 words)",
  email_application: "an email application with subject line and body",
  resume_tips: "3-5 specific suggestions to tailor the candidate's resume for this job",
};

export async function generateCoverLetter(
  profile: string,
  job: { title: string; company?: string | null; description?: string | null },
  style: CoverLetterStyle = "professional",
  messageType: MessageType = "cover_letter",
): Promise<string> {
  const client = getClient();
  if (!client) return generateCoverLetterLocally(profile, job);

  const styleNote = STYLE_INSTRUCTIONS[style];
  const typeNote = MESSAGE_INSTRUCTIONS[messageType];

  const completion = await client.chat.completions.create({
    model: "kr/claude-haiku-4.5",
    messages: [
      {
        role: "user",
        content: `Write ${typeNote} in this style: ${styleNote}. Return valid JSON only with this shape: {"coverLetter": string}.

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
