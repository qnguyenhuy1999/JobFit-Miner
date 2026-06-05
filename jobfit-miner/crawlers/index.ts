import { itviecCrawler } from "./itviec";
import { linkedinCrawler } from "./linkedin";
import type { JobItem } from "@/lib/types";

const crawlers = [itviecCrawler, linkedinCrawler];

export async function mineJobs(siteUrl: string, keyword: string, location?: string): Promise<JobItem[]> {
  const crawler = crawlers.find((c) => c.canHandle(siteUrl));
  if (!crawler) throw new Error(`Unsupported site: ${siteUrl}`);
  return crawler.mine(siteUrl, keyword, location);
}
