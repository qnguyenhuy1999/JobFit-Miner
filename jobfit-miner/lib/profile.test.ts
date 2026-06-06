import test from "node:test";
import assert from "node:assert/strict";

import { __testables } from "./profile.ts";

test("summarizeCvLocally extracts a concise reusable profile from CV text", () => {
  const result = __testables.summarizeCvLocally(`
    Jane Nguyen
    Senior Fullstack Engineer
    Email: jane@example.com

    Experience
    5 years building React, Next.js, Node.js, and PostgreSQL products.
    Led migration to TypeScript and mentored two junior engineers.

    Education
    BS Computer Science
  `);

  assert.match(result, /Senior Fullstack Engineer/);
  assert.match(result, /React/);
  assert.match(result, /TypeScript/);
  assert.doesNotMatch(result, /jane@example\.com/);
});

test("cleanCvText collapses whitespace and removes obvious contact noise", () => {
  const result = __testables.cleanCvText(`
    Phone: +84 900 000 000
    Portfolio: https://example.com

    React      Node.js
  `);

  assert.equal(result, "React Node.js");
});
