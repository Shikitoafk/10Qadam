import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import {
  accountLearningLevel,
  validateLearningLevel,
} from "../src/account-level.js";

test("account preference accepts only supported exact learning levels", () => {
  for (const level of ["A1", "A2", "B1", "B2", "C1"]) {
    assert.equal(validateLearningLevel(level), level);
    assert.equal(
      accountLearningLevel({ user_metadata: { learning_level: level } }),
      level,
    );
  }
  for (const level of [undefined, null, "", "C2", "a1", " B2 ", 1, {}]) {
    assert.throws(() => validateLearningLevel(level), /A1 to C1/);
    assert.equal(
      accountLearningLevel({ user_metadata: { learning_level: level } }),
      null,
    );
  }
  for (const user of [undefined, null, {}, { user_metadata: null }]) {
    assert.equal(accountLearningLevel(user), null);
  }
});

// Evaluate the real online module with a controlled auth adapter. No network,
// credentials or test account is needed and production functions are not copied.
function onlineHarness({ configured = true, error = null } = {}) {
  const calls = [];
  const user = {
    id: "test-user",
    user_metadata: { username: "Existing name", unrelated: "keep" },
  };
  const context = {
    validateLearningLevel,
    env: configured
      ? {
          VITE_SUPABASE_URL: "https://test.invalid",
          VITE_SUPABASE_ANON_KEY: "public",
        }
      : {},
    window: { location: { origin: "https://10-qadam.test" } },
    createClient: () => ({
      auth: {
        async signUp(options) {
          calls.push({ method: "signUp", options });
          return { data: { user }, error };
        },
        async updateUser(options) {
          calls.push({ method: "updateUser", options });
          if (!error) Object.assign(user.user_metadata, options.data);
          return { data: { user }, error };
        },
      },
    }),
  };
  const source = readFileSync(
    new URL("../src/online.js", import.meta.url),
    "utf8",
  )
    .replace(/^import .+;\r?\n/gm, "")
    .replaceAll("import.meta.env", "env")
    .replace(/^export /gm, "");
  vm.createContext(context);
  vm.runInContext(source, context);
  return { api: context, calls, user };
}

test("registration sends selected learning level alongside username", async () => {
  const { api, calls, user } = onlineHarness();
  const result = await api.signUp(
    " name@example.com ",
    "password",
    " Player ",
    "C1",
  );
  assert.equal(result.user, user);
  assert.equal(calls[0].method, "signUp");
  assert.equal(calls[0].options.email, "name@example.com");
  assert.equal(calls[0].options.options.data.username, "Player");
  assert.equal(calls[0].options.options.data.learning_level, "C1");
  assert.equal(
    calls[0].options.options.emailRedirectTo,
    "https://10-qadam.test",
  );
  await api.signUp("name@example.com", "password", "Player");
  assert.equal(calls[1].options.options.data.learning_level, "A1");
});

test("changing learning level patches only that metadata field", async () => {
  const { api, calls, user } = onlineHarness();
  const result = await api.updateLearningLevel("B2");
  assert.equal(result.user, user);
  assert.equal(calls[0].method, "updateUser");
  assert.equal(
    JSON.stringify(calls[0].options),
    JSON.stringify({ data: { learning_level: "B2" } }),
  );
  assert.equal(user.user_metadata.username, "Existing name");
  assert.equal(user.user_metadata.unrelated, "keep");
  assert.equal(accountLearningLevel(user), "B2");
});

test("invalid preference never reaches auth and offline use fails clearly", () => {
  const { api, calls } = onlineHarness();
  assert.throws(() => api.signUp("e", "p", "u", "C2"), /A1 to C1/);
  assert.throws(() => api.updateLearningLevel("B3"), /A1 to C1/);
  assert.equal(calls.length, 0);
  const offline = onlineHarness({ configured: false });
  assert.throws(() => offline.api.updateLearningLevel("B1"), /Supabase/);
});

test("auth errors propagate without locally changing the preference", async () => {
  const { api, user } = onlineHarness({
    error: { message: "Session expired" },
  });
  await assert.rejects(api.updateLearningLevel("C1"), /Session expired/);
  await assert.rejects(api.signUp("e", "p", "u", "C1"), /Session expired/);
  assert.equal(accountLearningLevel(user), null);
});
