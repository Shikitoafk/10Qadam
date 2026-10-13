import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COPY,
  LANGUAGES,
  t,
  loadLanguage,
  saveLanguage,
  slogan,
  localize,
} from "../src/i18n.js";

test("every UI entry has English and Kazakh copy; English never leaks Cyrillic", () => {
  for (const [source, translations] of Object.entries(COPY)) {
    assert.equal(typeof translations[0], "string", source);
    assert.equal(typeof translations[1], "string", source);
    assert.ok(translations[0].trim() && translations[1].trim(), source);
    assert.doesNotMatch(
      t(source, "en"),
      /[А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]/u,
      source,
    );
    for (const lang of LANGUAGES)
      assert.ok(t(source, lang).trim(), `${source}:${lang}`);
  }
});
test("dynamic game copy is translated without changing answers, scores or levels", () => {
  assert.equal(t("  Слово 3 / 10  ", "en"), "  Word 3 / 10  ");
  assert.equal(t("Верно! +142 очков", "en"), "Correct! +142 points");
  assert.equal(t("Слово 3 / 10", "kk"), "Сөз 3 / 10");
  assert.equal(t("Правильно: apple", "kk"), "Дұрыс жазылуы: apple");
  assert.equal(t("Дуэль · A2", "en"), "Duel · A2");
  assert.equal(t("Время вышло: neighbour", "en"), "Time's up: neighbour");
  assert.equal(t("8 для повторения", "kk"), "8 сөзді қайталау керек");
  assert.equal(t("Верно! +142 очков", "ru"), "Верно! +142 очков");
  assert.equal(t("unknown message", "en"), "unknown message");
});
test("language defaults to English and persists only supported choices", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key),
    setItem: (key, value) => values.set(key, value),
  };
  assert.equal(loadLanguage(storage), "en");
  saveLanguage("kk", storage);
  assert.equal(loadLanguage(storage), "kk");
  saveLanguage("invalid", storage);
  assert.equal(loadLanguage(storage), "kk");
  const unavailable = {
    getItem() {
      throw new Error();
    },
    setItem() {
      throw new Error();
    },
  };
  assert.equal(loadLanguage(unavailable), "en");
  assert.doesNotThrow(() => saveLanguage("ru", unavailable));
});
test("official slogans preserve the supplied English and Latin Kazakh wording", () => {
  assert.equal(slogan("en").join(" "), "Spell Your Way, Step by Step.");
  assert.equal(slogan("kk").join(" "), "Äripten sözge, sözden jeñiske!");
});
test("DOM localization preserves user-owned text and never injects HTML", () => {
  const user = { textContent: "Арена", parentElement: { closest: () => ({}) } };
  const label = {
    textContent: "Арена",
    parentElement: { closest: () => null },
  };
  const attribute = {
    attrs: { placeholder: "Напиши слово…" },
    closest: () => null,
    hasAttribute(name) {
      return name in this.attrs;
    },
    getAttribute(name) {
      return this.attrs[name];
    },
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
  };
  const nodes = [user, label];
  let cursor = 0;
  localize(
    {
      ownerDocument: {
        createTreeWalker: () => ({ nextNode: () => nodes[cursor++] }),
      },
      querySelectorAll: () => [attribute],
    },
    "en",
  );
  assert.equal(user.textContent, "Арена");
  assert.equal(label.textContent, "Arena");
  assert.equal(attribute.attrs.placeholder, "Spell the word…");
});
