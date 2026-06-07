import { z } from "zod";
import { mineJobs, getCrawlerForUrl } from "@/crawlers";
import {
  updateJobAnalysis,
  saveMatchedJobs,
  recordMiningRun,
} from "@/lib/repository";
import { scoreJob, analyzeTechStackFit, passesHardMatchGate } from "@/lib/scorer";
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
  minScore: z.number().int().min(0).max(100).optional(),
});

type DetailedCandidate = RawJob & {
  fullDescription?: string | null;
  salary?: string | null;
  workMode?: string | null;
  benefits?: string[];
};

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
    minScore,
  } = parsed.data;

  const keywords = techStack
    ? buildSearchKeywords({ techStack, baseKeyword: keyword || undefined })
    : [keyword ?? "software engineer"];

  const allItems: RawJob[] = [];
  try {
    for (const kw of keywords) {
      const items = await mineJobs(siteUrl, kw, location);
      allItems.push(...items.map((job) => ({ ...job })));
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
      rawCount: 0,
      candidateCount: 0,
      rejectedCount: 0,
      message: "No jobs found. Try another keyword.",
    });
  }

  const seen = new Set<string>();
  const dedupedItems = allItems.filter((job) => {
    if (seen.has(job.url)) return false;
    seen.add(job.url);
    return true;
  });

  const candidatePoolSize = Math.min(
    dedupedItems.length,
    Math.max(limit * 3, 24),
  );
  const candidateItems = dedupedItems.slice(0, candidatePoolSize);

  let detailedItems: DetailedCandidate[] = candidateItems.map((job) => ({ ...job }));
  let detailErrors: string[] = [];
  try {
    const crawler = getCrawlerForUrl(siteUrl);
    if (crawler) {
      const { detailed, errors } = await extractJobDetails(
        candidateItems,
        crawler,
        candidatePoolSize,
      );
      detailedItems = detailed.map((job) => ({ ...job }));
      detailErrors = errors;
    }
  } catch {
    // Fall back to listing data.
  }

  const site = new URL(siteUrl).hostname;
  const matchedCandidates: Array<{
    job: JobItem;
    detail: DetailedCandidate;
    analysis: Awaited<ReturnType<typeof analyzeTechStackFit>> | Awaited<ReturnType<typeof scoreJob>>;
  }> = [];

  for (const detail of detailedItems) {
    try {
      const candidateJob: JobItem = {
        site,
        title: detail.title,
        company: detail.company ?? undefined,
        location: detail.location ?? undefined,
        url: detail.url,
        description: detail.description ?? undefined,
      };

      if (techStack && expectations) {
        const analysis = await analyzeTechStackFit({
            profile,
            techStack,
            expectations,
            job: {
              title: candidateJob.title,
              company: candidateJob.company,
              location: candidateJob.location,
              url: candidateJob.url,
              description: candidateJob.description,
              fullDescription: detail.fullDescription,
              salary: detail.salary,
              workMode: detail.workMode,
            },
          });
        const gate = passesHardMatchGate({
          analysis,
          techStack,
          expectations,
          minScore,
        });

        if (gate.passed) {
          matchedCandidates.push({
            job: candidateJob,
            detail,
            analysis,
          });
        }
        continue;
      }

      const analysis = await scoreJob(profile, candidateJob, expectationsText);
      if (analysis.score >= (minScore ?? 70)) {
        matchedCandidates.push({
          job: candidateJob,
          detail,
          analysis,
        });
      }
    } catch {
      // Ignore jobs that fail AI analysis.
    }
  }

  const topMatches = matchedCandidates
    .sort((left, right) => right.analysis.score - left.analysis.score)
    .slice(0, limit);
  const { jobs: savedMatchedJobs, existingMatchedJobs } = await saveMatchedJobs(
    topMatches.map((candidate) => candidate.job),
  );
  const savedByUrl = new Map(savedMatchedJobs.map((job) => [job.url, job]));

  let scored = 0;
  for (const candidate of topMatches) {
    const savedJob = savedByUrl.get(candidate.job.url);
    if (!savedJob) continue;

    await updateJobAnalysis(savedJob.id, {
      ...candidate.analysis,
      salary: candidate.detail.salary ?? undefined,
      workMode: candidate.detail.workMode ?? undefined,
      benefits: candidate.detail.benefits ?? undefined,
    });
    scored++;
  }

  await recordMiningRun({
    keywords: keywords.join(", "),
    site,
    location,
    found: detailedItems.length,
    scored,
  });

  const jobs = savedMatchedJobs
    .map((savedJob) => {
      const candidate = topMatches.find((item) => item.job.url === savedJob.url);
      if (!candidate) return null;

      return {
        ...savedJob,
        score: candidate.analysis.score,
        fitLevel: candidate.analysis.fitLevel,
        reason: candidate.analysis.reason,
        matchedSkills: JSON.stringify(candidate.analysis.matchedSkills),
        missingSkills: JSON.stringify(candidate.analysis.missingSkills),
        expectationMatches: JSON.stringify(candidate.analysis.expectationMatches),
        redFlags: JSON.stringify(candidate.analysis.redFlags),
        detectedTechStack: "detectedTechStack" in candidate.analysis
          ? JSON.stringify(candidate.analysis.detectedTechStack)
          : null,
        salary: candidate.detail.salary ?? null,
        workMode: candidate.detail.workMode ?? null,
        benefits: candidate.detail.benefits
          ? JSON.stringify(candidate.detail.benefits)
          : null,
      };
    })
    .filter((job): job is NonNullable<typeof job> => job !== null)
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0));

  return Response.json({
    jobs,
    count: jobs.length,
    existingCount: existingMatchedJobs.length,
    rawCount: allItems.length,
    candidateCount: detailedItems.length,
    rejectedCount: detailedItems.length - topMatches.length,
    detailErrors,
  });
}
