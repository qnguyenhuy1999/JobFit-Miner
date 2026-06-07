import { z } from "zod";
import { updateJobStatus, type JobStatus } from "@/lib/repository";

const bodySchema = z.object({
  status: z.enum([
    "new",
    "shortlisted",
    "applied",
    "rejected",
    "interviewing",
    "offer",
  ] as const),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const jobId = Number.parseInt(id, 10);
  if (!Number.isFinite(jobId)) {
    return Response.json({ error: "Invalid job id" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  const job = await updateJobStatus(jobId, parsed.data.status as JobStatus);
  return Response.json({ job });
}
