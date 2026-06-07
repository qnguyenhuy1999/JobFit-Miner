import type { JobCrawler } from "../lib/types.ts";
import type { RawJob, DetailedJob } from "../lib/types.ts";
import { minePublicJobs } from "./shared.ts";

function toTopCvKeywordSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const topcvCrawler: JobCrawler = {
  canHandle(url: string) {
    return url.includes("topcv.vn");
  },

  async mine(siteUrl: string, keyword: string, location?: string) {
    return minePublicJobs(
      {
        site: "topcv",
        siteUrl,
        async search(page, searchKeyword) {
          const slug = toTopCvKeywordSlug(searchKeyword);
          await page.goto(
            `${siteUrl.replace(/\/$/, "")}/tim-viec-lam-${slug}?type_keyword=1&sba=1`,
            { waitUntil: "domcontentloaded" },
          );
        },
        dom: {
          cardSelectors: [
            ".job-item-search-result",
            ".job-item-default",
            "[class*='job-item']",
            "[class*='job-card']",
            "article",
            "li",
          ],
          titleSelectors: [
            ".title a",
            "h3 a",
            "h3",
            "a[href*='/viec-lam/']",
          ],
          companySelectors: [
            ".company-name",
            ".company",
            "[class*='company']",
            "[class*='company-name']",
            "h4",
          ],
          locationSelectors: [
            ".address",
            "[class*='address']",
            "[class*='location']",
            "[class*='city']",
          ],
          linkSelectors: [".title a", "a[href*='/viec-lam/']", "a"],
          jobUrlIncludes: ["/viec-lam/"],
        },
      },
      keyword,
      location,
    );
  },

  async extractDetail(page: import("playwright").Page, job: RawJob): Promise<DetailedJob> {
    try {
      await page.goto(job.url, { waitUntil: "domcontentloaded", timeout: 15000 });
      await page.waitForSelector(".job-description, [class*='description'], .job-detail", { timeout: 8000 }).catch(() => null);
      const fullDescription = await page.evaluate(() => {
        const el = document.querySelector(".job-description") ?? document.querySelector("[class*='description']") ?? document.querySelector(".job-detail");
        return (el as HTMLElement | null)?.innerText?.trim() ?? null;
      }).catch(() => null);
      const salary = await page.evaluate(() => {
        const el = document.querySelector("[class*='salary'], .salary");
        return (el as HTMLElement | null)?.innerText?.trim() ?? null;
      }).catch(() => null);
      const workMode = await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        if (/remote|làm từ xa/.test(text)) return "remote";
        if (/hybrid|kết hợp/.test(text)) return "hybrid";
        return null;
      }).catch(() => null);
      return { ...job, fullDescription: fullDescription ?? job.description, salary, workMode };
    } catch {
      return { ...job, fullDescription: job.description };
    }
  },
};
