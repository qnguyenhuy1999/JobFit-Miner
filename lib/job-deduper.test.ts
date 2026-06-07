import test from "node:test";
import assert from "node:assert/strict";

import { splitJobsByKnownUrls } from "./job-deduper.ts";
import type { JobItem } from "./types.ts";

const jobs: JobItem[] = [
  {
    site: "itviec",
    title: "Frontend Engineer",
    url: "https://example.com/jobs/frontend",
  },
  {
    site: "itviec",
    title: "Backend Engineer",
    url: "https://example.com/jobs/backend",
  },
  {
    site: "itviec",
    title: "Frontend Engineer duplicate",
    url: "https://example.com/jobs/frontend",
  },
  {
    site: "itviec",
    title: "Already Saved",
    url: "https://example.com/jobs/saved",
  },
];

test("splitJobsByKnownUrls separates new jobs from previously stored jobs", () => {
  const result = splitJobsByKnownUrls(jobs, [
    "https://example.com/jobs/saved",
  ]);

  assert.deepEqual(
    result.newJobs.map((job) => job.url),
    ["https://example.com/jobs/frontend", "https://example.com/jobs/backend"],
  );
  assert.deepEqual(
    result.existingJobs.map((job) => job.url),
    [
      "https://example.com/jobs/frontend",
      "https://example.com/jobs/saved",
    ],
  );
});
