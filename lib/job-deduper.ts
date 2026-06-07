import type { JobItem } from "./types";

function normalizeText(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

function fuzzyKey(job: JobItem) {
  return `${normalizeText(job.title)}::${normalizeText(job.company ?? "")}`;
}

function normalizeUrl(url: string) {
  try {
    const u = new URL(url);
    u.search = "";
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

export function splitJobsByKnownUrls(
  jobs: JobItem[],
  knownUrls: string[],
) {
  const seenUrls = new Set(knownUrls.map(normalizeUrl));
  const seenFuzzy = new Set<string>();
  const newJobs: JobItem[] = [];
  const existingJobs: JobItem[] = [];

  for (const job of jobs) {
    const canonicalUrl = normalizeUrl(job.url);
    const fkey = fuzzyKey(job);

    if (seenUrls.has(canonicalUrl) || seenFuzzy.has(fkey)) {
      existingJobs.push(job);
      continue;
    }

    seenUrls.add(canonicalUrl);
    seenFuzzy.add(fkey);
    newJobs.push(job);
  }

  return { newJobs, existingJobs };
}
