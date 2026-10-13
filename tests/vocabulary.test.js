import { test } from "node:test";
import assert from "node:assert/strict";
import { WORDS } from "../src/game.js";
import { wordMeaning, matchesWord } from "../src/vocabulary.js";

test("every challenge has an English definition and Kazakh and Russian meanings", () => {
  const entries = Object.values(WORDS).flat();
  assert.equal(entries.length, 100);
  for (const [word, russian] of entries) {
    assert.ok(
      wordMeaning(word, "en").length > 10,
      `${word}: English definition`,
    );
    assert.match(
      wordMeaning(word, "en"),
      /^[A-Z]/,
      `${word}: English sentence`,
    );
    assert.ok(wordMeaning(word, "kk").length >= 2, `${word}: Kazakh meaning`);
    assert.match(wordMeaning(word, "kk"), /[А-Яа-яӘәҒғҚқҢңӨөҰұҮүҺһІі]/);
    assert.equal(wordMeaning(word, "ru"), russian);
    assert.notEqual(wordMeaning(word, "en"), word);
  }
});

test("English is the default and unknown words have no fabricated definition", () => {
  assert.equal(wordMeaning(" APPLE "), "A round fruit with red or green skin.");
  assert.equal(wordMeaning("apple", "kk"), "алма");
  assert.equal(wordMeaning("not-a-word"), "");
  assert.equal(wordMeaning(null), "");
  assert.equal(wordMeaning("apple", "unknown"), wordMeaning("apple", "en"));
});

test("dictionary search matches words and all three meanings without case sensitivity", () => {
  assert.equal(matchesWord("apple", " APP "), true);
  assert.equal(matchesWord("apple", "ROUND FRUIT"), true);
  assert.equal(matchesWord("apple", "АЛМА"), true);
  assert.equal(matchesWord("apple", "ЯБЛОКО"), true);
  assert.equal(matchesWord("airport", "ӘУЕЖАЙ"), true);
  assert.equal(matchesWord("water", "apple"), false);
  assert.equal(matchesWord("apple", "  "), true);
});
