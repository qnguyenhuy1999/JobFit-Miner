import { z } from "zod";
import { mineJobs } from "@/crawlers";
import { getRankedJobs, updateScore, upsertJobs } from "@/lib/repository";
import { scoreJob } from "@/lib/scorer";

const bodySchema = z.object({
  siteUrl: z.string().url(),
  keyword: z.string().min(1),
  profile: z.string().min(1),
  expectations: z.string().min(1).optional(),
  location: z.string().optional(),
  limit: z.number().int().min(1).max(20).optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  const {
    siteUrl,
    keyword,
    profile,
    location,
    limit = 20,
  } = parsed.data;

  // Mine jobs
  let items;
  try {
    items = await mineJobs(siteUrl, keyword, location);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Mining failed" },
      { status: 500 },
    );
  }

  if (items.length === 0) {
    return Response.json({
      jobs: [],
      count: 0,
      message: "No jobs found. Try another keyword.",
    });
  }

  // Upsert to DB
  const upserted = await upsertJobs(items.slice(0, limit));
  const upsertedIds = new Set(upserted.map((j) => j.id));

  // Score each job sequentially to keep provider requests predictable.
  for (const job of upserted) {
    try {
      const { score, reason } = await scoreJob(profile, job);
      await updateScore(job.id, score, reason);
    } catch {
      await updateScore(job.id, 0, "Scoring failed for this job.");
    }
  }

  const ranked = await getRankedJobs();
  const result = ranked.filter((j) => upsertedIds.has(j.id));

  return Response.json({ jobs: result, count: result.length });
}
