import { z } from "zod";
import { getJobsByIds, getRankedJobs, updateScore } from "@/lib/repository";
import { scoreJob } from "@/lib/scorer";

const bodySchema = z.object({
  profile: z.string().min(1),
  expectations: z.string().min(1).optional(),
  jobIds: z.array(z.number().int().positive()).optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  const { profile, expectations, jobIds } = parsed.data;
  const jobs = jobIds?.length ? await getJobsByIds(jobIds) : await getRankedJobs();

  if (jobs.length === 0) {
    return Response.json(
      { error: "No jobs to score. Mine jobs first." },
      { status: 400 },
    );
  }

  const jobsToScore = jobs.slice(0, 20);
  const results = [];
  for (const job of jobsToScore) {
    const { score, reason } = await scoreJob(profile, job, expectations);
    results.push(await updateScore(job.id, score, reason));
  }

  return Response.json({ jobs: results, count: results.length });
}
