import { z } from "zod";
import { generateCoverLetter, type CoverLetterStyle, type MessageType } from "@/lib/scorer";

const bodySchema = z.object({
  profile: z.string().min(1),
  job: z.object({
    title: z.string(),
    company: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
  }),
  style: z.enum(["professional", "friendly", "short", "startup", "corporate", "vietnamese", "bilingual"]).optional(),
  messageType: z.enum(["cover_letter", "recruiter_message", "linkedin_message", "email_application", "resume_tips"]).optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  const { profile, job, style, messageType } = parsed.data;
  const coverLetter = await generateCoverLetter(
    profile,
    job,
    (style as CoverLetterStyle) ?? "professional",
    (messageType as MessageType) ?? "cover_letter",
  );

  return Response.json({ coverLetter });
}
