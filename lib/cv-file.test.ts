import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PDFParse } from "pdf-parse";

import { __testables, extractTextFromCvFile } from "./cv-file.ts";

test("extractTextFromCvFile reads plain text CV uploads", async () => {
  const file = new File(["React Node.js TypeScript"], "cv.txt", {
    type: "text/plain",
  });

  const result = await extractTextFromCvFile(file);

  assert.equal(result, "React Node.js TypeScript");
});

test("ensurePdfWorkerConfigured provides an inline worker source for server-side PDF parsing", async () => {
  const workerSrc = await __testables.ensurePdfWorkerConfigured();
  const expectedWorkerSrc = `data:text/javascript;base64,${(
    await readFile(__testables.resolvePdfWorkerFile())
  ).toString("base64")}`;

  assert.equal(workerSrc.startsWith("data:text/javascript;base64,"), true);
  assert.equal(workerSrc, expectedWorkerSrc);
  assert.equal(PDFParse.setWorker(), workerSrc);
});
