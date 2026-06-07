import test from "node:test";
import assert from "node:assert/strict";

import { __testables } from "./scorer.ts";

test("parseStructuredOutput returns parsed payload when SDK parsed output is present", () => {
  const result = __testables.parseStructuredOutput<{ score: number }>({
    choices: [
      {
        message: {
          parsed: {
            score: 88,
          },
        },
      },
    ],
  });

  assert.deepEqual(result, { score: 88 });
});

test("parseStructuredOutput falls back to JSON content when provider does not support SDK parse helper", () => {
  const result = __testables.parseStructuredOutput<{
    score: number;
    reason: string;
  }>({
    choices: [
      {
        message: {
          content: JSON.stringify({
            score: 91,
            reason: "Strong match",
          }),
        },
      },
    ],
  });

  assert.deepEqual(result, {
    score: 91,
    reason: "Strong match",
  });
});

test("parseStructuredOutput throws when provider response has no usable structured payload", () => {
  assert.throws(
    () =>
      __testables.parseStructuredOutput({
        choices: [
          {
            message: {
              content: "not json",
            },
          },
        ],
      }),
    /No structured result/,
  );
});

test("buildScorePrompt asks the core AI scorer to evaluate JD expectations", () => {
  const prompt = __testables.buildScorePrompt(
    "React, Node.js, TypeScript",
    {
      title: "Fullstack Engineer",
      company: "Acme",
      location: "Remote",
      description: "Own product requirements and build APIs.",
    },
    "I prefer product-minded roles with modern TypeScript stacks.",
  );

  assert.match(prompt, /evaluate this JD/i);
  assert.match(prompt, /Candidate expectations/i);
  assert.match(prompt, /product-minded roles/i);
  assert.match(prompt, /Return valid JSON only/);
  assert.match(prompt, /expectation fit/i);
});
