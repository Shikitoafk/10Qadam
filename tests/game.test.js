import { test } from "node:test";
import assert from "node:assert/strict";
import {
  makeDeck,
  normalizeAnswer,
  scoreAnswer,
  comparePlayers,
  playerPlace,
  WORDS,
  ROUND_COUNT,
  loadPractice,
  savePractice,
} from "../src/game.js";
import importedWords from "../src/data/cefr-words.json" with { type: "json" };
test("normalization handles capital letters and outer spaces only", () => {
  assert.equal(normalizeAnswer(" Apple  "), "apple");
  assert.equal(scoreAnswer("ap ple", "apple", 1000).correct, false);
});
test("accuracy is primary and speed adds at most fifty points", () => {
  assert.deepEqual(scoreAnswer("APPLE", "apple", 0), {
    correct: true,
    points: 150,
  });
  assert.equal(scoreAnswer("apple", "apple", 6000).points, 125);
  assert.equal(scoreAnswer("aple", "apple", 0).points, 0);
  assert.equal(scoreAnswer("apple", "apple", 12001).points, 0);
});
test("each level provides ten unique challenges and enough vocabulary", () => {
  for (const level of ["A1", "A2"]) {
    const deck = makeDeck(level, () => 0.5);
    assert.equal(deck.length, ROUND_COUNT);
    assert.equal(new Set(deck.map((x) => x.word)).size, ROUND_COUNT);
    assert.ok(WORDS[level].length >= 40);
  }
});

test("advanced practice decks use ten unique source-band single words, not A1 fallback", () => {
  for (const level of ["B1", "B2", "C1"]) {
    const candidates = importedWords.filter(
      ([word, , band]) => band === level && /^[a-z]{3,18}$/.test(word),
    );
    const byWord = new Map(
      candidates.map(([word, , , definition]) => [word, definition]),
    );
    assert.ok(candidates.length > 100);
    for (const random of [() => 0, () => 0.5, () => 0.999]) {
      const deck = makeDeck(level, random);
      assert.equal(deck.length, ROUND_COUNT);
      assert.equal(new Set(deck.map(({ word }) => word)).size, ROUND_COUNT);
      for (const { word, translation } of deck) {
        assert.match(word, /^[a-z]{3,18}$/);
        assert.equal(translation, byWord.get(word));
        assert.ok(!WORDS.A1.some(([beginner]) => beginner === word));
      }
    }
  }
  assert.deepEqual(
    makeDeck("unsupported", () => 0.5),
    makeDeck("A1", () => 0.5),
  );
  assert.deepEqual(
    makeDeck("toString", () => 0.5),
    makeDeck("A1", () => 0.5),
  );
  assert.deepEqual(Object.keys(WORDS), ["A1", "A2"]);
});

test("the advanced gameplay subset omits sensitive or abbreviated prompts", () => {
  const excluded = new Set([
    "aborigine",
    "gypsy",
    "hiv",
    "lust",
    "ness",
    "pee",
    "prick",
    "queer",
    "rape",
    "raunchy",
    "retard",
    "sex",
    "sexual",
    "sexy",
    "suicide",
  ]);
  // Exercise shuffled positions throughout each catalog, not only its first page.
  let seed = 12345;
  const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  for (const level of ["B1", "B2", "C1"]) {
    for (let match = 0; match < 100; match++) {
      for (const { word } of makeDeck(level, random))
        assert.ok(!excluded.has(word));
    }
  }
});

test("practice history accepts every supported band and preserves legacy entries", (t) => {
  const previousStorage = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );
  const data = new Map();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, value),
    },
  });
  t.after(() => {
    if (previousStorage) {
      Object.defineProperty(globalThis, "localStorage", previousStorage);
    } else {
      delete globalThis.localStorage;
    }
  });
  data.set("spell-arena-practice", JSON.stringify([{ score: 500 }]));
  for (const level of ["A1", "A2", "B1", "B2", "C1"]) {
    savePractice({ score: 1250, correct: 10, level });
  }
  assert.deepEqual(
    loadPractice().map(({ level }) => level),
    ["C1", "B2", "B1", "A2", "A1", undefined],
  );
  const before = data.get("spell-arena-practice");
  savePractice({ score: 1250, level: "C2" });
  savePractice({ score: Infinity, level: "C1" });
  assert.equal(data.get("spell-arena-practice"), before);
  for (let i = 0; i < 40; i++) savePractice({ score: i, level: "C1" });
  assert.equal(loadPractice().length, 30);
  data.set(
    "spell-arena-practice",
    JSON.stringify([
      { score: 100, level: "B1" },
      { score: 200, level: "bad" },
    ]),
  );
  assert.deepEqual(loadPractice(), [{ score: 100, level: "B1" }]);
  data.set("spell-arena-practice", "broken-json");
  assert.deepEqual(loadPractice(), []);
});
test("more correct words beat faster but less accurate players; equal results tie", () => {
  const accurate = { correct: 10, score: 1000 },
    fast = { correct: 9, score: 1350 },
    tied = { correct: 10, score: 1000 };
  assert.ok(comparePlayers(accurate, fast) < 0);
  assert.equal(playerPlace(accurate, [accurate, fast, tied]), 1);
  assert.equal(playerPlace(tied, [accurate, fast, tied]), 1);
  assert.equal(playerPlace(fast, [accurate, fast, tied]), 3);
});
