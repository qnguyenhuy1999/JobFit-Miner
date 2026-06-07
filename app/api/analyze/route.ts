import { z } from "zod";
import { mineJobs, getCrawlerForUrl } from "@/crawlers";
import {
  getRankedJobs,
  updateJobAnalysis,
  saveNewJobs,
  recordMiningRun,
} from "@/lib/repository";
import { scoreJob, analyzeTechStackFit } from "@/lib/scorer";
import { buildSearchKeywords } from "@/lib/search-keywords";
import { extractJobDetails } from "@/lib/detail-extractor";
import type { JobItem, RawJob } from "@/lib/types";

const TechStackSchema = z.object({
  primary: z.array(z.string()),
  secondary: z.array(z.string()).default([]),
  learning: z.array(z.string()).default([]),
  avoid: z.array(z.string()).default([]),
  seniority: z
    .enum(["intern", "junior", "middle", "senior", "lead"])
    .optional(),
});

const ExpectationsSchema = z.object({
  preferredWorkModes: z
    .array(z.enum(["remote", "hybrid", "onsite"]))
    .default([]),
  minimumSalary: z.string().optional(),
  requiredBenefits: z.array(z.string()).default([]),
  niceToHaveBenefits: z.array(z.string()).default([]),
  locations: z.array(z.string()).default([]),
  note: z.string().optional(),
});

const bodySchema = z.object({
  siteUrl: z.string().url(),
  profile: z.string().min(1),
  techStack: TechStackSchema.optional(),
  expectations: ExpectationsSchema.optional(),
  expectationsText: z.string().optional(),
  keyword: z.string().optional(),
  location: z.string().optional(),
  limit: z.number().int().min(1).max(20).default(20),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  const {
    siteUrl,
    profile,
    techStack,
    expectations,
    expectationsText,
    keyword,
    location,
    limit,
  } = parsed.data;

  // Generate keywords: structured tech stack → keyword generator, else single keyword
  const keywords: string[] = techStack
    ? buildSearchKeywords({ techStack, baseKeyword: keyword || undefined })
    : [keyword ?? "developer"];

  // Mine jobs for each keyword, collect all
  const allItems: RawJob[] = [];
  try {
    for (const kw of keywords) {
      const items = await mineJobs(siteUrl, kw, location);
      allItems.push(...items.map((j) => ({ ...j })));
    }
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Mining failed" },
      { status: 500 },
    );
  }

  if (allItems.length === 0) {
    return Response.json({
      jobs: [],
      count: 0,
      message: "No jobs found. Try another keyword.",
    });
  }

  // Dedup by URL and cap at limit
  const seen = new Set<string>();
  const dedupedItems = allItems.filter((j) => {
    if (seen.has(j.url)) return false;
    seen.add(j.url);
    return true;
  });
  const limitedItems = dedupedItems.slice(0, limit);

  // Extract detail pages if crawler supports it
  let detailedItems: RawJob[] = limitedItems;
  let detailErrors: string[] = [];
  try {
    const crawler = getCrawlerForUrl(siteUrl);
    if (crawler) {
      const { detailed, errors } = await extractJobDetails(limitedItems, crawler);
      detailedItems = detailed;
      detailErrors = errors;
    }
  } catch {
    // Fall back to listing data
  }

  // Persist only new jobs; existing ones are left available through saved jobs/history.
  const site = new URL(siteUrl).hostname;
  const jobsToSave: JobItem[] = detailedItems.map((job) => ({
    site,
    title: job.title,
    company: job.company ?? undefined,
    location: job.location ?? undefined,
    url: job.url,
    description: job.description ?? undefined,
  }));
  const { jobs: upserted, existingJobs } = await saveNewJobs(jobsToSave);
  const upsertedIds = new Set(upserted.map((j) => j.id));
  const detailMap = new Map(
    detailedItems.map((d) => [
      d.url,
      d as RawJob & {
        fullDescription?: string | null;
        salary?: string | null;
        workMode?: string | null;
        benefits?: string[];
      },
    ]),
  );

  // Score each job sequentially
  let scored = 0;
  for (const job of upserted) {
    try {
      const detail = detailMap.get(job.url);
      let analysis;
      if (techStack && expectations) {
        analysis = await analyzeTechStackFit({
          profile,
          techStack,
          expectations,
          job: {
            title: job.title,
            company: job.company,
            location: job.location,
            url: job.url,
            description: job.description,
            fullDescription: detail?.fullDescription,
            salary: detail?.salary,
            workMode: detail?.workMode,
          },
        });
      } else {
        analysis = await scoreJob(profile, job, expectationsText);
      }
      await updateJobAnalysis(job.id, {
        ...analysis,
        salary: detail?.salary ?? undefined,
        workMode: detail?.workMode ?? undefined,
        benefits: detail?.benefits ?? undefined,
      });
      scored++;
    } catch {
      await updateJobAnalysis(job.id, {
        score: 0,
        fitLevel: "low",
        reason: "Scoring failed for this job.",
        matchedSkills: [],
        missingSkills: [],
        expectationMatches: {},
        redFlags: [],
      });
    }
  }

  await recordMiningRun({
    keywords: keywords.join(", "),
    site: new URL(siteUrl).hostname,
    location,
    found: upserted.length,
    scored,
  });

  const ranked = await getRankedJobs();
  const result = ranked.filter((j) => upsertedIds.has(j.id));

  return Response.json({
    jobs: result,
    count: result.length,
    existingCount: existingJobs.length,
    detailErrors,
  });
}
