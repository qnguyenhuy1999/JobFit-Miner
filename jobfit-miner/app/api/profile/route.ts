import { getCandidateProfile } from "@/lib/repository";

export async function GET() {
  const profile = await getCandidateProfile();
  return Response.json({ profile });
}
