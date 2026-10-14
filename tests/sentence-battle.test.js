import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import {
  battleRules,
  matchRules,
  battleAccuracy,
  battleRemaining,
  makeSentenceBattleDeck,
  scoreSentenceBattle,
  sentenceCompare,
  sentencePlace,
  ratingColumn,
} from "../src/sentence-battle.js";
import {
  battleFormatUI,
  sentenceResultUI,
  sentenceArenaUI,
} from "../src/sentence-battle-ui.js";
import { LEARNING_LEVELS } from "../src/routes.js";
import { t } from "../src/i18n.js";
const escape = (text) =>
  String(text ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const icons = new Proxy({}, { get: () => "" });

test("sentence bank supplies five unique original prompts for every supported level", () => {
  for (const level of LEARNING_LEVELS) {
    const deck = makeSentenceBattleDeck(level, () => 0);
    assert.equal(deck.length, 5);
    assert.equal(new Set(deck.map((entry) => entry.word)).size, 5);
    for (const item of deck) assert.equal(item.word, item.text);
    assert.equal(
      ratingColumn(level, "sentences"),
      `rating_sentence_${level.toLowerCase()}`,
    );
  }
  assert.equal(battleRules("words").roundSeconds, 12);
  assert.equal(battleRules("sentences").roundSeconds, 35);
});

test("sentence scoring ignores case and punctuation, measures edits and never rewards speed", () => {
  assert.equal(
    scoreSentenceBattle("I LIKE APPLES!", "I like apples.", 30000).points,
    100,
  );
  assert.equal(
    scoreSentenceBattle("I like apples", "I like apples.", 10).points,
    100,
  );
  assert.equal(
    scoreSentenceBattle("I like apple", "I like apples.", 12000).points,
    92,
  );
  assert.equal(
    scoreSentenceBattle("I like apples", "I like apples.", 35000).points,
    0,
  );
  assert.equal(scoreSentenceBattle("", "I like apples.", 30000).points, 0);
  assert.equal(
    scoreSentenceBattle("anything", "I like apples.", Infinity).points,
    0,
  );
});

test("accuracy ranking uses all rounds including missed ones and ignores speed/correct tie breakers", () => {
  const match = { format: "sentences", roundCount: 5 };
  const players = [
    { id: "first", score: 390, correct: 4, elapsed_ms: 1 },
    { id: "second", score: 400, correct: 0, elapsed_ms: 9999 },
  ];
  assert.equal(battleAccuracy(players[0], match), 78);
  assert.equal(battleAccuracy(players[1], match), 80);
  assert.equal([...players].sort(sentenceCompare)[0].id, "second");
  assert.equal(sentencePlace(players[1], players), 1);
  assert.equal(
    sentenceCompare({ score: 400, correct: 5 }, { score: 400, correct: 1 }),
    0,
  );
  assert.equal(
    battleAccuracy({ score: 100 }, match),
    20,
    "four missed rounds remain zero",
  );
});

test("replays are limited by the active round deadline and server clock offset", () => {
  const match = {
    local: false,
    format: "sentences",
    starts: 1000,
    index: 1,
    roundSeconds: 35,
  };
  assert.equal(battleRemaining(match, 70000), 1000);
  assert.equal(battleRemaining(match, 71000), 0);
  assert.equal(battleRemaining({ ...match, index: -1 }, 1000), 0);
  assert.equal(battleRemaining({ ...match, finished: true }, 3000), 0);
  assert.equal(
    battleRemaining({ local: true, index: 0, deadline: 5000 }, 4500),
    500,
  );
});

test("sentence results expose 80% vs 78%, tied firsts and safely escaped answer diffs", () => {
  const args = {
    state: { language: "en", user: { id: "self" } },
    escape,
    icons,
    avatar: () => "",
    match: {
      format: "sentences",
      local: false,
      mode: "duel",
      level: "C1",
      results: [
        {
          id: "self",
          username: "<script>bad</script>",
          score: 400,
          correct: 0,
        },
        { id: "other", username: "Other", score: 390, correct: 4 },
      ],
      answers: [
        {
          word: "I like apples.",
          answer: "<img src=x>",
          accuracy: 8,
          points: 8,
        },
      ],
    },
  };
  let html = sentenceResultUI(args);
  assert.match(html, /80%/);
  assert.match(html, /78%/);
  assert.match(html, /Sentence review/);
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img src=x>"));
  assert.match(html, /&lt;img src=x&gt;/);
  assert.match(html, /<mark>/);
  args.match.results[1].score = 400;
  html = sentenceResultUI(args);
  assert.match(html, /You tied for first place/);
});

test("production game view uses five indicators, a large answer field and sentence-only scoring copy", () => {
  const source = readFileSync(
    new URL("../src/main.js", import.meta.url),
    "utf8",
  );
  const start = source.indexOf("function renderGame()");
  const end = source.indexOf("function bindAnswer()", start);
  const context = {
    state: {
      language: "en",
      user: { id: "self" },
      match: {
        format: "sentences",
        level: "C1",
        local: true,
        mode: "solo",
        index: 0,
        score: 0,
        correct: 0,
        players: [],
      },
    },
    t,
    matchRules,
    battleAccuracy,
    escape,
    icons,
    avatar: () => "",
    modes: { solo: { label: "PRACTICE", name: "Solo" } },
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);
  const html = context.renderGame();
  assert.match(html, /Sentence 1 \/ 5/);
  assert.match(html, /35.0/);
  assert.match(html, /maxlength="500"/);
  assert.match(html, /<textarea/);
  assert.match(html, /No speed bonus/);
  assert.ok(!html.includes("До 50"));
  const progress = html.match(/id="round-progress">(.*?)<\/div>/)[1];
  assert.equal((progress.match(/<span/g) || []).length, 5);
});

test("arena format switch and sentence choices work in all languages without unlocking levels", () => {
  for (const language of ["en", "kk", "ru"]) {
    const state = { language, format: "sentences", level: "C1", mode: "duel" };
    const html = sentenceArenaUI({
      state,
      escape,
      icons,
      levels: LEARNING_LEVELS,
      modes: {
        duel: {
          name: "Дуэль",
          label: "1 VS 1",
          color: "coral",
          players: "02",
          caption: "Один на один",
        },
      },
      onlineConfigured: true,
      shortcut: "",
    });
    assert.match(html, /data-level="C1" class="selected"/);
    assert.match(html, /data-battle-format="sentences" class="selected"/);
    assert.ok(
      html.includes(
        t("Sentence ratings are separate from word ratings.", language),
      ),
    );
  }
  assert.match(
    battleFormatUI({ language: "en", format: "words" }, escape),
    /10 words · 12 seconds each/,
  );
});
