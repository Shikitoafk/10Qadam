import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import {
  libraryPage,
  libraryMeaning,
  LIBRARY_PAGE_SIZE,
} from "../src/library.js";

const words = [
  { word: "apple", en: "A round fruit.", kk: "алма", ru: "яблоко" },
  { word: "window", en: "An opening in a wall.", kk: "терезе", ru: "окно" },
  { word: "meticulous", en: "Very careful about detail." },
];

test("library search includes every available meaning and tolerates missing translations", () => {
  for (const query of ["APPLE", " fruit ", "алма", "яблоко"])
    assert.deepEqual(libraryPage(words, query).items, [words[0]]);
  assert.deepEqual(libraryPage(words, "meticulous detail").items, [words[2]]);
  assert.deepEqual(libraryPage(words, "терезе").items, [words[1]]);
  assert.equal(libraryPage(words, "not-a-word").filtered, 0);
});

test("large collections are paginated to forty visible records without losing results", () => {
  const large = Array.from({ length: 403 }, (_, i) => ({
    word: `word-${i}`,
    en: "Definition",
  }));
  const first = libraryPage(large);
  assert.equal(first.items.length, LIBRARY_PAGE_SIZE);
  assert.deepEqual(
    [first.total, first.filtered, first.pages, first.start, first.end],
    [403, 403, 11, 1, 40],
  );
  const next = libraryPage(large, "", 2);
  assert.equal(next.items[0].word, "word-40");
  assert.deepEqual([next.start, next.end], [41, 80]);
  const last = libraryPage(large, "", 9999);
  assert.equal(last.page, 11);
  assert.equal(last.items.length, 3);
  assert.equal(
    new Set(
      Array.from(
        { length: first.pages },
        (_, i) => libraryPage(large, "", i + 1).items,
      )
        .flat()
        .map(({ word }) => word),
    ).size,
    403,
  );
});

test("empty results and invalid pagination keep a usable first page", () => {
  const empty = libraryPage(words, "missing", 10);
  assert.deepEqual(
    [empty.filtered, empty.page, empty.pages, empty.start, empty.end],
    [0, 1, 1, 0, 0],
  );
  assert.equal(libraryPage(words, "", -10).page, 1);
  assert.equal(libraryPage(words, "", Number.NaN).page, 1);
  assert.equal(libraryPage(words, "", 1, 0).items.length, 3);
});

test("missing translations explicitly fall back to English instead of empty cards", () => {
  assert.deepEqual(libraryMeaning(words[0], "kk"), {
    text: "алма",
    fallback: false,
  });
  assert.deepEqual(libraryMeaning(words[2], "ru"), {
    text: words[2].en,
    fallback: true,
  });
  assert.deepEqual(libraryMeaning(words[2], "en"), {
    text: words[2].en,
    fallback: false,
  });
  assert.equal(
    libraryMeaning({ word: "unknown", ru: " " }, "ru").text,
    "unknown",
  );
});

test("production word bank renders only one page and leaves the arena level untouched", () => {
  const source = readFileSync(
    new URL("../src/main.js", import.meta.url),
    "utf8",
  );
  const records = Array.from({ length: 403 }, (_, i) => ({
    word: `word-${i}`,
    en: `Definition ${i}`,
  }));
  const context = {
    state: {
      language: "en",
      wordLevel: "B2",
      level: "A1",
      wordPage: 2,
      wordQuery: "",
    },
    libraryPage,
    libraryMeaning,
    studyWords: (level) => (level === "B2" ? records : []),
    t: (key) => key,
    escape: (value) =>
      String(value).replace(
        /[&<>"']/g,
        (character) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[character],
      ),
    LOCALES: { en: "en-GB" },
    LEARNING_LEVELS: ["A1", "A2", "B1", "B2", "C1"],
    icons: { book: "", sound: "", arrow: "" },
  };
  vm.createContext(context);
  for (const name of ["renderWords", "renderWordResults", "wordCards"]) {
    const start = new RegExp(`^function ${name}\\(`, "m").exec(source);
    assert.ok(start, `${name} exists`);
    const rest = source.slice(start.index + start[0].length);
    const next = /^function \w+\(/m.exec(rest);
    vm.runInContext(
      source.slice(start.index, start.index + start[0].length + next.index),
      context,
    );
  }
  const html = context.renderWords();
  assert.equal((html.match(/class="word-card"/g) || []).length, 40);
  assert.match(html, /word-40/);
  assert.doesNotMatch(html, /word-80</);
  assert.match(html, /data-word-level="C1"/);
  assert.doesNotMatch(html, /data-level=/);
  assert.equal(context.state.level, "A1");
  assert.equal(context.state.wordLevel, "B2");
  assert.match(html, /Showing 41–80 · 403 results/);

  context.state.wordQuery = '"<script>';
  context.state.wordPage = 9;
  const empty = context.renderWords();
  assert.equal(context.state.wordPage, 1);
  assert.match(empty, /value="&quot;&lt;script&gt;"/);
  assert.match(empty, /No matching words\./);
  assert.equal(context.state.level, "A1");
  const unsafe = context.wordCards([
    { word: '<img src="x">', en: "<script>bad</script>" },
  ]);
  assert.doesNotMatch(unsafe, /<img|<script>/);
  assert.match(unsafe, /&lt;script&gt;bad&lt;\/script&gt;/);
});
