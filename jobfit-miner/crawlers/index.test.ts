import test from "node:test";
import assert from "node:assert/strict";

import { __testables } from "./index.ts";

test("getCrawlerByUrl resolves linkedin topcv and vietnamworks", () => {
  assert.equal(
    __testables.getCrawlerByUrl("https://www.linkedin.com/jobs"),
    "linkedin",
  );
  assert.equal(
    __testables.getCrawlerByUrl("https://www.topcv.vn/tim-viec-lam"),
    "topcv",
  );
  assert.equal(
    __testables.getCrawlerByUrl("https://www.vietnamworks.com"),
    "vietnamworks",
  );
});
