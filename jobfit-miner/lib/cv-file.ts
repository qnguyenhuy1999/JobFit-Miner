import { readFile } from "node:fs/promises";
import path from "node:path";

import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

function getExtension(name: string) {
  return name.toLowerCase().split(".").pop() ?? "";
}

let pdfWorkerSourcePromise: Promise<string> | null = null;

function resolvePdfWorkerFile() {
  return path.join(
    process.cwd(),
    "node_modules",
    "pdf-parse",
    "dist",
    "worker",
    "pdf.worker.mjs",
  );
}

async function getPdfWorkerSource() {
  if (!pdfWorkerSourcePromise) {
    pdfWorkerSourcePromise = readFile(resolvePdfWorkerFile()).then(
      (workerFile) =>
        `data:text/javascript;base64,${workerFile.toString("base64")}`,
    );
  }
  return pdfWorkerSourcePromise;
}

async function ensurePdfWorkerConfigured() {
  const workerSrc = await getPdfWorkerSource();
  PDFParse.setWorker(workerSrc);
  return workerSrc;
}

function isTextFile(file: File) {
  const extension = getExtension(file.name);
  return (
    file.type.startsWith("text/") ||
    ["txt", "md", "rtf"].includes(extension)
  );
}

async function fileToBuffer(file: File) {
  return Buffer.from(await file.arrayBuffer());
}

export async function extractTextFromCvFile(file: File) {
  const extension = getExtension(file.name);

  if (isTextFile(file)) {
    return file.text();
  }

  const buffer = await fileToBuffer(file);

  if (file.type === "application/pdf" || extension === "pdf") {
    await ensurePdfWorkerConfigured();
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  if (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === "docx"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new Error("Upload a PDF, DOCX, or text CV.");
}

export const __testables = {
  ensurePdfWorkerConfigured,
  getPdfWorkerSource,
  resolvePdfWorkerFile,
};
