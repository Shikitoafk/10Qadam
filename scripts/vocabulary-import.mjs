// Offline, reproducible import. Run after downloading the upstream files into
// .cache/vocabulary as documented in docs/vocabulary.md. Never scrapes dictionaries.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

export const LEVELS = ["A1", "A2", "B1", "B2", "C1"];
const POS = { noun: "noun", verb: "verb", adjective: "adj", adverb: "adv" };

export function parseCSV(input) {
  const rows = [];
  let row = [],
    cell = "",
    quoted = false;
  const text = input.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" && !quoted) {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (quoted) throw new Error("Unclosed CSV quote");
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

export function wordNetIndex(indexText, dataText) {
  const glosses = new Map();
  for (const line of dataText.split(/\r?\n/)) {
    if (!/^\d{8} /.test(line)) continue;
    const divider = line.indexOf(" | ");
    if (divider < 0) continue;
    // Examples follow semicolon + double quote. Retain the actual definition.
    const gloss = line
      .slice(divider + 3)
      .split(/;\s*"/)[0]
      .trim();
    if (gloss) glosses.set(line.slice(0, 8), gloss);
  }
  const definitions = new Map();
  for (const line of indexText.split(/\r?\n/)) {
    if (!line || /^\s/.test(line)) continue;
    const tokens = line.trim().split(/\s+/);
    const count = Number(tokens[2]),
      pointers = Number(tokens[3]);
    if (!Number.isInteger(count) || count < 1 || !Number.isInteger(pointers))
      continue;
    // lemma, POS, synset_count, p_cnt, pointers..., sense_cnt, tagsense_cnt, offsets...
    const firstOffset = tokens[6 + pointers];
    const definition = glosses.get(firstOffset);
    if (definition) definitions.set(tokens[0], definition);
  }
  return definitions;
}

export function importVocabulary(sources, wordnet) {
  const headwords = new Map(),
    excluded = [];
  for (const { csv, source } of sources) {
    const [header, ...rows] = parseCSV(csv);
    if (
      header?.[0] !== "headword" ||
      header[1] !== "pos" ||
      header[2] !== "CEFR"
    )
      throw new Error("Unexpected CEFR CSV schema");
    for (const [headword, pos, level] of rows) {
      if (!LEVELS.includes(level)) continue;
      if (!POS[pos]) {
        excluded.push({
          word: headword,
          level,
          reason: "unsupported-part-of-speech",
        });
        continue;
      }
      // Source slashes represent alternative spellings, never a literal answer.
      for (const variant of headword.split("/")) {
        const word = variant.trim().toLowerCase().replace(/\s+/g, " ");
        if (
          !/^[a-z]+(?:[-'][a-z]+)*(?: [a-z]+(?:[-'][a-z]+)*)*$/.test(word) ||
          word.length > 50
        ) {
          excluded.push({ word, level, reason: "unsupported-headword" });
          continue;
        }
        const definition = wordnet[POS[pos]].get(word.replaceAll(" ", "_"));
        if (!definition) {
          excluded.push({
            word,
            level,
            reason: "no-matching-WordNet-definition",
          });
          continue;
        }
        const existing = headwords.get(word);
        // Lowest *source-assigned* CEFR band wins; no frequency-based guesses.
        if (!existing || LEVELS.indexOf(level) < LEVELS.indexOf(existing[2]))
          headwords.set(word, [word, pos, level, definition, source]);
      }
    }
  }
  return {
    entries: [...headwords.values()].sort(
      (a, b) =>
        LEVELS.indexOf(a[2]) - LEVELS.indexOf(b[2]) ||
        a[0].localeCompare(b[0], "en"),
    ),
    excluded,
  };
}

export function runImport(root) {
  const folder = resolve(root, ".cache/vocabulary");
  const read = (path) => readFileSync(resolve(folder, path), "utf8");
  const wordnet = Object.fromEntries(
    Object.values(POS).map((pos) => [
      pos,
      wordNetIndex(
        read(`WordNet-3.0/dict/index.${pos}`),
        read(`WordNet-3.0/dict/data.${pos}`),
      ),
    ]),
  );
  const { entries, excluded } = importVocabulary(
    [
      { csv: read("cefrj.csv"), source: "cefrj" },
      { csv: read("octanove.csv"), source: "octanove" },
    ],
    wordnet,
  );
  if (entries.length < 5000)
    throw new Error(
      `Unexpectedly small import: ${entries.length}; inspect sources before publishing`,
    );
  const sha256 = (path) =>
    createHash("sha256")
      .update(readFileSync(resolve(folder, path)))
      .digest("hex");
  const metadata = {
    format:
      "Each row: [headword, partOfSpeech, CEFR, EnglishDefinition, levelSource]",
    importedOn: "2026-10-14",
    total: entries.length,
    levels: Object.fromEntries(
      LEVELS.map((level) => [
        level,
        entries.filter((row) => row[2] === level).length,
      ]),
    ),
    normalization:
      "Alternative spellings expanded; duplicate headwords merged at the lowest supported source band; WordNet first indexed sense matched by POS; entries without a definition and C2 omitted. No fabricated translations or CEFR labels.",
    sources: [
      {
        id: "cefrj",
        title: "The CEFR-J Wordlist Version 1.5",
        creator:
          "Yukio Tono / Tono Laboratory, Tokyo University of Foreign Studies",
        url: "https://github.com/openlanguageprofiles/olp-en-cefrj",
        file: "cefrj-vocabulary-profile-1.5.csv",
        sha256: sha256("cefrj.csv"),
        terms:
          "Research and commercial use without charge with proper citation; upstream copyright and disclaimer retained in public/licenses/CEFR-J-NOTICE.md.",
      },
      {
        id: "octanove",
        title: "Octanove Vocabulary Profile C1/C2 Version 1.0 (C1 subset)",
        creator: "Octanove Labs",
        url: "https://github.com/openlanguageprofiles/olp-en-cefrj",
        file: "octanove-vocabulary-profile-c1c2-1.0.csv",
        sha256: sha256("octanove.csv"),
        license: "CC-BY-SA-4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      },
      {
        id: "wordnet",
        title: "WordNet 3.0",
        creator: "Princeton University",
        url: "https://wordnet.princeton.edu/",
        archive: "https://wordnetcode.princeton.edu/3.0/WordNet-3.0.tar.gz",
        sha256: sha256("WordNet-3.0.tar.gz"),
        terms:
          "WordNet 3.0 license, retained in public/licenses/WORDNET-LICENSE.txt. English definitions only; CEFR bands come from the other sources, not WordNet.",
      },
    ],
    adaptationLicense:
      "Our adapted catalog arrangement is CC-BY-SA-4.0; underlying CEFR-J and WordNet notices remain applicable. This does not relicense application code or separately curated translations.",
    exclusions: excluded.reduce((result, item) => {
      result[item.reason] = (result[item.reason] || 0) + 1;
      return result;
    }, {}),
  };
  mkdirSync(resolve(root, "src/data"), { recursive: true });
  mkdirSync(resolve(root, "public/licenses"), { recursive: true });
  writeFileSync(
    resolve(root, "src/data/cefr-words.json"),
    JSON.stringify(entries) + "\n",
  );
  writeFileSync(
    resolve(root, "src/data/cefr-metadata.json"),
    JSON.stringify(metadata, null, 2) + "\n",
  );
  writeFileSync(
    resolve(root, "public/licenses/WORDNET-LICENSE.txt"),
    read("WordNet-3.0/LICENSE"),
  );
  writeFileSync(
    resolve(root, "public/licenses/CEFR-J-NOTICE.md"),
    read("CEFR-README.md"),
  );
  writeFileSync(
    resolve(root, ".cache/vocabulary/excluded.json"),
    JSON.stringify(excluded, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      {
        total: metadata.total,
        levels: metadata.levels,
        excluded: metadata.exclusions,
      },
      null,
      2,
    ),
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  runImport(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
