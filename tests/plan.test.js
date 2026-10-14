import { test } from "node:test";
import assert from "node:assert/strict";
import { createPlanHandler } from "../api/study-plan.js";
import { validatePlan, validatePlanRequest } from "../src/plan.js";

const payload = {
  level: "C1",
  language: "ru",
  minutes: 20,
  goal: "Understand films",
  preferences: "I enjoy space",
  consent: true,
};
const plan = () => ({
  title: "Your next seven steps",
  summary: "Build vocabulary at your level.",
  level: "C1",
  days: Array.from({ length: 7 }, (_, i) => ({
    day: i + 1,
    title: `Step ${i + 1}`,
    activities: [
      {
        kind: "dictation",
        minutes: 20,
        description: "Listen, replay and write a sentence.",
      },
    ],
  })),
});
const token = "test.authenticated.jwt.long.enough";
const env = {
  GEMINI_API_KEY: "secret-test-only",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "public-test-only",
};
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const modelResponse = (value = plan()) =>
  json({
    candidates: [
      {
        finishReason: "STOP",
        content: { parts: [{ text: JSON.stringify(value) }] },
      },
    ],
  });
function harness(options = {}) {
  const calls = [];
  const reports = [];
  const responses = options.responses || [
    json({ id: "user1" }),
    json(true),
    modelResponse(),
  ];
  const handler = createPlanHandler({
    env: options.env || env,
    timeoutMs: options.timeoutMs || 1000,
    report: (event) => {
      reports.push(event);
      options.report?.(event);
    },
    fetch: async (url, init) => {
      calls.push({ url, ...init });
      if (options.fetch) return options.fetch(url, init);
      const response = responses.shift();
      if (response instanceof Error) throw response;
      return response;
    },
  });
  const res = {
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.code = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    },
  };
  const req = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: payload,
    ...options.req,
  };
  return { calls, reports, res, run: () => handler(req, res) };
}

