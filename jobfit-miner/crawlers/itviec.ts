import { chromium } from "playwright";
import type { JobCrawler, JobItem } from "@/lib/types";

export const itviecCrawler: JobCrawler = {
  canHandle(url: string) {
    return url.includes("itviec.com");
  },

  async mine(siteUrl: string, keyword: string, location?: string): Promise<JobItem[]> {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
      const base = siteUrl.replace(/\/$/, "");
      const params = new URLSearchParams({ query: keyword });
      if (location) params.set("location", location);
      const searchUrl = `${base}/it-jobs?${params.toString()}`;
      await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(3000);

      const jobs = await page.evaluate(() => {
        const cards = document.querySelectorAll('[data-controller="job-card"]');
        const results: Array<{
          title: string;
          company: string;
          location: string;
          url: string;
          description: string;
        }> = [];

        cards.forEach((card) => {
          const titleEl = card.querySelector("h3 a, .job_title a, [class*='title'] a");
          const companyEl = card.querySelector("[class*='company'], .employer-name");
          const locationEl = card.querySelector("[class*='location']");
          const descEl = card.querySelector("[class*='description'], [class*='skill']");

          const title = titleEl?.textContent?.trim();
          const href = (titleEl as HTMLAnchorElement)?.href;

          if (title && href && href.includes("/it-jobs/")) {
            results.push({
              title,
              company: companyEl?.textContent?.trim() ?? "",
              location: locationEl?.textContent?.trim() ?? "",
              url: href,
              description: descEl?.textContent?.trim() ?? "",
            });
          }
        });

        // Fallback: generic job link scrape if no cards found
        if (results.length === 0) {
          document.querySelectorAll("a").forEach((a) => {
            const title = a.textContent?.trim();
            if (title && a.href.match(/itviec\.com\/it-jobs\/.+/)) {
              results.push({
                title,
                company: "",
                location: "",
                url: a.href,
                description: "",
              });
            }
          });
        }

        return results.slice(0, 20);
      });

      return jobs.map((j) => ({
        site: "itviec",
        title: j.title,
        company: j.company || undefined,
        location: j.location || undefined,
        url: j.url,
        description: j.description || undefined,
      }));
    } finally {
      await browser.close();
    }
  },
};
