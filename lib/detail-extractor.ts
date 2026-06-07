import { chromium } from "playwright";
import type { RawJob, DetailedJob, JobCrawler } from "./types";

const DEFAULT_MAX = 20;

export async function extractJobDetails(
  jobs: RawJob[],
  crawler: JobCrawler,
  maxJobs = DEFAULT_MAX,
): Promise<{ detailed: DetailedJob[]; errors: string[] }> {
  if (!crawler.extractDetail) {
    return { detailed: jobs.slice(0, maxJobs).map((j) => ({ ...j })), errors: [] };
  }

  const limit = Math.min(jobs.length, maxJobs);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const detailed: DetailedJob[] = [];
  const errors: string[] = [];

  for (let i = 0; i < limit; i++) {
    try {
      const result = await crawler.extractDetail(page, jobs[i]);
      detailed.push(result);
    } catch (err) {
      errors.push(`[${jobs[i].url}] ${String(err)}`);
      detailed.push({ ...jobs[i] });
    }
  }

  await browser.close();
  return { detailed, errors };
}
