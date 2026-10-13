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
} from "../src/game.js";
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
test("more correct words beat faster but less accurate players; equal results tie", () => {
  const accurate = { correct: 10, score: 1000 },
    fast = { correct: 9, score: 1350 },
    tied = { correct: 10, score: 1000 };
  assert.ok(comparePlayers(accurate, fast) < 0);
  assert.equal(playerPlace(accurate, [accurate, fast, tied]), 1);
  assert.equal(playerPlace(tied, [accurate, fast, tied]), 1);
  assert.equal(playerPlace(fast, [accurate, fast, tied]), 3);
});
