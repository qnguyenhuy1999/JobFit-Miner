import { chromium, type Page } from "playwright";
import { extractJobsWithConfiguredAi } from "../lib/ai-job-miner.ts";
import type { JobItem } from "../lib/types.ts";

type RawJob = {
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
};

type ScrapeResult = {
  jobs: RawJob[];
  pageUrl: string;
  html: string;
};

type SiteDomConfig = {
  cardSelectors: string[];
  titleSelectors: string[];
  companySelectors: string[];
  locationSelectors: string[];
  linkSelectors: string[];
  jobUrlIncludes: string[];
};

export type PublicCrawlerConfig = {
  site: string;
  siteUrl: string;
  dom: SiteDomConfig;
  search(page: Page, keyword: string, location?: string): Promise<void>;
};

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";

async function waitForAccessibleResults(page: Page) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const title = await page.title();
    const bodyText = await page
      .locator("body")
      .evaluate((body) => body.textContent?.slice(0, 300) ?? "");

    const blocked =
      title.includes("Attention Required!") ||
      title.includes("403 Forbidden") ||
      bodyText.includes("Sorry, you have been blocked");

    if (!blocked) return;
    await page.waitForTimeout(5000);
  }
}

function toAbsoluteUrl(url: string, baseUrl: string) {
  return new URL(url, baseUrl).toString();
}

async function scrapeSearchResults(
  config: PublicCrawlerConfig,
  keyword: string,
  location?: string,
  headless = true,
): Promise<ScrapeResult> {
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    userAgent: DEFAULT_USER_AGENT,
    locale: "vi-VN",
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: {
      "accept-language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });
  const page = await context.newPage();

  try {
    await config.search(page, keyword, location);
    await waitForAccessibleResults(page);
    await page.waitForTimeout(5000);

    const jobs = await page.evaluate((domConfig: SiteDomConfig) => {
      const normalize = (value?: string | null) =>
        value?.replace(/\s+/g, " ").trim() ?? "";

      const firstText = (root: ParentNode, selectors: string[]) => {
        for (const selector of selectors) {
          const element = root.querySelector(selector);
          const value = normalize(element?.textContent);
          if (value) return value;
        }
        return "";
      };

      const firstHref = (root: ParentNode, selectors: string[]) => {
        for (const selector of selectors) {
          const element = root.querySelector(selector);
          if (!element) continue;

          const href =
            element.getAttribute("href") ||
            element.getAttribute("data-url") ||
            element.getAttribute("data-href") ||
            "";
          if (href) return href;
        }
        return "";
      };

      const cards = domConfig.cardSelectors.flatMap((selector) =>
        [...document.querySelectorAll(selector)],
      );
      const seen = new Set<string>();

      return cards
        .map((card) => {
          const title = firstText(card, domConfig.titleSelectors);
          const url = firstHref(card, domConfig.linkSelectors);
          const company = firstText(card, domConfig.companySelectors);
          const location = firstText(card, domConfig.locationSelectors);
          const description = normalize(card.textContent);

          if (!title || !url) return null;
          if (
            domConfig.jobUrlIncludes.length > 0 &&
            !domConfig.jobUrlIncludes.some((pattern) => url.includes(pattern))
          ) {
            return null;
          }

          const key = `${title}::${url}`;
          if (seen.has(key)) return null;
          seen.add(key);

          return { title, company, location, url, description };
        })
        .filter((job): job is RawJob => Boolean(job))
        .slice(0, 20);
    }, config.dom);

    const html = await page.locator("body").evaluate((body) => body.innerHTML);
    return { jobs, pageUrl: page.url(), html };
  } finally {
    await context.close();
    await browser.close();
  }
}

function normalizeJobs(
  site: string,
  pageUrl: string,
  jobs: RawJob[],
): JobItem[] {
  return jobs.map((job) => ({
    site,
    title: job.title,
    company: job.company || undefined,
    location: job.location || undefined,
    url: toAbsoluteUrl(job.url, pageUrl),
    description: job.description || undefined,
  }));
}

export async function minePublicJobs(
  config: PublicCrawlerConfig,
  keyword: string,
  location?: string,
): Promise<JobItem[]> {
  const preferHeadful = process.env.PLAYWRIGHT_HEADFUL === "1";
  const result = preferHeadful
    ? await scrapeSearchResults(config, keyword, location, false)
    : await scrapeSearchResults(config, keyword, location, true);
  const resolvedResult =
    result.jobs.length > 0 || preferHeadful
      ? result
      : await scrapeSearchResults(config, keyword, location, false);

  if (resolvedResult.jobs.length > 0) {
    return normalizeJobs(config.site, resolvedResult.pageUrl, resolvedResult.jobs);
  }

  return extractJobsWithConfiguredAi({
    site: config.site,
    siteUrl: config.siteUrl,
    pageUrl: resolvedResult.pageUrl,
    keyword,
    location,
    html: resolvedResult.html,
  });
}
