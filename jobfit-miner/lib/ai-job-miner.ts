import OpenAI from "openai";
import { z } from "zod";
import {
  type CompletionLike,
  parseStructuredCompletion,
} from "./ai-completion.ts";
import type { JobItem } from "./types";

const ExtractedJobSchema = z.object({
  title: z.string().optional(),
  company: z.string().optional(),
  location: z.string().optional(),
  url: z.string().optional(),
  description: z.string().optional(),
});

const ExtractedJobsSchema = z.object({
  jobs: z.array(ExtractedJobSchema),
});

type AiJobMinerClient = {
  chat: {
    completions: {
      create(payload: unknown): Promise<CompletionLike>;
    };
  };
};

type ExtractJobsWithAiInput = {
  client: AiJobMinerClient;
  site: string;
  siteUrl: string;
  pageUrl: string;
  keyword: string;
  location?: string;
  html: string;
  limit?: number;
};

function getOpenAiClient(): AiJobMinerClient | null {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL?.trim() || undefined;
  if (!apiKey) return null;
  return new OpenAI({ apiKey, baseURL });
}

function normalizeText(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim() || "";
}

function parseStructuredOutput(completion: CompletionLike) {
  return parseStructuredCompletion(
    completion,
    ExtractedJobsSchema,
    "No structured job result returned by model",
  );
}

function resolveJobUrl(rawUrl: string, pageUrl: string, siteUrl: string) {
  try {
    return new URL(rawUrl, pageUrl).toString();
  } catch {
    return new URL(rawUrl, siteUrl).toString();
  }
}

function normalizeExtractedJobs(
  jobs: z.infer<typeof ExtractedJobSchema>[],
  site: string,
  pageUrl: string,
  siteUrl: string,
  limit: number,
): JobItem[] {
  const seenUrls = new Set<string>();
  const normalizedJobs: JobItem[] = [];

  for (const job of jobs) {
    const title = normalizeText(job.title);
    const rawUrl = normalizeText(job.url);
    if (!title || !rawUrl) continue;

    const url = resolveJobUrl(rawUrl, pageUrl, siteUrl);
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);

    normalizedJobs.push({
      site,
      title,
      company: normalizeText(job.company) || undefined,
      location: normalizeText(job.location) || undefined,
      url,
      description: normalizeText(job.description) || undefined,
    });

    if (normalizedJobs.length >= limit) break;
  }

  return normalizedJobs;
}

function buildExtractionPrompt(input: ExtractJobsWithAiInput) {
  const trimmedHtml = input.html.replace(/\s+/g, " ").trim().slice(0, 45000);

  return `Extract job listings from this job search page. Return valid JSON only with this shape: {"jobs":[{"title":string,"company":string,"location":string,"url":string,"description":string}]}.

Rules:
- Include only real job listings from the page, not navigation, ads, filters, or saved searches.
- Prefer the canonical job detail URL from links or data attributes.
- Use absolute URLs when available; relative URLs are allowed if that is all the page provides.
- Keep descriptions short but specific to each job.
- Return at most ${input.limit ?? 20} jobs.

Search context:
Site: ${input.site}
Site URL: ${input.siteUrl}
Page URL: ${input.pageUrl}
Keyword: ${input.keyword}
Location: ${input.location || "Any"}

HTML:
${trimmedHtml}`;
}

export async function extractJobsWithAi(
  input: ExtractJobsWithAiInput,
): Promise<JobItem[]> {
  const limit = input.limit ?? 20;
  const completion = await input.client.chat.completions.create({
    model: process.env.AI_MINER_MODEL || "kr/claude-haiku-4.5",
    messages: [
      {
        role: "user",
        content: buildExtractionPrompt(input),
      },
    ],
  });
  const parsed = parseStructuredOutput(completion);

  return normalizeExtractedJobs(
    parsed.jobs,
    input.site,
    input.pageUrl,
    input.siteUrl,
    limit,
  );
}

export async function extractJobsWithConfiguredAi(
  input: Omit<ExtractJobsWithAiInput, "client">,
): Promise<JobItem[]> {
  const client = getOpenAiClient();
  if (!client) return [];
  return extractJobsWithAi({ ...input, client });
}

export const __testables = {
  buildExtractionPrompt,
  parseStructuredOutput,
  normalizeExtractedJobs,
};
