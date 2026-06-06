import { chromium } from "playwright";
import { extractJobsWithConfiguredAi } from "@/lib/ai-job-miner";
import type { JobCrawler, JobItem } from "@/lib/types";

type ScrapedJob = {
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
};

type ScrapeResult = {
  jobs: ScrapedJob[];
  pageUrl: string;
  html: string;
};

function toAbsoluteUrl(url: string, baseUrl: string) {
  return new URL(url, baseUrl).toString();
}

async function scrapeJobs(
  siteUrl: string,
  keyword: string,
  location?: string,
  headless = true,
): Promise<ScrapeResult> {
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage();

  try {
    const base = siteUrl.replace(/\/$/, "");
    const params = new URLSearchParams({ query: keyword });
    if (location) params.set("location", location);
    const searchUrl = `${base}/it-jobs?${params.toString()}`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);

    const jobs = await page.evaluate(() => {
      const normalize = (value?: string | null) =>
        value?.replace(/\s+/g, " ").trim() ?? "";
      const locationPattern =
        /(Remote(?:\s+Ha Noi\s+-\s+Da Nang\s+-\s+Ho Chi Minh)?|Hybrid|At office|Ho Chi Minh|Ha Noi|Da Nang)/i;

      return [...document.querySelectorAll(".job-card")]
        .map((card) => {
          const titleEl = card.querySelector("h3[data-url]");
          const title = normalize(titleEl?.textContent);
          const url = titleEl?.getAttribute("data-url") ?? "";
          const company =
            normalize(
              card
                .querySelector(".logo-employer-card")
                ?.getAttribute("data-bs-original-title"),
            ) ||
            normalize(
              card.querySelector(".logo-employer-card")?.getAttribute("title"),
            ) ||
            normalize(
              card
                .querySelector("img[alt*='Logo']")
                ?.getAttribute("alt")
                ?.replace(/\s+Vietnam.+$/, ""),
            );

          const textParts = [...card.querySelectorAll("*")]
            .map((el) => normalize(el.textContent))
            .filter(Boolean);
          const locationSource = textParts.find(
            (part) =>
              locationPattern.test(part) &&
              part.length < 80 &&
              part !== title &&
              part !== company,
          );
          const location = normalize(
            locationSource?.match(locationPattern)?.[0],
          );
          const description = normalize(card.textContent);

          if (!title || !url) return null;
          return { title, company, location, url, description };
        })
        .filter((job): job is ScrapedJob => Boolean(job))
        .slice(0, 20);
    });

    const html = await page.locator("body").evaluate((body) => body.innerHTML);
    return { jobs, pageUrl: searchUrl, html };
  } finally {
    await browser.close();
  }
}

async function mineWithAiFallback(
  siteUrl: string,
  keyword: string,
  location: string | undefined,
  scrapeResult: ScrapeResult,
): Promise<JobItem[]> {
  if (scrapeResult.jobs.length > 0) {
    return scrapeResult.jobs.map((job) => ({
      site: "itviec",
      title: job.title,
      company: job.company || undefined,
      location: job.location || undefined,
      url: toAbsoluteUrl(job.url, scrapeResult.pageUrl),
      description: job.description || undefined,
    }));
  }

  return extractJobsWithConfiguredAi({
    site: "itviec",
    siteUrl,
    pageUrl: scrapeResult.pageUrl,
    keyword,
    location,
    html: scrapeResult.html,
  });
}

export const itviecCrawler: JobCrawler = {
  canHandle(url: string) {
    return url.includes("itviec.com");
  },

  async mine(
    siteUrl: string,
    keyword: string,
    location?: string,
  ): Promise<JobItem[]> {
    const preferHeadful = process.env.PLAYWRIGHT_HEADFUL === "1";
    const result = preferHeadful
      ? await scrapeJobs(siteUrl, keyword, location, false)
      : await scrapeJobs(siteUrl, keyword, location, true);
    const resolvedResult =
      result.jobs.length > 0 || preferHeadful
        ? result
        : await scrapeJobs(siteUrl, keyword, location, false);

    return mineWithAiFallback(siteUrl, keyword, location, resolvedResult);
  },
};
