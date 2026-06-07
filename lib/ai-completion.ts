import { z } from "zod";

export type CompletionMessage = {
  parsed?: unknown;
  content?:
    | string
    | null
    | Array<{ type?: string; text?: string | { value?: string } }>;
};

export type CompletionLike = {
  choices?: Array<{
    message?: CompletionMessage;
  }>;
};

function extractTextContent(content: CompletionMessage["content"]) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;

  const text = content
    .map((part) => {
      if (typeof part?.text === "string") return part.text;
      if (typeof part?.text?.value === "string") return part.text.value;
      return "";
    })
    .join("")
    .trim();

  return text || null;
}

export function parseStructuredCompletion<T>(
  completion: CompletionLike,
  schema?: z.ZodType<T>,
  errorMessage = "No structured result returned by model",
): T {
  const message = completion.choices?.[0]?.message;
  if (message?.parsed != null) {
    return schema ? schema.parse(message.parsed) : (message.parsed as T);
  }

  const rawContent = extractTextContent(message?.content);
  if (!rawContent) throw new Error(errorMessage);

  let parsed: unknown;
  try {
    const jsonStr = rawContent
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(errorMessage);
  }

  return schema ? schema.parse(parsed) : (parsed as T);
}
