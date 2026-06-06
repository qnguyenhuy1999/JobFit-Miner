import test from "node:test";
import assert from "node:assert/strict";

import { __testables } from "./scorer";

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
