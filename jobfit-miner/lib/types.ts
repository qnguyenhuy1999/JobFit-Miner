export type JobItem = {
  site: string;
  title: string;
  company?: string;
  location?: string;
  url: string;
  description?: string;
};

export interface JobCrawler {
  canHandle(url: string): boolean;
  mine(url: string, keyword: string, location?: string): Promise<JobItem[]>;
}
