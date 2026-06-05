import { z } from "zod";
import { mineJobs } from "@/crawlers";
import { upsertJobs } from "@/lib/repository";

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
  const jobs = await upsertJobs(items);

  return Response.json({ jobs, count: jobs.length });
}