test("study plan request validates levels, consent, size and daily budget", () => {
  assert.deepEqual(validatePlanRequest(payload), payload);
  for (const patch of [
    { level: "C2" },
    { minutes: 9 },
    { minutes: 91 },
    { minutes: 20.5 },
    { goal: " " },
    { goal: "a".repeat(1001) },
    { preferences: null },
    { preferences: "a".repeat(1001) },
    { consent: false },
    { consent: "true" },
    { language: "de" },
  ])
    assert.equal(validatePlanRequest({ ...payload, ...patch }), null);
});
test("model plans require exactly seven ordered days and safe supported activities", () => {
  assert.deepEqual(validatePlan(plan(), "C1", 20), plan());
  for (const mutate of [
    (p) => {
      p.days.pop();
    },
    (p) => {
      p.days[2].day = 1;
    },
    (p) => {
      p.days[0].activities[0].kind = "javascript";
    },
    (p) => {
      p.days[0].activities[0].minutes = 21;
    },
    (p) => {
      p.days[0].activities[0].description = "a".repeat(601);
    },
    (p) => {
      p.level = "A1";
    },
    (p) => {
      p.title = "";
    },
  ]) {
    const invalid = plan();
    mutate(invalid);
    assert.equal(validatePlan(invalid, "C1", 20), null);
  }
  const extra = { ...plan(), code: "never execute" };
  assert.equal(validatePlan(extra).code, undefined);
});
test("plan API is POST/JSON only with no-store and bounded request bodies", async () => {
  for (const [req, code] of [
    [{ method: "GET" }, 405],
    [{ headers: { "content-type": "text/plain" } }, 415],
    [{ body: "not json" }, 400],
    [{ body: { ...payload, goal: "a".repeat(5000) } }, 413],
    [{ body: { ...payload, consent: false } }, 400],
  ]) {
    const h = harness({ req });
    await h.run();
    assert.equal(h.res.code, code);
    assert.equal(h.calls.length, 0);
    assert.equal(h.res.headers["Cache-Control"], "no-store");
  }
});
test("missing Gemini key is honestly unavailable, no fake plan or model request", async () => {
  const h = harness({ env: { ...env, GEMINI_API_KEY: "" } });
  await h.run();
  assert.equal(h.res.code, 503);
  assert.deepEqual(h.res.data, { error: "ai_not_configured" });
  assert.equal(h.calls.length, 0);
});
test("untrusted server URL or model configuration never receives auth or keys", async () => {
  for (const patch of [
    { SUPABASE_URL: "https://attacker.example" },
    { GEMINI_MODEL: "../../different-api?key=secret" },
  ]) {
    const h = harness({ env: { ...env, ...patch } });
    await h.run();
    assert.equal(h.res.code, 503);
    assert.equal(h.calls.length, 0);
  }
});
test("plan API verifies bearer user, rejects guests and invalid Supabase sessions", async () => {
  const missing = harness({
    req: { headers: { "content-type": "application/json" } },
  });
  await missing.run();
  assert.equal(missing.res.code, 401);
  assert.equal(missing.calls.length, 0);
  for (const response of [
    json({}, 401),
    json({}),
    json({ id: "user1", is_anonymous: true }),
  ]) {
    const h = harness({ responses: [response] });
    await h.run();
    assert.equal(h.res.code, 401);
    assert.equal(h.calls.length, 1);
  }
});
test("durable quota rejects daily excess and fails closed on missing or malformed RPC", async () => {
  for (const [response, code] of [
    [json(false), 429],
    [json({}, 404), 503],
    [json({ allowed: true }), 503],
  ]) {
    const h = harness({ responses: [json({ id: "user1" }), response] });
    await h.run();
    assert.equal(h.res.code, code);
    assert.equal(h.calls.length, 2);
    assert.match(h.calls[1].url, /\/rpc\/consume_plan_quota$/);
    assert.equal(h.calls[1].headers.Authorization, `Bearer ${token}`);
  }
});
test("success passes only explicit preferences to Gemini and keeps server key in header", async () => {
  const h = harness();
  await h.run();
  assert.equal(h.res.code, 200);
  assert.deepEqual(h.res.data.plan, plan());
  assert.equal(h.calls.length, 3);
  const google = h.calls[2];
  assert.equal(
    google.url,
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
  );
  assert.equal(google.headers["x-goog-api-key"], env.GEMINI_API_KEY);
  assert.equal(google.headers.Authorization, undefined);
  const request = JSON.parse(google.body);
  assert.equal(request.generationConfig.responseMimeType, "application/json");
  assert.equal(request.generationConfig.maxOutputTokens, 5000);
  assert.deepEqual(request.generationConfig.thinkingConfig, {
    thinkingLevel: "MINIMAL",
  });
  assert.equal(
    request.generationConfig.responseJsonSchema.properties.days.maxItems,
    7,
  );
  const learner = JSON.parse(request.contents[0].parts[0].text);
  assert.equal(learner.level, "C1");
  assert.equal(learner.preferences, payload.preferences);
  assert.equal(learner.id, undefined);
  assert.ok(!JSON.stringify(h.res.data).includes(env.GEMINI_API_KEY));
});
test("explicit legacy model override retains budget-based thinking configuration", async () => {
  const h = harness({ env: { ...env, GEMINI_MODEL: "gemini-2.5-flash" } });
  await h.run();
  assert.equal(h.res.code, 200);
  assert.match(h.calls[2].url, /\/gemini-2\.5-flash:generateContent$/);
  assert.deepEqual(JSON.parse(h.calls[2].body).generationConfig.thinkingConfig, {
    thinkingBudget: 0,
  });
});
test("upstream errors are sanitized and invalid or truncated model responses are rejected", async () => {
  const bad = plan();
  bad.level = "A1";
  for (const response of [
    modelResponse(bad),
    json({
      candidates: [
        { finishReason: "MAX_TOKENS", content: { parts: [{ text: "{}" }] } },
      ],
    }),
    json({
      candidates: [
        {
          finishReason: "STOP",
          content: { parts: [{ text: "<script>bad</script>" }] },
        },
      ],
    }),
    json({ promptFeedback: { blockReason: "SAFETY" } }),
  ]) {
    const h = harness({
      responses: [json({ id: "user1" }), json(true), response],
    });
    await h.run();
    assert.equal(h.res.code, 502);
    assert.deepEqual(h.res.data, { error: "generation_failed" });
  }
});
test("provider quota has a distinct safe error", async () => {
  const h = harness({
    responses: [
      json({ id: "user1" }),
      json(true),
      json({ private: "secret" }, 429),
    ],
  });
  await h.run();
  assert.equal(h.res.code, 429);
  assert.equal(h.res.data.error, "provider_busy");
});
test("total deadline includes authentication and aborts stalled network calls", async () => {
  const h = harness({
    timeoutMs: 5,
    fetch: async (_url, { signal }) =>
      new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(new Error("timeout")), {
          once: true,
        }),
      ),
  });
  await h.run();
  assert.equal(h.res.code, 504);
  assert.equal(h.res.data.error, "generation_timeout");
  assert.equal(h.calls.length, 1);
});
test("oversized model responses are rejected rather than forwarded", async () => {
  const h = harness({
    responses: [
      json({ id: "user1" }),
      json(true),
      json({ huge: "x".repeat(70000) }),
    ],
  });
  await h.run();
  assert.equal(h.res.code, 502);
  assert.deepEqual(h.res.data, { error: "generation_failed" });
});

