import { deletePreset } from "@/lib/repository";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const presetId = Number.parseInt(id, 10);
  if (!Number.isFinite(presetId)) {
    return Response.json({ error: "Invalid preset id" }, { status: 400 });
  }

  await deletePreset(presetId);
  return new Response(null, { status: 204 });
}
