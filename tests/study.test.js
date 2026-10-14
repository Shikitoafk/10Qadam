import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SENTENCES,
  STUDY_LEVELS,
  studyWords,
  DICTATION_ROUNDS,
  DICTATION_SECONDS,
  normalizeDictation,
  compareDictation,
  sentenceDeck,
  loadStudy,
  saveStudy,
} from "../src/study.js";
import { WORDS } from "../src/game.js";

test("dictation ignores capitalization, punctuation, apostrophes and extra whitespace", () => {
  assert.equal(
    normalizeDictation("  I CAN’T\n find my bag!  "),
    "i cant find my bag",
  );
  assert.equal(normalizeDictation("Ｈｅｌｌｏ， friend."), "hello friend");
  assert.equal(compareDictation("dont forget", "Don't forget!").accuracy, 100);
  assert.equal(compareDictation("I can't.", "I can’t!").correct, true);
  assert.equal(normalizeDictation(null), "");
});

test("similarity is Levenshtein character accuracy, not an all-or-nothing word score", () => {
  assert.equal(compareDictation("sitting", "kitten").distance, 3);
  assert.equal(compareDictation("sitting", "kitten").accuracy, 57);
  const lower = compareDictation("1234567xx", "123456789");
  const higher = compareDictation("12345678xx", "1234567890");
  assert.equal(lower.accuracy, 78);
  assert.equal(higher.accuracy, 80);
  assert.ok(higher.accuracy > lower.accuracy);
  assert.equal(compareDictation("", "apple").accuracy, 0);
  assert.equal(compareDictation("extra", "").accuracy, 0);
  assert.equal(compareDictation("", "").accuracy, 100);
});

test("aligned diff reconstructs both strings and exposes each edit", () => {
  for (const [answer, target] of [
    ["aple", "apple"],
    ["appple", "apple"],
    ["applo", "apple"],
    ["", "hello"],
    ["hello", ""],
    ["nice day", "a nice day"],
    ["😀a", "😀b"],
  ]) {
    const result = compareDictation(answer, target);
    assert.equal(
      result.diff.map((part) => part.expected).join(""),
      result.expected,
    );
    assert.equal(
      result.diff.map((part) => part.actual).join(""),
      result.actual,
    );
    assert.equal(
      result.diff.filter((part) => part.type !== "same").length,
      result.distance,
    );
    for (const part of result.diff) {
      assert.ok(["same", "missing", "extra", "replace"].includes(part.type));
      if (part.type === "same") assert.equal(part.expected, part.actual);
    }
  }
  assert.ok(
    compareDictation("aple", "apple").diff.some(
      (part) => part.type === "missing",
    ),
  );
  assert.ok(
    compareDictation("appple", "apple").diff.some(
      (part) => part.type === "extra",
    ),
  );
  assert.ok(
    compareDictation("applo", "apple").diff.some(
      (part) => part.type === "replace",
    ),
  );
});

test("each level offers original translated prompts and a unique independent shuffled deck", () => {
  assert.equal(DICTATION_SECONDS, 35);
  assert.equal(DICTATION_ROUNDS, 5);
  const ids = new Set();
  assert.deepEqual(STUDY_LEVELS, ["A1", "A2", "B1", "B2", "C1"]);
  for (const level of STUDY_LEVELS) {
    assert.equal(SENTENCES[level].length, 12);
    for (const sentence of SENTENCES[level]) {
      assert.ok(sentence.text && sentence.kk && sentence.ru);
      assert.ok(!ids.has(sentence.id));
      ids.add(sentence.id);
    }
    const deck = sentenceDeck(level, () => 0.5);
    assert.equal(deck.length, DICTATION_ROUNDS);
    assert.equal(
      new Set(deck.map((sentence) => sentence.id)).size,
      DICTATION_ROUNDS,
    );
    assert.ok(
      deck.every((sentence) => sentence.id.startsWith(level.toLowerCase())),
    );
    deck[0].text = "changed";
    assert.ok(
      SENTENCES[level].every((sentence) => sentence.text !== "changed"),
    );
  }
  assert.equal(sentenceDeck("unknown", () => 0, 99).length, 12);
  assert.equal(sentenceDeck("A1", () => 1, -1).length, 0);
  assert.equal(sentenceDeck("A1", () => NaN, 2).length, 2);
});

