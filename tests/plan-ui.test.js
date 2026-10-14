import { test } from "node:test";
import assert from "node:assert/strict";
import { createPlanController } from "../src/plan-ui.js";
import { PLAN_COPY } from "../src/plan-copy.js";

function examplePlan() {
  return {
    title: "A <strong>focused</strong> week",
    summary: "Build a habit",
    level: "C1",
    days: Array.from({ length: 7 }, (_, index) => ({
      day: index + 1,
      title: `Day ${index + 1}`,
      activities: [
        {
          kind: "words",
          minutes: 20,
          description: '<img src=x onerror="alert(1)">',
        },
      ],
    })),
  };
}
const tick = () => new Promise((resolve) => setImmediate(resolve));
function harness(
  t,
  fetcher = async () => new Response(JSON.stringify({ plan: examplePlan() })),
) {
  let user = { id: "user1" },
    lang = "en",
    renders = 0,
    signs = 0;
  const values = new Map(),
    calls = [],
    levels = [];
  t.mock.method(globalThis, "fetch", async (...args) => {
    calls.push(args);
    return fetcher(...args);
  });
  const storage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const ui = createPlanController({
    language: () => lang,
    escape: (value) =>
      String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll('"', "&quot;"),
    render: () => renders++,
    getLevel: () => "C1",
    getUser: () => user,
    getAccessToken: async () => "authenticated-token",
    onSignIn: () => signs++,
    openLevel: (level) => levels.push(level),
  });
  t.after(() => {
    ui.stop();
    if (storage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = storage;
  });
  const input = (name, value) =>
    ui.input({ target: { closest: () => true, name, value, checked: value } });
  const submit = () =>
    ui.submit({ target: { id: "study-plan-form" }, preventDefault() {} });
  const click = (planAction, activity) =>
    ui.click({
      target: { closest: () => ({ dataset: { planAction, activity } }) },
    });
  return {
    ui,
    input,
    submit,
    click,
    calls,
    values,
    levels,
    user: (value) => {
      user = value;
    },
    lang: (value) => {
      lang = value;
    },
    signs: () => signs,
    renders: () => renders,
  };
}

test("plan copy has English, Kazakh and Russian for every feature string", () => {
  for (const [key, values] of Object.entries(PLAN_COPY)) {
    assert.equal(values.length, 3, key);
    assert.ok(
      values.every((text) => typeof text === "string" && text.trim()),
      key,
    );
  }
});
test("guest plan submit requests login and never generates", async (t) => {
  const h = harness(t);
  h.user(null);
  h.ui.render();
  h.submit();
  await tick();
  assert.equal(h.signs(), 1);
  assert.equal(h.calls.length, 0);
});
test("plan form preserves C1 and text drafts through rerender, requires explicit consent", async (t) => {
  const h = harness(t);
  assert.match(h.ui.render(), /value="C1" selected/);
  h.input("goal", '<script>alert("goal")</script>');
  h.input("preferences", "Films and travel");
  h.submit();
  await tick();
  assert.equal(h.calls.length, 0);
  const html = h.ui.render();
  assert.match(html, /&lt;script>/);
  assert.ok(!html.includes("<script>"));
  assert.match(html, /Films and travel/);
  h.input("consent", true);
  h.submit();
  await tick();
  assert.equal(h.calls.length, 1);
  const body = JSON.parse(h.calls[0][1].body);
  assert.equal(body.level, "C1");
  assert.equal(body.preferences, "Films and travel");
  assert.equal(body.consent, true);
});
test("generated plan is escaped, saved by account and progress can be checked or removed", async (t) => {
  const h = harness(t);
  h.ui.render();
  h.input("goal", "Films");
  h.input("consent", true);
  h.submit();
  await tick();
  let html = h.ui.render();
  assert.match(html, /&lt;strong>/);
  assert.match(html, /&lt;img/);
  assert.ok(!html.includes("<img"));
  const data = JSON.parse(h.values.get("10qadam-plan:user1"));
  assert.ok(data.plan);
  assert.equal(data.goal, undefined);
  assert.equal(data.preferences, undefined);
  h.click("complete", "0-0");
  html = h.ui.render();
  assert.match(html, /Completed activities: 1 \/ 7/);
  h.click("learn");
  assert.deepEqual(h.levels, ["C1"]);
  h.user({ id: "other-user" });
  html = h.ui.render();
  assert.ok(!html.includes("&lt;strong>"));
  h.user({ id: "user1" });
  assert.match(h.ui.render(), /&lt;strong>/);
  h.click("remove");
  assert.equal(h.values.has("10qadam-plan:user1"), false);
});
test("missing configured key has honest message and never saves a fallback plan", async (t) => {
  const h = harness(
    t,
    async () =>
      new Response(JSON.stringify({ error: "ai_not_configured" }), {
        status: 503,
      }),
  );
  h.ui.render();
  h.input("goal", "Films");
  h.input("consent", true);
  h.submit();
  await tick();
  assert.match(h.ui.render(), /not connected yet/);
  assert.equal(h.values.size, 0);
});
test("leaving or switching users ignores late model output", async (t) => {
  let finish;
  const response = new Promise((resolve) => {
    finish = resolve;
  });
  const h = harness(t, () => response);
  h.ui.render();
  h.input("goal", "Films");
  h.input("consent", true);
  h.submit();
  await tick();
  h.ui.stop();
  h.user({ id: "other-user" });
  h.ui.render();
  finish(new Response(JSON.stringify({ plan: examplePlan() })));
  await tick();
  assert.equal(h.values.size, 0);
  assert.ok(!h.ui.render().includes("&lt;strong>"));
});
test("network or HTML API failures show safe generic message with no raw upstream data", async (t) => {
  const h = harness(
    t,
    async () =>
      new Response("<html>unexpected private provider output</html>", {
        status: 500,
      }),
  );
  h.ui.render();
  h.input("goal", "Films");
  h.input("consent", true);
  h.submit();
  await tick();
  const html = h.ui.render();
  assert.match(html, /Could not create a valid plan/);
  assert.ok(!html.includes("unexpected private"));
});
