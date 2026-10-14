import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { accountLearningLevel } from "../src/account-level.js";
import { LEARNING_LEVELS } from "../src/routes.js";
import { t } from "../src/i18n.js";

const source = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
function handler(name) {
  const start = new RegExp(`^(?:async )?function ${name}\\(`, "m").exec(source);
  const rest = source.slice(start.index + start[0].length);
  const next = /^(?:async )?function \w+\(/m.exec(rest);
  return source.slice(start.index, start.index + start[0].length + next.index);
}
const user = (id, level) => ({ id, user_metadata: { learning_level: level } });
function harness() {
  const context = {
    accountLearningLevel,
    LEARNING_LEVELS,
    t,
    escape: (s) => String(s).replaceAll("<", "&lt;"),
    state: {
      user: null,
      page: "arena",
      level: "A1",
      wordLevel: "A1",
      language: "en",
    },
    icons: { arrow: "" },
    study: {
      level: "A1",
      setLevel(l) {
        this.level = l;
      },
    },
    online: {
      getSession: async () => ({ user: user("one", "C1") }),
      getProfile: async () => ({ username: "Test" }),
    },
    routes: [],
    syncRoute(...args) {
      context.routes.push(args);
    },
    dialog: null,
    queueActive: false,
    levelPromptUserId: null,
    prompts: 0,
    showLearningLevel() {
      context.prompts++;
    },
  };
  vm.createContext(context);
  for (const name of [
    "applyLearningLevel",
    "refreshUser",
    "offerLearningLevel",
    "learningLevelField",
    "renderLearningPreference",
  ])
    vm.runInContext(handler(name), context);
  return context;
}

test("C1 sign-in restores learning, word-library and arena defaults", async () => {
  const c = harness();
  await c.refreshUser();
  assert.equal(c.study.level, "C1");
  assert.equal(c.state.wordLevel, "C1");
  assert.equal(c.state.level, "C1");
  c.study.level = "B2";
  await c.refreshUser();
  assert.equal(
    c.study.level,
    "B2",
    "token refresh does not undo a manually opened lesson",
  );
  c.online.getSession = async () => ({ user: user("two", "B1") });
  await c.refreshUser();
  assert.equal(
    c.study.level,
    "B1",
    "a second account receives its own preference",
  );
});

test("explicit learning links win on first load and metadata changes update the learning URL", async () => {
  const c = harness();
  c.study.level = "B2";
  await c.refreshUser({ preserveLevel: true });
  assert.equal(c.study.level, "B2");
  c.state.page = "study";
  c.online.getSession = async () => ({ user: user("one", "B1") });
  await c.refreshUser();
  assert.equal(c.study.level, "B1");
  assert.equal(c.routes[0][0], "study");
});

test("existing and OAuth accounts without a level are offered onboarding once, never during a match", () => {
  const c = harness();
  c.state.user = user("one", null);
  c.state.page = "game";
  c.offerLearningLevel();
  assert.equal(c.prompts, 0);
  c.state.page = "arena";
  c.dialog = {};
  c.offerLearningLevel();
  assert.equal(c.prompts, 0);
  c.dialog = null;
  c.offerLearningLevel();
  c.offerLearningLevel();
  assert.equal(c.prompts, 1);
  c.state.user = user("two", "C1");
  c.offerLearningLevel();
  assert.equal(c.prompts, 1);
});

test("signup and profile expose all five levels with truthful localized learning-only copy", () => {
  const c = harness();
  for (const language of ["en", "kk", "ru"]) {
    c.state.language = language;
    const html = c.learningLevelField("C1");
    for (const level of LEARNING_LEVELS)
      assert.ok(html.includes(`value="${level}"`));
    assert.match(html, /value="C1" selected/);
    c.state.user = user("one", "C1");
    const profile = c.renderLearningPreference();
    assert.match(profile, /C1/);
    assert.match(profile, /1000/);
    assert.ok(profile.includes(t("Change my level", language)));
  }
});

test("production save handler waits for auth persistence and never applies failed writes", async () => {
  const c = harness();
  const start = source.indexOf(
    '  if (event.target.id === "learning-level-form")',
  );
  const end = source.indexOf('  if (event.target.id === "answer-form")', start);
  const code = `(async function(event) {${source.slice(start, end)}})`;
  const button = { disabled: false },
    error = { textContent: "" };
  const form = {
    id: "learning-level-form",
    querySelector: (s) => (s === ".form-error" ? error : button),
  };
  c.FormData = class {
    get() {
      return "C1";
    }
  };
  c.closeModal = () => {};
  c.navigate = (page) => {
    c.state.page = page;
  };
  c.toast = () => {};
  c.state.user = user("one", "A2");
  c.online.updateLearningLevel = async () => {
    throw new Error("Save failed");
  };
  const save = vm.runInContext(code, c);
  await save({ target: form, preventDefault() {} });
  assert.equal(c.study.level, "A1");
  assert.equal(error.textContent, "Save failed");
  assert.equal(button.disabled, false);
  c.online.updateLearningLevel = async () => ({ user: user("one", "C1") });
  await save({ target: form, preventDefault() {} });
  assert.equal(c.study.level, "C1");
  assert.equal(c.state.wordLevel, "C1");
  assert.equal(c.state.page, "study");
});
