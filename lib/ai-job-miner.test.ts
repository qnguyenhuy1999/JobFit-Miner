import test from "node:test";
import assert from "node:assert/strict";

import { extractJobsWithAi } from "./ai-job-miner.ts";

test("extractJobsWithAi normalizes AI extracted job listings", async () => {
  const completionCalls: unknown[] = [];
  const client = {
    chat: {
      completions: {
        create: async (payload: unknown) => {
          completionCalls.push(payload);
          return {
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    jobs: [
                      {
                        title: "  Frontend Engineer  ",
                        company: " Acme Labs ",
                        location: " Remote ",
                        url: "/jobs/frontend-engineer",
                        description: " Build React products. ",
                      },
                      {
                        title: "Missing URL",
                        url: "",
                      },
                    ],
                  }),
                },
              },
            ],
          };
        },
      },
    },
  };

  const jobs = await extractJobsWithAi({
    client,
    site: "itviec",
    siteUrl: "https://itviec.com",
    pageUrl: "https://itviec.com/it-jobs?query=react",
    keyword: "react",
    location: "remote",
    html: "<article><h2>Frontend Engineer</h2><a href='/jobs/frontend-engineer'>View</a></article>",
  });

  assert.deepEqual(jobs, [
    {
      site: "itviec",
      title: "Frontend Engineer",
      company: "Acme Labs",
      location: "Remote",
      url: "https://itviec.com/jobs/frontend-engineer",
      description: "Build React products.",
    },
  ]);
  assert.equal(completionCalls.length, 1);
  assert.match(JSON.stringify(completionCalls[0]), /react/);
});
