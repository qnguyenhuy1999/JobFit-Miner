import { z } from "zod";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = ["new", "saved", "interested", "applied", "rejected", "ignored"] as const;

const bodySchema = z.object({
  status: z.enum(VALID_STATUSES),
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

  const job = await prisma.job.update({
    where: { id: jobId },
    data: { status: parsed.data.status },
  });

  return Response.json({ job });
}
