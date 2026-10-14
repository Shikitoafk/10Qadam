import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { LEARNING_LEVELS } from "../src/routes.js";
import { validateLearningLevel } from "../src/account-level.js";
import { t } from "../src/i18n.js";
import { ratingColumn } from "../src/sentence-battle.js";

test("leaderboards request and sort the chosen level rating, never A2 for advanced users", async () => {
  const calls = [];
  const filters = [];
  const rpcCalls = [];
  const chain = {
    select(fields) {
      calls.push(["select", fields]);
      return this;
    },
    gt(column, threshold) {
      filters.push([column, threshold]);
      return this;
    },
    order(column) {
      calls.push(["order", column]);
      return this;
    },
    limit() {
      return Promise.resolve({ data: [], error: null });
    },
  };
  const context = {
    validateLearningLevel,
    env: {
      VITE_SUPABASE_URL: "https://test.invalid",
      VITE_SUPABASE_ANON_KEY: "public",
    },
    createClient: () => ({
      from: () => chain,
      rpc(name, args) {
        rpcCalls.push([name, args]);
        return Promise.resolve({ data: {}, error: null });
      },
    }),
  };
  vm.createContext(context);
  const online = readFileSync(
    new URL("../src/online.js", import.meta.url),
    "utf8",
  )
    .replace(/^import .+;\r?\n/gm, "")
    .replaceAll("import.meta.env", "env")
    .replace(/^export /gm, "");
  vm.runInContext(online, context);
  for (const level of LEARNING_LEVELS) {
    calls.length = 0;
    await context.getLeaderboard(level);
    assert.equal(calls[1][1], `rating_${level.toLowerCase()}`);
    for (const band of LEARNING_LEVELS)
      assert.ok(calls[0][1].includes(`rating_${band.toLowerCase()}`));
  }
  assert.throws(() => context.getLeaderboard("C2"));
  assert.throws(() => context.joinQueue("duel", "__proto__"));
  calls.length = 0;
  filters.length = 0;
  await context.getLeaderboard("C1", "sentences");
  assert.equal(calls[1][1], "rating_sentence_c1");
  assert.deepEqual(filters[0], ["games_sentence", 0]);
  await context.joinQueue("duel", "C1", "sentences");
  assert.equal(rpcCalls[0][0], "join_matchmaking");
  assert.equal(rpcCalls[0][1].p_format, "sentences");
  assert.equal(rpcCalls[0][1].p_level, "C1");
  assert.throws(() => context.joinQueue("duel", "C1", "unsupported"));
});

test("production arena exposes five independent difficulty buttons and the actual chosen rating", () => {
  const source = readFileSync(
    new URL("../src/main.js", import.meta.url),
    "utf8",
  );
  const context = {
    LEARNING_LEVELS,
    state: {
      history: [],
      level: "C1",
      mode: "duel",
      profile: { rating_a1: 1010, rating_a2: 1020, rating_c1: 1234 },
    },
    icons: new Proxy({}, { get: () => "" }),
    modes: {
      duel: {
        name: "Duel",
        label: "1 VS 1",
        players: "02",
        description: "Duel",
        caption: "One on one",
      },
    },
    online: { isOnlineConfigured: true },
    learningShortcut: () => "",
    renderBattleFormat: () => "",
    ratingColumn,
    escape: String,
    loadPractice: () => [],
    slogan: () => ["Spell Your Way,", "Step by Step."],
    t,
  };
  vm.createContext(context);
  for (const name of ["rating", "renderArena"]) {
    const start = new RegExp(`^function ${name}\\(`, "m").exec(source).index;
    const next = /^function \w+\(/m.exec(source.slice(start + 10));
    vm.runInContext(source.slice(start, start + 10 + next.index), context);
  }
  const html = context.renderArena();
  for (const level of LEARNING_LEVELS)
    assert.ok(html.includes(`data-level="${level}"`));
  assert.match(html, /data-level="C1" class="selected"/);
  assert.equal(context.rating(), 1234);
  for (const level of ["B1", "B2", "C1"]) {
    assert.equal(t(`Дуэль · ${level}`, "en"), `Duel · ${level}`);
    assert.equal(t(`РЕЙТИНГ ${level}`, "en"), `RATING ${level}`);
  }
});