test("all five study levels provide unique words with complete meanings", () => {
  const allWords = new Set();
  for (const level of STUDY_LEVELS) {
    const words = studyWords(level);
    assert.equal(words.length, level.startsWith("A") ? 50 : 20);
    for (const entry of words) {
      assert.ok(entry.word && entry.en && entry.kk && entry.ru);
      assert.match(entry.word, /^[a-z]+$/);
      assert.doesNotMatch(entry.en, /[А-Яа-яӘәӨөҮүҰұҚқҒғҢңІі]/);
      assert.ok(
        !allWords.has(entry.word),
        `${entry.word} belongs to only one level`,
      );
      allWords.add(entry.word);
    }
    words[0].word = "changed";
    assert.notEqual(studyWords(level)[0].word, "changed");
  }
  assert.deepEqual(studyWords("unknown"), studyWords("A1"));
  const easyLength = SENTENCES.A1.reduce(
    (sum, entry) => sum + entry.text.length,
    0,
  );
  const advancedLength = SENTENCES.C1.reduce(
    (sum, entry) => sum + entry.text.length,
    0,
  );
  assert.ok(advancedLength > easyLength * 2);
});

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key),
    setItem: (key, value) => values.set(key, value),
  };
}

test("mastered words and the latest session persist with a small validated shape", () => {
  const storage = memoryStorage();
  const session = {
    level: "A2",
    accuracy: 80,
    rounds: 5,
    date: "2026-10-14T10:00:00.000Z",
  };
  const result = saveStudy(
    {
      known: [" APPLE ", "apple", "house", "not-a-word", null],
      lastSession: session,
      ignored: true,
    },
    storage,
  );
  assert.deepEqual(result, { known: ["apple", "house"], lastSession: session });
  assert.deepEqual(loadStudy(storage), result);
  const all = Object.values(WORDS)
    .flat()
    .map(([word]) => word);
  assert.equal(
    saveStudy({ known: [...all, ...all] }, storage).known.length,
    100,
  );
  const advanced = saveStudy(
    {
      known: ["ambiguity", "consequence", "achieve"],
      lastSession: { ...session, level: "C1" },
    },
    storage,
  );
  assert.deepEqual(advanced.known, ["ambiguity", "consequence", "achieve"]);
  assert.equal(loadStudy(storage).lastSession.level, "C1");
  const allLevels = STUDY_LEVELS.flatMap((level) =>
    studyWords(level).map(({ word }) => word),
  );
  assert.equal(saveStudy({ known: allLevels }, storage).known.length, 160);
});

test("malformed, unavailable and full storage never interrupt a lesson", () => {
  const storage = memoryStorage();
  for (const value of [
    "{",
    "null",
    "4",
    '"hello"',
    '{"known":"apple"}',
    '{"known":[null,42]}',
  ]) {
    storage.setItem("10qadam-study", value);
    assert.deepEqual(loadStudy(storage), { known: [] });
  }
  assert.deepEqual(
    saveStudy(
      {
        known: ["apple"],
        lastSession: { level: "A1", accuracy: NaN, rounds: 5, date: "invalid" },
      },
      storage,
    ),
    { known: ["apple"] },
  );
  const denied = {
    getItem() {
      throw new Error("denied");
    },
    setItem() {
      throw new Error("full");
    },
  };
  assert.deepEqual(loadStudy(denied), { known: [] });
  assert.deepEqual(saveStudy({ known: ["apple"] }, denied), {
    known: ["apple"],
  });
  assert.deepEqual(loadStudy(), { known: [] });
});
