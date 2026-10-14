import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseCSV,
  wordNetIndex,
  importVocabulary,
} from "../scripts/vocabulary-import.mjs";

test("CSV parser handles real quoted themes, CRLF and alternative spellings", () => {
  assert.deepEqual(
    parseCSV(
      'headword,pos,CEFR,theme\r\n"colour/color",noun,A1,"Food, drink"\r\n',
    ),
    [
      ["headword", "pos", "CEFR", "theme"],
      ["colour/color", "noun", "A1", "Food, drink"],
    ],
  );
  assert.deepEqual(parseCSV('a,"say ""hello"""'), [["a", 'say "hello"']]);
  assert.throws(() => parseCSV('a,"broken'));
});
test("WordNet uses the first indexed sense, not arbitrary file order", () => {
  const defs = wordNetIndex(
    "  header\nword n 2 1 @ 2 1 00000002 00000001\n",
    '00000001 00 n 01 word 0 0 | wrong sense\n00000002 00 n 01 word 0 0 | selected meaning; "an example"\n',
  );
  assert.equal(defs.get("word"), "selected meaning");
});
test("import respects source bands, expands spellings, omits C2 and never invents definitions", () => {
  const result = importVocabulary(
    [
      {
        source: "cefrj",
        csv: "headword,pos,CEFR\ncolour/color,noun,A1\ncolour,noun,B2\nunknown,noun,A2\ncomplex,adjective,C2\n",
      },
      {
        source: "octanove",
        csv: "headword,pos,CEFR\ncolour,noun,C1\nnovel,noun,C1\n",
      },
    ],
    {
      noun: new Map([
        ["colour", "A colour."],
        ["color", "A colour."],
        ["novel", "A book."],
      ]),
      adj: new Map(),
      verb: new Map(),
      adv: new Map(),
    },
  );
  assert.deepEqual(
    result.entries.map((row) => [row[0], row[2], row[4]]),
    [
      ["color", "A1", "cefrj"],
      ["colour", "A1", "cefrj"],
      ["novel", "C1", "octanove"],
    ],
  );
  assert.equal(result.excluded[0].reason, "no-matching-WordNet-definition");
});
