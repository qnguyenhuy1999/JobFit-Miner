import type { JobCrawler } from "@/lib/types";

// LinkedIn stub: public job list browsing only.
// No login, no apply automation, no hidden scraping.
export const linkedinCrawler: JobCrawler = {
  canHandle(url: string) {
    return url.includes("linkedin.com");
  },

  async mine(_siteUrl: string, _keyword: string) {
    throw new Error(
      "LinkedIn crawler not yet implemented. Use itviec.com for now."
    );
  },
};
