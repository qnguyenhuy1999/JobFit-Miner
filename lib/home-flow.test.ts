import test from "node:test";
import assert from "node:assert/strict";

import { buildPresetPayload, getPostAnalyzeStep } from "./home-flow.ts";

test("buildPresetPayload keeps tech stack and expectations as objects", () => {
  const payload = buildPresetPayload({
    name: "Frontend search",
    siteUrl: "https://itviec.com",
    keyword: "React Node.js",
    location: "Ho Chi Minh City",
    techStack: {
      primary: "React, Next.js",
      secondary: "Node.js",
      learning: "AWS",
      avoid: "PHP",
      seniority: "middle",
    },
    expectations: {
      preferredWorkModes: ["remote", "hybrid"],
      minimumSalary: "2500",
      requiredBenefits: "social insurance",
      niceToHaveBenefits: "laptop",
      locations: "Ho Chi Minh City",
      note: "Product teams only",
    },
  });

  assert.equal(typeof payload.techStack, "object");
  assert.equal(typeof payload.expectations, "object");
  assert.deepEqual(payload.techStack, {
    primary: "React, Next.js",
    secondary: "Node.js",
    learning: "AWS",
    avoid: "PHP",
    seniority: "middle",
  });
  assert.deepEqual(payload.expectations, {
    preferredWorkModes: ["remote", "hybrid"],
    minimumSalary: "2500",
    requiredBenefits: "social insurance",
    niceToHaveBenefits: "laptop",
    locations: "Ho Chi Minh City",
    note: "Product teams only",
  });
});

test("getPostAnalyzeStep keeps the user on results when only existing matches were found", () => {
  assert.equal(getPostAnalyzeStep({ newJobsCount: 0, existingCount: 4 }), 3);
});

test("getPostAnalyzeStep returns to configure when no matches were found at all", () => {
  assert.equal(getPostAnalyzeStep({ newJobsCount: 0, existingCount: 0 }), 1);
});