test("provider configuration errors have owner-action code and whitelisted diagnostics only", async () => {
  for (const status of [400, 401, 403, 404]) {
    const h = harness({
      responses: [
        json({ id: "user1" }),
        json(true),
        json(
          {
            error: {
              status: "PERMISSION_DENIED",
              message: `raw-private-message ${env.GEMINI_API_KEY} ${token} ${payload.goal}`,
              details: [
                {
                  reason: "API_KEY_SERVICE_BLOCKED",
                  metadata: { key: env.GEMINI_API_KEY, goal: payload.goal },
                },
              ],
            },
          },
          status,
        ),
      ],
    });
    await h.run();
    assert.equal(h.res.code, 502);
    assert.equal(h.res.data.error, "provider_configuration");
    assert.deepEqual(h.reports, [
      { stage: "provider", status, reason: "API_KEY_SERVICE_BLOCKED" },
    ]);
    const exposed = JSON.stringify([h.res.data, h.reports]);
    for (const secret of [
      env.GEMINI_API_KEY,
      token,
      payload.goal,
      "raw-private-message",
    ])
      assert.ok(!exposed.includes(secret));
  }
  const unknown = harness({
    responses: [
      json({ id: "user1" }),
      json(true),
      json(
        { error: { status: token, details: [{ reason: payload.goal }] } },
        500,
      ),
    ],
  });
  await unknown.run();
  assert.deepEqual(unknown.reports, [
    { stage: "provider", status: 500, reason: "UNKNOWN" },
  ]);
});

test("safe diagnostics distinguish auth, quota, parse and schema failures", async () => {
  const auth = harness({ responses: [json({ private: token }, 500)] });
  await auth.run();
  assert.deepEqual(auth.reports, [
    { stage: "auth", status: 500, reason: "UPSTREAM_HTTP" },
  ]);
  const quota = harness({
    responses: [json({ id: "user1" }), json({ private: token }, 404)],
  });
  await quota.run();
  assert.deepEqual(quota.reports, [
    { stage: "quota", status: 404, reason: "UPSTREAM_HTTP" },
  ]);
  const parse = harness({
    responses: [
      json({ id: "user1" }),
      json(true),
      new Response("private-not-json"),
    ],
  });
  await parse.run();
  assert.deepEqual(parse.reports, [{ stage: "parse", reason: "INVALID_JSON" }]);
  const value = plan();
  value.level = token;
  value.days[0].activities[0].minutes = 30;
  const invalid = harness({
    responses: [json({ id: "user1" }), json(true), modelResponse(value)],
  });
  await invalid.run();
  assert.deepEqual(invalid.reports, [
    {
      stage: "validation",
      reason: "INVALID_PLAN",
      level: "INVALID",
      dayCount: 7,
      activityCounts: [1, 1, 1, 1, 1, 1, 1],
      dailyMinutes: [30, 20, 20, 20, 20, 20, 20],
      dailyBudget: 20,
    },
  ]);
  assert.ok(!JSON.stringify(invalid.reports).includes(token));
});

test("diagnostic reporter exceptions never alter an otherwise safe API failure", async () => {
  const h = harness({
    report() {
      throw new Error("logging unavailable");
    },
    responses: [json({ id: "user1" }), json(false)],
  });
  await h.run();
  assert.equal(h.res.code, 429);
  assert.equal(h.res.data.error, "daily_limit");
});
