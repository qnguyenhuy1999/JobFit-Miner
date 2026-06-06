import { getSavedJobs } from "@/lib/repository";

export async function GET() {
  const jobs = await getSavedJobs();
  return Response.json({ jobs });
}
