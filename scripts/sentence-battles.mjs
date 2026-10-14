import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { SENTENCES } from "../src/study.js";

export function generateSentenceBattles(
  root = path.resolve(fileURLToPath(new URL("..", import.meta.url))),
) {
  const migrationPath = path.join(
    root,
    "supabase/migrations/20261014_sentence_battles.sql",
  );
  const schemaPath = path.join(root, "supabase/schema.sql");
  const quote = (text) => `'${text.replaceAll("'", "''")}'`;
  const rows = Object.entries(SENTENCES).flatMap(([level, entries]) => {
    if (entries.length !== 12)
      throw new Error(`Expected twelve original sentences for ${level}`);
    return entries.map(
      ({ text }) => `(${quote(level)},${quote(text)},'sentences')`,
    );
  });
  const seed = `-- BEGIN SENTENCE SEED\n-- Generated from 10Qadam's original learning prompts; twelve per level A1-C1.\ninsert into public.words(level,word,kind) values\n${rows.join(",\n")}\non conflict(level,word) do nothing;\n-- END SENTENCE SEED`;
  const migration = readFileSync(migrationPath, "utf8").replace(
    /-- BEGIN SENTENCE SEED[\s\S]*?-- END SENTENCE SEED/,
    seed,
  );
  writeFileSync(migrationPath, migration);
  const block = migration.match(
    /-- BEGIN SENTENCE BATTLES[\s\S]*?-- END SENTENCE BATTLES/,
  )[0];
  let schema = readFileSync(schemaPath, "utf8");
  schema = schema.includes("-- BEGIN SENTENCE BATTLES")
    ? schema.replace(
        /-- BEGIN SENTENCE BATTLES[\s\S]*?-- END SENTENCE BATTLES/,
        () => block,
      )
    : schema.replace(/commit;\s*$/, () => `${block}\ncommit;\n`);
  writeFileSync(schemaPath, schema);
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  generateSentenceBattles();
