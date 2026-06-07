import { prisma } from "@/lib/prisma";

export async function GET() {
  const runs = await prisma.miningRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return Response.json({ runs });
}
