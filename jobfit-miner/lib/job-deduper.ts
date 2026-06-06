import type { JobItem } from "./types";

export function splitJobsByKnownUrls(
  jobs: JobItem[],
  knownUrls: string[],
) {
  const seenUrls = new Set(knownUrls);
  const newJobs: JobItem[] = [];
  const existingJobs: JobItem[] = [];

  for (const job of jobs) {
    if (seenUrls.has(job.url)) {
      existingJobs.push(job);
      continue;
    }

    seenUrls.add(job.url);
    newJobs.push(job);
  }

  return { newJobs, existingJobs };
}
