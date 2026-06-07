import type { JobCrawler } from "../lib/types.ts";
import type { RawJob, DetailedJob } from "../lib/types.ts";
import { minePublicJobs } from "./shared.ts";

export const vietnamworksCrawler: JobCrawler = {
  canHandle(url: string) {
    return url.includes("vietnamworks.com");
  },

  async mine(siteUrl: string, keyword: string, location?: string) {
    return minePublicJobs(
      {
        site: "vietnamworks",
        siteUrl,
        async search(page, searchKeyword, searchLocation) {
          await page.goto(siteUrl, { waitUntil: "domcontentloaded" });
          const keywordInput = page.locator(
            "input.class-input-recommend, input[placeholder*='Tìm kiếm việc làm'], input[placeholder*='Vị trí'], input[placeholder*='Job'], input[name*='keyword'], input[type='search']",
          ).first();
          if ((await keywordInput.count()) > 0) {
            await keywordInput.fill(searchKeyword);
            await page.getByRole("button", { name: "Tìm kiếm" }).first().click();
            return;
          }

          const params = new URLSearchParams({ keyword: searchKeyword });
          if (searchLocation) params.set("location", searchLocation);
          await page.goto(
            `${siteUrl.replace(/\/$/, "")}/viec-lam?${params.toString()}`,
            { waitUntil: "domcontentloaded" },
          );
        },
        dom: {
          cardSelectors: [".job-item", "[class*='job-card']", "article", "li"],
          titleSelectors: [
            "a.sc-ff8b57fd-8",
            "a[href*='-jv']:not(.sc-ff8b57fd-2)",
            "h2 a",
            "h3 a",
          ],
          companySelectors: [
            "div.sc-ff8b57fd-9",
            "[class*='company']",
            "[class*='brand']",
            "[class*='employer']",
          ],
          locationSelectors: [
            "div.sc-ff8b57fd-10",
            "[class*='location']",
            "[class*='address']",
            "[class*='job-location']",
          ],
          linkSelectors: [
            "a.sc-ff8b57fd-8",
            "a[href*='-jv']:not(.sc-ff8b57fd-2)",
            "a[href*='-jv']",
          ],
          jobUrlIncludes: ["-jv"],
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
