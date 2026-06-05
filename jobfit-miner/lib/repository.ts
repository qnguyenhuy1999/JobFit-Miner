import { prisma } from "./prisma";
import type { JobItem } from "./types";

export async function upsertJobs(jobs: JobItem[]) {
  const results = await Promise.all(
    jobs.map((job) =>
      prisma.job.upsert({
        where: { url: job.url },
        update: {
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
        },
        create: {
          site: job.site,
          title: job.title,
          company: job.company,
          location: job.location,
          url: job.url,
          description: job.description,
        },
      })
    )
  );
  return results;
}

export async function getRankedJobs() {
  return prisma.job.findMany({
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
  });
}

export async function updateScore(
  id: number,
  score: number,
  reason: string
) {
  return prisma.job.update({
    where: { id },
    data: { score, reason },
  });
}
