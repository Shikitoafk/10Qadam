import { test } from "node:test";
import assert from "node:assert/strict";
import { readRoute, pagePath, LEARNING_LEVELS } from "../src/routes.js";

test("intro, learning and arena have independent URLs", () => {
  assert.equal(readRoute("/").page, "welcome");
  for (const page of ["arena", "words", "leaders", "profile", "plan"])
    assert.equal(readRoute(pagePath(page)).page, page);
  assert.equal(readRoute("/learn/").page, "study");
});
test("every learning level has a direct link, independent of rated A1/A2", () => {
  for (const level of LEARNING_LEVELS)
    assert.deepEqual(readRoute(pagePath("study", level)), {
      page: "study",
      level,
    });
  assert.equal(readRoute("/learn/c1/").level, "C1");
  assert.equal(readRoute("/learn/C2").level, null);
  assert.equal(pagePath("study", "<script>"), "/learn");
});
