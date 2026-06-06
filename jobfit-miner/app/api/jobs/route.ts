import { getSavedJobs, listJobs } from "@/lib/repository";
import { normalizeJobListParams } from "@/lib/job-listing.ts";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  if ([...searchParams.keys()].length === 0) {
    const jobs = await getSavedJobs();
    return Response.json({ jobs });
  }

  const data = await listJobs(normalizeJobListParams(searchParams));
  return Response.json(data);
}
