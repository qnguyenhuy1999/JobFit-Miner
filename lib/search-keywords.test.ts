import test from "node:test";
import assert from "node:assert/strict";
import { buildSearchKeywords } from "./search-keywords.ts";

const empty = { primary: [], secondary: [], learning: [], avoid: [] };

test("returns software engineer when no primary", () => {
  const result = buildSearchKeywords({ techStack: empty });
  assert.ok(result.some((k) => /software engineer/i.test(k)));
});

test("returns Frontend Engineer for React only", () => {
  const result = buildSearchKeywords({
    techStack: { ...empty, primary: ["React"] },
  });
  assert.ok(result.some((k) => k.toLowerCase().includes("frontend")));
});

test("returns Fullstack for React + Node.js", () => {
  const result = buildSearchKeywords({
    techStack: { ...empty, primary: ["React", "Node.js"] },
  });
  assert.ok(result.some((k) => k.toLowerCase().includes("fullstack")));
});

test("includes role intent and specific tech stack for fullstack", () => {
  const result = buildSearchKeywords({
    techStack: {
      ...empty,
      primary: ["React", "Next.js", "Node.js", "NestJS"],
      seniority: "middle",
    },
  });
  assert.ok(
    result.some((k) => /middle fullstack javascript react next\.js node\.js nestjs/i.test(k)),
  );
});

test("baseKeyword appears first", () => {
  const result = buildSearchKeywords({
    techStack: { ...empty, primary: ["React"] },
    baseKeyword: "Frontend Developer",
  });
  assert.equal(result[0], "Frontend Developer");
});

test("seniority prefix applied", () => {
  const result = buildSearchKeywords({
    techStack: { ...empty, primary: ["React"], seniority: "senior" },
  });
  assert.ok(result.some((k) => k.toLowerCase().startsWith("senior")));
});

test("deduplication works", () => {
  const result = buildSearchKeywords({
    techStack: { ...empty, primary: ["React"] },
    baseKeyword: "Frontend Engineer React",
  });
  assert.equal(result.length, new Set(result).size);
});

test("caps at 5 keywords", () => {
  const result = buildSearchKeywords({
    techStack: { ...empty, primary: ["React", "Vue", "Angular", "Svelte"] },
    baseKeyword: "something",
  });
  assert.ok(result.length <= 5);
});
