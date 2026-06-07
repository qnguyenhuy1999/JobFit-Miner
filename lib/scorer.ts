import OpenAI from "openai";
import { z } from "zod";
import {
  type CompletionLike,
  parseStructuredCompletion,
} from "./ai-completion.ts";
import type { CandidateTechStack, CandidateExpectations, DetailedJob } from "./types.ts";

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

export const JobAnalysisSchema = z.object({
  score: z.number().int().min(0).max(100),
  fitLevel: z.enum(["strong", "partial", "low"]),
  reason: z.string(),
  detectedTechStack: z.array(z.string()).default([]),
  matchedSkills: z.array(z.string()).default([]),
  missingSkills: z.array(z.string()).default([]),
  seniorityFit: z.union([z.boolean(), z.literal("unknown")]).default("unknown"),
  expectationMatches: z.object({
    workMode: z.union([z.boolean(), z.literal("unknown")]).default("unknown"),
    salary: z.union([z.boolean(), z.literal("unknown")]).default("unknown"),
    benefits: z.union([z.boolean(), z.literal("unknown")]).default("unknown"),
    socialInsurance: z.union([z.boolean(), z.literal("unknown")]).default("unknown"),
    location: z.union([z.boolean(), z.literal("unknown")]).default("unknown"),
  }),
  redFlags: z.array(z.string()).default([]),
});

export type JobAnalysis = z.infer<typeof JobAnalysisSchema>;

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
  job: {
    title: string;
    company?: string | null;
    description?: string | null;
    salary?: string | null;
    workMode?: string | null;
    matchedSkills?: string[];
    missingSkills?: string[];
    reason?: string | null;
  },
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

