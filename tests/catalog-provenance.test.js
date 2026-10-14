import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import words from "../src/data/cefr-words.json" with { type: "json" };
import metadata from "../src/data/cefr-metadata.json" with { type: "json" };

test("the distributed catalogue matches its public provenance and source licences", () => {
  assert.equal(words.length, 7579);
  assert.equal(metadata.total, words.length);
  assert.equal(new Set(words.map(([word]) => word)).size, words.length);
  for (const [level, count] of Object.entries(metadata.levels))
    assert.equal(words.filter((row) => row[2] === level).length, count);
  assert.ok(
    words.every(
      ([word, pos, level, definition, source]) =>
        word &&
        pos &&
        level &&
        definition &&
        ["cefrj", "octanove"].includes(source),
    ),
  );
  const file = (name) => readFileSync(new URL(name, import.meta.url), "utf8");
  assert.match(
    file("../public/licenses/WORDNET-LICENSE.txt"),
    /Copyright 2006 by Princeton University/,
  );
  assert.match(
    file("../public/licenses/WORDNET-LICENSE.txt"),
    /PROVIDED "AS IS"/,
  );
  assert.match(file("../public/licenses/CEFR-J-NOTICE.md"), /Yukio Tono/);
  assert.match(
    file("../public/licenses/CC-BY-SA-4.0.txt"),
    /Attribution-ShareAlike 4.0/,
  );
  const page = file("../public/vocabulary-sources.html");
  assert.match(page, /licenses\/WORDNET-LICENSE.txt/);
  assert.match(page, /data\/cefr-vocabulary.json/);
  assert.match(page, /without warranties/);
});
