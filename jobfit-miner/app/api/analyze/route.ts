import { z } from "zod";
import { mineJobs } from "@/crawlers";
import { upsertJobs, updateJobAnalysis, getRankedJobs } from "@/lib/repository";
import { analyzeJob } from "@/lib/scorer";

const bodySchema = z.object({
  siteUrl: z.string().url(),
  keyword: z.string().min(1),
  profile: z.string().min(1),
  expectations: z.string().min(1),
  location: z.string().optional(),
  limit: z.number().int().min(1).max(20).optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  const { siteUrl, keyword, profile, expectations, location, limit = 10 } = parsed.data;

  // Mine jobs
  let items;
  try {
    items = await mineJobs(siteUrl, keyword, location);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Mining failed" },
      { status: 500 }
    );
  }

  if (items.length === 0) {
    return Response.json({ jobs: [], count: 0, message: "No jobs found. Try another keyword." });
  }

  // Upsert to DB
  const upserted = await upsertJobs(items.slice(0, limit));
  const upsertedIds = new Set(upserted.map((j) => j.id));

  // Analyze each job sequentially
  for (const job of upserted) {
    try {
      const analysis = await analyzeJob(profile, expectations, {
        title: job.title,
        company: job.company,
        location: job.location,
        url: job.url,
        description: job.description,
        detailText: job.detailText,
      });
      await updateJobAnalysis(job.id, analysis);
    } catch {
      // Mark as unanalyzed — don't fail the whole run
      await updateJobAnalysis(job.id, {
        score: 0,
        fitLevel: "low",
        reason: "Analysis failed for this job.",
        matchedSkills: [],
        missingSkills: [],
        benefits: [],
        concerns: ["AI analysis failed"],
        workMode: "unknown",
        salary: null,
        socialInsurance: "unknown",
        remoteOrHybrid: "unknown",
        seniorityMatch: "unknown",
        expectationFit: "unknown",
      });
    }
  }

  const ranked = await getRankedJobs();
  const result = ranked.filter((j) => upsertedIds.has(j.id));

  return Response.json({ jobs: result, count: result.length });
}
