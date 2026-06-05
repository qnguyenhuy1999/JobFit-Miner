import { getRankedJobs } from "@/lib/repository";

export async function GET() {
  const jobs = await getRankedJobs();
  return Response.json({ jobs });
}
