export const SUPPORTED_SITES = [
  {
    name: "itviec",
    label: "ITviec",
    baseUrl: "https://itviec.com",
    hostPatterns: ["itviec.com"],
  },
  {
    name: "linkedin",
    label: "LinkedIn",
    baseUrl: "https://www.linkedin.com",
    hostPatterns: ["linkedin.com"],
  },
  {
    name: "topcv",
    label: "TopCV",
    baseUrl: "https://www.topcv.vn",
    hostPatterns: ["topcv.vn"],
  },
  {
    name: "vietnamworks",
    label: "VietnamWorks",
    baseUrl: "https://www.vietnamworks.com",
    hostPatterns: ["vietnamworks.com"],
  },
] as const;

export type SupportedSiteName = (typeof SUPPORTED_SITES)[number]["name"];

export function getCrawlerSiteName(url: string): SupportedSiteName | null {
  return (
    SUPPORTED_SITES.find((site) =>
      site.hostPatterns.some((pattern) => url.includes(pattern)),
    )?.name ?? null
  );
}
