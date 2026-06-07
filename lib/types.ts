export type JobItem = {
  site: string;
  title: string;
  company?: string;
  location?: string;
  url: string;
  description?: string;
};

export type JobMatchDebug = {
  passed: boolean;
  reasons: string[];
  matchedPrimaryCount: number;
  avoidFound: string[];
  workModeSatisfied: boolean;
};

export type CandidateTechStack = {
  primary: string[];
  secondary: string[];
  learning: string[];
  avoid: string[];
  seniority?: "intern" | "junior" | "middle" | "senior" | "lead";
};

export type CandidateExpectations = {
  preferredWorkModes: Array<"remote" | "hybrid" | "onsite">;
  minimumSalary?: string;
  requiredBenefits: string[];
  niceToHaveBenefits: string[];
  locations: string[];
  note?: string;
};

export type RawJob = {
  title: string;
  company?: string | null;
  location?: string | null;
  url: string;
  description?: string | null;
};

export type DetailedJob = RawJob & {
  site?: string;
  fullDescription?: string | null;
  salary?: string | null;
  workMode?: string | null;
  benefits?: string[];
};

export interface JobCrawler {
  canHandle(url: string): boolean;
  mine(url: string, keyword: string, location?: string): Promise<JobItem[]>;
  extractDetail?(page: import("playwright").Page, job: RawJob): Promise<DetailedJob>;
}
