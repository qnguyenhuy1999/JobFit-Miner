import { z } from "zod";
import { getRankedJobs, updateScore } from "@/lib/repository";
import { scoreJob } from "@/lib/scorer";

const bodySchema = z.object({
  profile: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  const { profile } = parsed.data;
  const jobs = await getRankedJobs();

  if (jobs.length === 0) {
    return Response.json({ error: "No jobs to score. Mine jobs first." }, { status: 400 });
  }

  const jobsToScore = jobs.slice(0, 10);
  const results = [];
  for (const job of jobsToScore) {
    const { score, reason } = await scoreJob(profile, job);
    results.push(await updateScore(job.id, score, reason));
  }

  return Response.json({ jobs: results, count: results.length });
}
