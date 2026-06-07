import type { JobCrawler } from "../lib/types.ts";
import type { RawJob, DetailedJob } from "../lib/types.ts";
import { minePublicJobs } from "./shared.ts";

export const linkedinCrawler: JobCrawler = {
  canHandle(url: string) {
    return url.includes("linkedin.com");
  },

  async mine(siteUrl: string, keyword: string, location?: string) {
    return minePublicJobs(
      {
        site: "linkedin",
        siteUrl,
        async search(page, searchKeyword, searchLocation) {
          const params = new URLSearchParams({ keywords: searchKeyword });
          if (searchLocation) params.set("location", searchLocation);
          await page.goto(`${siteUrl.replace(/\/$/, "")}/jobs/search/?${params.toString()}`, {
            waitUntil: "domcontentloaded",
          });
        },
        dom: {
          cardSelectors: [".base-search-card", ".job-search-card", "li"],
          titleSelectors: [
            ".base-search-card__title",
            ".job-search-card__title",
            "h3",
            "a",
          ],
          companySelectors: [
            ".base-search-card__subtitle",
            "h4",
            ".hidden-nested-link",
          ],
          locationSelectors: [
            ".job-search-card__location",
            ".base-search-card__metadata",
            "span",
          ],
          linkSelectors: [
            "a.base-card__full-link",
            "a[href*='/jobs/view/']",
            "a",
          ],
          jobUrlIncludes: ["/jobs/view/"],
        },
      },
      keyword,
      location,
    );
  },

  async extractDetail(page: import("playwright").Page, job: RawJob): Promise<DetailedJob> {
    try {
      await page.goto(job.url, { waitUntil: "domcontentloaded", timeout: 15000 });
      const currentUrl = page.url();
      if (currentUrl.includes("/login") || currentUrl.includes("/authwall") || currentUrl.includes("/checkpoint")) {
        return { ...job, fullDescription: job.description };
      }
      await page.waitForSelector(".description__text, .show-more-less-html", { timeout: 8000 }).catch(() => null);
      const fullDescription = await page.evaluate(() => {
        const el = document.querySelector(".description__text") ?? document.querySelector(".show-more-less-html");
        return (el as HTMLElement | null)?.innerText?.trim() ?? null;
      }).catch(() => null);
      return { ...job, fullDescription: fullDescription ?? job.description };
    } catch {
      return { ...job, fullDescription: job.description };
    }
  },
};