function localAnalyzeTechStackFit(input: {
  techStack: CandidateTechStack;
  expectations: CandidateExpectations;
  job: DetailedJob;
}): JobAnalysis {
  const text = (input.job.fullDescription ?? input.job.description ?? "").toLowerCase();
  const primary = input.techStack.primary.map((s) => s.toLowerCase());
  const secondary = input.techStack.secondary.map((s) => s.toLowerCase());
  const avoid = input.techStack.avoid.map((s) => s.toLowerCase());

  const detectedTech = [...primary, ...secondary].filter((t) => text.includes(t));
  const matchedPrimary = primary.filter((t) => text.includes(t));
  const missingPrimary = primary.filter((t) => !text.includes(t));
  const avoidFound = avoid.filter((t) => text.includes(t));

  let score = 30;
  score += matchedPrimary.length * 10;
  score += secondary.filter((t) => text.includes(t)).length * 4;
  score += input.techStack.learning.filter((t) => text.toLowerCase().includes(t.toLowerCase())).length * 2;
  score -= avoidFound.length * 20;
  score = Math.max(5, Math.min(95, score));

  const isRemote = /(remote|work from home|làm việc từ xa)/i.test(text);
  const isHybrid = /(hybrid|kết hợp)/i.test(text);
  const isOnsite = /(onsite|on-site|tại văn phòng)/i.test(text);
  const hasInsurance = /(social insurance|bhxh|bảo hiểm xã hội|insurance)/i.test(text);

  const redFlags: string[] = [];
  if (/unpaid|training fee|bond|phí đào tạo/i.test(text)) redFlags.push("Training fee or bond clause");
  if (/overtime required|OT nhiều|mandatory OT/i.test(text)) redFlags.push("Excessive overtime required");
  if (/night shift/i.test(text)) redFlags.push("Night shift required");

  const seniorityText = input.techStack.seniority;
  let seniorityFit: boolean | "unknown" = "unknown";
  if (seniorityText) {
    seniorityFit = text.includes(seniorityText) ? true : "unknown";
  }

  const modes = input.expectations.preferredWorkModes;
  let workModeMatch: boolean | "unknown" = "unknown";
  if (modes.length > 0) {
    if (modes.includes("remote") && isRemote) workModeMatch = true;
    else if (modes.includes("hybrid") && isHybrid) workModeMatch = true;
    else if (modes.includes("onsite") && isOnsite) workModeMatch = true;
    else if (isRemote || isHybrid || isOnsite) workModeMatch = false;
  }

  return {
    score,
    fitLevel: score >= 70 ? "strong" : score >= 40 ? "partial" : "low",
    reason: `Local analysis: matched ${matchedPrimary.length}/${primary.length} primary skills.${avoidFound.length > 0 ? ` Avoid-tech found: ${avoidFound.join(", ")}.` : ""} ${redFlags.length > 0 ? `Red flags: ${redFlags.join("; ")}.` : ""}`,
    detectedTechStack: detectedTech,
    matchedSkills: matchedPrimary,
    missingSkills: missingPrimary,
    seniorityFit,
    expectationMatches: {
      workMode: workModeMatch,
      salary: "unknown",
      benefits: "unknown",
      socialInsurance: hasInsurance ? true : "unknown",
      location: "unknown",
    },
    redFlags,
  };
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

export async function analyzeTechStackFit(input: {
  profile: string;
  techStack: CandidateTechStack;
  expectations: CandidateExpectations;
  job: DetailedJob;
}): Promise<JobAnalysis> {
  const client = getClient();
  if (!client) return localAnalyzeTechStackFit(input);

  const prompt = `You are evaluating a job description for a software engineering candidate.

Candidate profile:
${input.profile}

Candidate tech stack:
- Primary (must-have): ${input.techStack.primary.join(", ")}
- Secondary (nice-to-have): ${input.techStack.secondary.join(", ")}
- Learning (small bonus if present): ${input.techStack.learning.join(", ")}
- Avoid (strong penalty): ${input.techStack.avoid.join(", ")}
- Seniority: ${input.techStack.seniority ?? "not specified"}

Candidate expectations:
- Preferred work modes: ${input.expectations.preferredWorkModes.join(", ")}
- Minimum salary: ${input.expectations.minimumSalary ?? "not specified"}
- Required benefits: ${input.expectations.requiredBenefits.join(", ")}
- Locations: ${input.expectations.locations.join(", ")}
${input.expectations.note ? "Note: " + input.expectations.note : ""}

Job:
Title: ${input.job.title}
Company: ${input.job.company ?? "Unknown"}
Location: ${input.job.location ?? "Unknown"}
Description: ${input.job.fullDescription ?? input.job.description ?? "No description"}

Instructions:
1. Read the FULL description, not just the title.
2. Extract all technology names from the JD into detectedTechStack.
3. Compare detected tech to candidate's primary/secondary/avoid stacks.
4. Score 0-100: primary stack match up to 60pts, secondary bonus 15pts, learning bonus 5pts, avoid tech found subtract 20-40pts, seniority match bonus/penalty 5-10pts, work mode/location/benefits affect remaining 20pts.
5. For expectationMatches: use true ONLY if JD explicitly confirms, false ONLY if JD explicitly contradicts, "unknown" if not mentioned. Do NOT invent salary, remote, hybrid, insurance data.
6. For redFlags: flag unpaid work, training fees, bond clauses, mandatory excessive OT, night shift, onsite-only vs clearly remote preference, no insurance.
7. reason: 2-3 sentences. Actionable. Explains apply/review/skip decision.

Return valid JSON only. No markdown fences. Shape:
{"score":number,"fitLevel":"strong"|"partial"|"low","reason":string,"detectedTechStack":string[],"matchedSkills":string[],"missingSkills":string[],"seniorityFit":true|false|"unknown","expectationMatches":{"workMode":true|false|"unknown","salary":true|false|"unknown","benefits":true|false|"unknown","socialInsurance":true|false|"unknown","location":true|false|"unknown"},"redFlags":string[]}`;

  const completion = await callWithRetry(() =>
    client.chat.completions.create({
      model: "kr/claude-haiku-4.5",
      messages: [{ role: "user", content: prompt }],
    }),
  );

  return parseStructuredOutput(completion, JobAnalysisSchema);
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
  job: {
    title: string;
    company?: string | null;
    description?: string | null;
    salary?: string | null;
    workMode?: string | null;
    matchedSkills?: string[];
    missingSkills?: string[];
    reason?: string | null;
  },
  style: CoverLetterStyle = "professional",
  messageType: MessageType = "cover_letter",
): Promise<string> {
  const client = getClient();
  if (!client) return generateCoverLetterLocally(profile, job);

  const styleNote = STYLE_INSTRUCTIONS[style];
  const typeNote = MESSAGE_INSTRUCTIONS[messageType];

  const contextLines: string[] = [];
  if (job.salary) contextLines.push(`Salary: ${job.salary}`);
  if (job.workMode) contextLines.push(`Work mode: ${job.workMode}`);
  if (job.matchedSkills?.length) contextLines.push(`Matched skills: ${job.matchedSkills.join(", ")}`);
  if (job.missingSkills?.length) contextLines.push(`Skills to address: ${job.missingSkills.join(", ")}`);
  if (job.reason) contextLines.push(`Fit summary: ${job.reason}`);
  const contextBlock = contextLines.length > 0
    ? `\nAnalysis context:\n${contextLines.join("\n")}`
    : "";

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
Description: ${job.description ?? "No description"}${contextBlock}`,
      },
    ],
  });

  const result = parseStructuredOutput(completion, CoverLetterSchema);
  return result.coverLetter;
}
