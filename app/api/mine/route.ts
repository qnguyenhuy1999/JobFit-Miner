import { z } from "zod";
import { mineJobs } from "@/crawlers";
import { saveNewJobs } from "@/lib/repository";
import type { JobItem } from "@/lib/types";

const bodySchema = z.object({
  siteUrl: z.string().url(),
  keyword: z.string().min(1),
  location: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  const { siteUrl, keyword, location } = parsed.data;

  const items = await mineJobs(siteUrl, keyword, location);
  const site = new URL(siteUrl).hostname;
  const { jobs, existingJobs } = await saveNewJobs(
    items.map(
      (job): JobItem => ({
        site,
        title: job.title,
        company: job.company ?? undefined,
        location: job.location ?? undefined,
        url: job.url,
        description: job.description ?? undefined,
      }),
    ),
  );

  return Response.json({
    jobs,
    count: jobs.length,
    existingCount: existingJobs.length,
    visibility: "raw-debug-only",
  });
}
