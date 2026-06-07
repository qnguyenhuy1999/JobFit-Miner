import { saveCandidateProfile } from "@/lib/repository";
import { extractProfileFromCv } from "@/lib/profile";
import { extractTextFromCvFile } from "@/lib/cv-file";

const MAX_CV_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("cv");
  const text = form.get("text");

  let cvText = "";
  let sourceName: string | undefined;

  if (file instanceof File) {
    if (file.size > MAX_CV_BYTES) {
      return Response.json(
        { error: "CV file must be 5MB or smaller." },
        { status: 400 },
      );
    }
    sourceName = file.name;
    cvText = await extractTextFromCvFile(file);
  } else if (typeof text === "string") {
    cvText = text;
  }

  if (!cvText.trim()) {
    return Response.json(
      { error: "Upload a text-based CV or paste CV text." },
      { status: 400 },
    );
  }

  try {
    const { summary } = await extractProfileFromCv(cvText);
    const profile = await saveCandidateProfile(summary, sourceName);
    return Response.json({ profile });
  } catch (err) {
    return Response.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not read and summarize this CV.",
      },
      { status: 500 },
    );
  }
}
