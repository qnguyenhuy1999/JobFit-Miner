import test from "node:test";
import assert from "node:assert/strict";

import {
  buildJobListWhere,
  buildPagination,
  normalizeJobListParams,
} from "./job-listing.ts";

test("normalizeJobListParams trims values and clamps pagination inputs", () => {
  const params = new URLSearchParams({
    page: "0",
    pageSize: "500",
    query: "  React engineer  ",
    site: " linkedin ",
    location: " remote ",
    minScore: "70",
  });

  assert.deepEqual(normalizeJobListParams(params), {
    page: 1,
    pageSize: 50,
    query: "React engineer",
    site: "linkedin",
    location: "remote",
    minScore: 70,
    status: "",
    hideRejected: false,
  });
});

test("buildJobListWhere creates a search filter across title company and location", () => {
  assert.deepEqual(
    buildJobListWhere({
      page: 1,
      pageSize: 10,
      query: "react",
      site: "linkedin",
      location: "remote",
      minScore: 70,
      status: "",
      hideRejected: false,
    }),
    {
      site: "linkedin",
      location: {
        contains: "remote",
      },
      score: {
        gte: 70,
      },
      OR: [
        {
          title: {
            contains: "react",
          },
        },
        {
          company: {
            contains: "react",
          },
        },
        {
          location: {
            contains: "react",
          },
        },
      ],
    },
  );
});

test("buildPagination reports previous and next page availability", () => {
  assert.deepEqual(buildPagination({ page: 2, pageSize: 10, total: 23 }), {
    page: 2,
    pageSize: 10,
    total: 23,
    pageCount: 3,
    hasPreviousPage: true,
    hasNextPage: true,
  });
});
