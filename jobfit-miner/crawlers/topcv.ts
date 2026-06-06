import type { JobCrawler } from "../lib/types.ts";
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
};
