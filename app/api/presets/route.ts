import { z } from "zod";
import { getPresets, createPreset } from "@/lib/repository";

const createBodySchema = z.object({
  name: z.string().min(1),
  siteUrl: z.string().url(),
  keyword: z.string().min(1),
  location: z.string().optional(),
  techStack: z.record(z.string(), z.unknown()).optional(),
  expectations: z.record(z.string(), z.unknown()).optional(),
});

export async function GET() {
  const presets = await getPresets();
  return Response.json({ presets });
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = createBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  const preset = await createPreset(parsed.data);
  return Response.json({ preset }, { status: 201 });
}
