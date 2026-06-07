import { itviecCrawler } from "./itviec.ts";
import { linkedinCrawler } from "./linkedin.ts";
import { topcvCrawler } from "./topcv.ts";
import { vietnamworksCrawler } from "./vietnamworks.ts";
import type { JobItem } from "../lib/types.ts";
import { getCrawlerSiteName } from "./sites.ts";

const crawlers = [itviecCrawler, linkedinCrawler, topcvCrawler, vietnamworksCrawler];

export async function mineJobs(siteUrl: string, keyword: string, location?: string): Promise<JobItem[]> {
  const crawler = crawlers.find((c) => c.canHandle(siteUrl));
  if (!crawler) throw new Error(`Unsupported site: ${siteUrl}`);
  return crawler.mine(siteUrl, keyword, location);
}

export function getCrawlerForUrl(siteUrl: string) {
  return crawlers.find((c) => c.canHandle(siteUrl)) ?? null;
}

export const __testables = {
  getCrawlerByUrl: getCrawlerSiteName,
};
