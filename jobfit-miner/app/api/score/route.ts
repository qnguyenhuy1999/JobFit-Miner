import { z } from "zod";
import { getJobsByIds, getRankedJobs, updateJobAnalysis } from "@/lib/repository";
import { analyzeTechStackFit, scoreJob } from "@/lib/scorer";

const TechStackSchema = z.object({
  primary: z.array(z.string()),
  secondary: z.array(z.string()).default([]),
  learning: z.array(z.string()).default([]),
  avoid: z.array(z.string()).default([]),
  seniority: z.enum(["intern", "junior", "middle", "senior", "lead"]).optional(),
});

const ExpectationsSchema = z.object({
  preferredWorkModes: z.array(z.enum(["remote", "hybrid", "onsite"])).default([]),
  minimumSalary: z.string().optional(),
  requiredBenefits: z.array(z.string()).default([]),
  niceToHaveBenefits: z.array(z.string()).default([]),
  locations: z.array(z.string()).default([]),
  note: z.string().optional(),
});

const bodySchema = z.object({
  profile: z.string().min(1),
  expectations: z.union([z.string().min(1), ExpectationsSchema]).optional(),
  techStack: TechStackSchema.optional(),
  jobIds: z.array(z.number().int().positive()).optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  const { profile, expectations, techStack, jobIds } = parsed.data;
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
    const analysis =
      techStack && expectations && typeof expectations !== "string"
        ? await analyzeTechStackFit({
            profile,
            techStack,
            expectations,
            job: {
              title: job.title,
              company: job.company,
              location: job.location,
              url: job.url,
              description: job.description,
              salary: job.salary,
              workMode: job.workMode,
            },
          })
        : await scoreJob(
            profile,
            job,
            typeof expectations === "string" ? expectations : expectations?.note,
          );
    results.push(await updateJobAnalysis(job.id, analysis));
  }

  return Response.json({ jobs: results, count: results.length });
}
