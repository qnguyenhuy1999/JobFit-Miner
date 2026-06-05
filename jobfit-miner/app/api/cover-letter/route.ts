import { z } from "zod";
import { generateCoverLetter } from "@/lib/scorer";

const bodySchema = z.object({
  profile: z.string().min(1),
  job: z.object({
    title: z.string(),
    company: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
  }),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  const { profile, job } = parsed.data;
  const coverLetter = await generateCoverLetter(profile, job);

  return Response.json({ coverLetter });
}
