import { prisma } from "./prisma";
import { splitJobsByKnownUrls } from "./job-deduper";
import {
  buildJobListWhere,
  buildPagination,
  type JobListParams,
} from "./job-listing.ts";
import type { JobItem } from "./types";

type SaveJobsOptions = {
  isMatched: boolean;
};

async function saveNewJobsWithMode(jobs: JobItem[], options: SaveJobsOptions) {
  const incomingUrls = [...new Set(jobs.map((job) => job.url))];
  const storedJobs = await prisma.job.findMany({
    where: { url: { in: incomingUrls } },
    select: { url: true },
  });

  const { newJobs, existingJobs } = splitJobsByKnownUrls(
    jobs,
    storedJobs.map((job) => job.url),
  );

  const savedJobs = await Promise.all(
    newJobs.map((job) =>
      prisma.job.create({
        data: {
          site: job.site,
          title: job.title,
          company: job.company,
          location: job.location,
          url: job.url,
          description: job.description,
          isMatched: options.isMatched,
        },
      }),
    ),
  );

  return { jobs: savedJobs, existingJobs };
}

export async function saveNewJobs(jobs: JobItem[]) {
  return saveNewJobsWithMode(jobs, { isMatched: false });
}

export async function saveMatchedJobs(jobs: JobItem[]) {
  const incomingUrls = [...new Set(jobs.map((job) => job.url))];
  const existing = await prisma.job.findMany({
    where: { url: { in: incomingUrls } },
    select: { id: true, url: true, isMatched: true },
  });
  const existingByUrl = new Map(existing.map((job) => [job.url, job]));

  const savedJobs: Awaited<ReturnType<typeof prisma.job.create>>[] = [];
  const existingMatchedJobs: Array<{ id: number; url: string }> = [];

  for (const job of jobs) {
    const known = existingByUrl.get(job.url);
    if (!known) {
      savedJobs.push(
        await prisma.job.create({
          data: {
            site: job.site,
            title: job.title,
            company: job.company,
            location: job.location,
            url: job.url,
            description: job.description,
            isMatched: true,
          },
        }),
      );
      continue;
    }

    if (known.isMatched) {
      existingMatchedJobs.push({ id: known.id, url: known.url });
      continue;
    }

    savedJobs.push(
      await prisma.job.update({
        where: { id: known.id },
        data: {
          site: job.site,
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          isMatched: true,
        },
      }),
    );
  }

  return { jobs: savedJobs, existingMatchedJobs };
}

export async function upsertJobs(jobs: JobItem[]) {
  const result = await saveNewJobs(jobs);
  return result.jobs;
}

export async function getJobsByIds(ids: number[]) {
  return prisma.job.findMany({
    where: { id: { in: ids } },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
  });
}

export async function getSavedJobs() {
  return prisma.job.findMany({
    where: { isMatched: true },
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function listJobs(params: JobListParams) {
  const where = buildJobListWhere(params);
  const skip = (params.page - 1) * params.pageSize;

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip,
      take: params.pageSize,
    }),
    prisma.job.count({ where }),
  ]);

  return {
    jobs,
    pagination: buildPagination({
      page: params.page,
      pageSize: params.pageSize,
      total,
    }),
  };
}

export async function getRankedJobs() {
  return prisma.job.findMany({
    where: { isMatched: true },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
  });
}

export async function getCandidateProfile() {
  return prisma.candidateProfile.findUnique({
    where: { id: 1 },
  });
}

export async function saveCandidateProfile(summary: string, sourceName?: string) {
  return prisma.candidateProfile.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      summary,
      sourceName,
    },
    update: {
      summary,
      sourceName,
    },
  });
}

export async function updateScore(
  id: number,
  score: number,
  reason: string,
) {
  return prisma.job.update({
    where: { id },
    data: { score, reason },
  });
}

export async function updateJobAnalysis(
  id: number,
  analysis: {
    score: number;
    fitLevel: string;
    reason: string;
    matchedSkills: string[];
    missingSkills: string[];
    expectationMatches: Record<string, boolean | "unknown">;
    redFlags: string[];
    detectedTechStack?: string[];
    salary?: string;
    workMode?: string;
    benefits?: string[];
  },
) {
  return prisma.job.update({
    where: { id },
    data: {
      score: analysis.score,
      fitLevel: analysis.fitLevel,
      reason: analysis.reason,
      matchedSkills: JSON.stringify(analysis.matchedSkills),
      missingSkills: JSON.stringify(analysis.missingSkills),
      expectationMatches: JSON.stringify(analysis.expectationMatches),
      redFlags: JSON.stringify(analysis.redFlags),
      detectedTechStack: analysis.detectedTechStack
        ? JSON.stringify(analysis.detectedTechStack)
        : undefined,
      salary: analysis.salary ?? undefined,
      workMode: analysis.workMode ?? undefined,
      benefits: analysis.benefits ? JSON.stringify(analysis.benefits) : undefined,
    },
  });
}

export async function recordMiningRun(run: {
  keywords: string;
  site: string;
  location?: string;
  found: number;
  scored: number;
  errors?: string;
}) {
  return prisma.miningRun.create({ data: run });
}

export type JobStatus =
  | "new"
  | "shortlisted"
  | "applied"
  | "rejected"
  | "interviewing"
  | "offer";

export async function updateJobStatus(id: number, status: JobStatus) {
  return prisma.job.update({
    where: { id },
    data: { status },
  });
}

export interface PresetInput {
  name: string;
  siteUrl: string;
  keyword: string;
  location?: string;
  techStack?: Record<string, unknown>;
  expectations?: Record<string, unknown>;
}

export async function getPresets() {
  return prisma.searchPreset.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function createPreset(input: PresetInput) {
  return prisma.searchPreset.create({
    data: {
      name: input.name,
      siteUrl: input.siteUrl,
      keyword: input.keyword,
      location: input.location,
      techStack: input.techStack ? JSON.stringify(input.techStack) : null,
      expectations: input.expectations
        ? JSON.stringify(input.expectations)
        : null,
    },
  });
}

export async function deletePreset(id: number) {
  return prisma.searchPreset.delete({ where: { id } });
}

export const __testables = {
  splitJobsByKnownUrls,
};
