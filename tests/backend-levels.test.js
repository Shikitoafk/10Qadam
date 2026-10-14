import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  selectRankedWords,
  RANKED_EXCLUDED_WORDS,
} from "../scripts/ranked-levels.mjs";

const migrationUrl = new URL(
  "../supabase/migrations/20261014_ranked_levels.sql",
  import.meta.url,
);
const schemaUrl = new URL("../supabase/schema.sql", import.meta.url);
const levels = ["A1", "A2", "B1", "B2", "C1"];

test("advanced bank generation preserves provenance and strict playable headwords", async () => {
  const catalogue = JSON.parse(
    await readFile(
      new URL("../src/data/cefr-words.json", import.meta.url),
      "utf8",
    ),
  );
  const words = selectRankedWords(catalogue);
  assert.deepEqual(
    Object.fromEntries(
      ["B1", "B2", "C1"].map((level) => [
        level,
        words.filter(([band]) => band === level).length,
      ]),
    ),
    { B1: 2058, B2: 2364, C1: 877 },
  );
  assert.equal(
    new Set(words.map(([level, word]) => `${level}:${word}`)).size,
    words.length,
  );
  assert.ok(
    words.every(
      ([level, word]) =>
        /^[a-z]{3,18}$/.test(word) &&
        !RANKED_EXCLUDED_WORDS.has(word) &&
        !["A1", "A2"].includes(level),
    ),
  );
  const migration = await readFile(migrationUrl, "utf8");
  const schema = await readFile(schemaUrl, "utf8");
  for (const [level, word] of words) {
    const row = `('${level}','${word}')`;
    assert.ok(migration.includes(row));
    assert.ok(schema.includes(row));
  }
  for (const source of [
    "Tono Laboratory",
    "Octanove Labs",
    "CC BY-SA 4.0",
    "public/licenses/CEFR-J-NOTICE.md",
  ]) {
    assert.ok(migration.includes(source));
    assert.ok(schema.includes(source));
  }
});

test("ranked upgrade runs on actual prior schema without resetting live data", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
      grant usage on schema public,auth to anon,authenticated;
      grant execute on function auth.uid() to anon,authenticated;
    `);
    // Frozen pre-upgrade schema, including the original A1/A2 RPCs/checks.
    await db.exec(
      await readFile(
        new URL("./fixtures/pre-ranked-levels-schema.sql", import.meta.url),
        "utf8",
      ),
    );
    const ids = Array.from(
      { length: 14 },
      (_, i) => `10000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    );
    for (const [index, id] of ids.entries()) {
      await db.query(
        "insert into auth.users(id,raw_user_meta_data) values($1,$2)",
        [id, JSON.stringify({ username: `Upgrade ${index}` })],
      );
    }
    const asUser = async (id) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      await db.exec("set role authenticated");
    };
    const admin = async () => db.exec("reset role");
    const rpc = async (query, args = []) =>
      (await db.query(query, args)).rows[0].data;
    const join = (level) =>
      rpc("select public.join_matchmaking('duel',$1) as data", [level]);
    const rows = async (table) =>
      (await db.query(`select * from public.${table} order by 1,2`)).rows;
    await db.query(
      "update public.profiles set rating_a1=1371,rating_a2=1169,games=12,wins=7 where id=$1",
      [ids[0]],
    );
    await db.query("update public.profiles set rating_a1=1371 where id=$1", [
      ids[1],
    ]);
    // Preserve a currently playing room, submitted answer and waiting queue row.
    await asUser(ids[0]);
    await join("A1");
    await asUser(ids[1]);
    const oldMatch = (await join("A1")).match_id;
    await admin();
    await db.query(
      "update public.matches set starts_at=clock_timestamp()-interval '1 second',ends_at=clock_timestamp()+interval '119 seconds' where id=$1",
      [oldMatch],
    );
    await asUser(ids[0]);
    await rpc("select public.submit_match_answer($1,0,'preserved') as data", [
      oldMatch,
    ]);
    await asUser(ids[2]);
    await join("A2");
    await admin();
    const preserved = {};
    for (const table of [
      "matches",
      "match_players",
      "match_rounds",
      "answers",
      "matchmaking_queue",
      "words",
    ])
      preserved[table] = await rows(table);
    const oldProfile = (
      await db.query("select * from public.profiles where id=$1", [ids[0]])
    ).rows[0];
    const migration = await readFile(migrationUrl, "utf8");
    await db.exec(migration);
    await db.exec(migration);
    await t.test(
      "repeatable migration retains history, queue, A1/A2 words and ratings",
      async () => {
        for (const table of [
          "matches",
          "match_players",
          "match_rounds",
          "answers",
          "matchmaking_queue",
        ])
          assert.deepEqual(await rows(table), preserved[table]);
        assert.deepEqual(
          (
            await db.query(
              "select * from public.words where level in ('A1','A2') order by 1,2",
            )
          ).rows,
          preserved.words,
        );
        const profile = (
          await db.query("select * from public.profiles where id=$1", [ids[0]])
        ).rows[0];
        for (const [key, value] of Object.entries(oldProfile))
          assert.deepEqual(profile[key], value);
        for (const level of ["b1", "b2", "c1"])
          assert.equal(profile[`rating_${level}`], 1000);
        const counts = (
          await db.query(
            "select level,count(*)::integer as count from public.words group by level order by level",
          )
        ).rows;
        assert.deepEqual(counts, [
          { level: "A1", count: 50 },
          { level: "A2", count: 50 },
          { level: "B1", count: 2058 },
          { level: "B2", count: 2364 },
          { level: "C1", count: 877 },
        ]);
      },
    );
    const newMatches = [];
    await t.test(
      "B1/B2/C1 queues never cross-match and challenges use only that level",
      async () => {
        for (const [index, level] of ["B1", "B2", "C1"].entries()) {
          const user = ids[3 + index * 2];
          const field = `rating_${level.toLowerCase()}`;
          await admin();
          await db.query(
            `update public.profiles set ${field}=1120 where id=any($1::uuid[])`,
            [[user, ids[4 + index * 2]]],
          );
          await asUser(user);
          assert.equal((await join(level)).status, "waiting");
        }
        await admin();
        assert.equal(
          (
            await db.query(
              "select count(*)::integer as count from public.matchmaking_queue",
            )
          ).rows[0].count,
          4,
        );
        for (const [index, level] of ["B1", "B2", "C1"].entries()) {
          await asUser(ids[4 + index * 2]);
          const result = await join(level);
          assert.equal(result.status, "matched");
          const matchId = result.match_id;
          newMatches.push(matchId);
          const state = await rpc("select public.get_match_state($1) as data", [
            matchId,
          ]);
          assert.equal(state.level, level);
          assert.equal(state.players.length, 2);
          assert.ok(
            state.players.every((player) => player.rating_before === 1120),
          );
          assert.equal(state.challenge, null);
          assert.equal(state.answers.length, 0);
          await admin();
          const rounds = (
            await db.query(
              "select r.round_index,w.level,w.word from public.match_rounds r join public.words w on w.id=r.word_id where r.match_id=$1 order by r.round_index",
              [matchId],
            )
          ).rows;
          assert.equal(rounds.length, 10);
          assert.ok(rounds.every((round) => round.level === level));
          assert.equal(new Set(rounds.map((round) => round.word)).size, 10);
        }
      },
    );
    await t.test(
      "advanced outcomes update only the selected Elo, enforce floor and settle once",
      async () => {
        for (const [index, level] of ["B1", "B2", "C1"].entries()) {
          const winner = ids[3 + index * 2];
          const loser = ids[4 + index * 2];
          const match = newMatches[index];
          const field = `rating_${level.toLowerCase()}`;
          await admin();
          await db.query(
            `update public.profiles set ${field}=100 where id=$1`,
            [loser],
          );
          const before = (
            await db.query("select * from public.profiles where id=$1", [
              winner,
            ])
          ).rows[0];
          await db.query(
            "update public.match_players set correct=8,score=1000 where match_id=$1 and user_id=$2",
            [match, winner],
          );
          await db.query(
            "update public.matches set ends_at=clock_timestamp()-interval '1 second' where id=$1",
            [match],
          );
          await asUser(winner);
          const result = await rpc("select public.finish_match($1) as data", [
            match,
          ]);
          assert.equal(result.status, "finished");
          assert.equal(result.results[0].rating_after, 1136);
          await rpc("select public.finish_match($1) as data", [match]);
          await admin();
          const after = (
            await db.query("select * from public.profiles where id=$1", [
              winner,
            ])
          ).rows[0];
          for (const band of levels)
            assert.equal(
              after[`rating_${band.toLowerCase()}`],
              before[`rating_${band.toLowerCase()}`] +
                (band === level ? 16 : 0),
            );
          assert.equal(after.games, before.games + 1);
          assert.equal(after.wins, before.wins + 1);
          assert.equal(
            (
              await db.query(
                `select ${field} as rating from public.profiles where id=$1`,
                [loser],
              )
            ).rows[0].rating,
            100,
          );
        }
      },
    );
    await t.test(
      "C1 four-player rooms require four same-level real players",
      async () => {
        for (const [index, id] of ids.slice(9, 13).entries()) {
          await asUser(id);
          const result = await rpc(
            "select public.join_matchmaking('four','C1') as data",
          );
          assert.equal(result.status, index === 3 ? "matched" : "waiting");
          if (index === 3) {
            const state = await rpc(
              "select public.get_match_state($1) as data",
              [result.match_id],
            );
            assert.equal(state.players.length, 4);
            assert.equal(state.level, "C1");
          }
        }
      },
    );
    await t.test(
      "unsupported levels and direct advanced rating/challenge access remain denied",
      async () => {
        await asUser(ids[13]);
        for (const level of ["C2", "b1", "", null])
          await assert.rejects(join(level), /Неизвестный режим/);
        await assert.rejects(
          db.query("update public.profiles set rating_c1=99999 where id=$1", [
            ids[13],
          ]),
          /permission denied/,
        );
        await assert.rejects(
          db.query("select * from public.words where level='C1'"),
          /permission denied/,
        );
        await assert.rejects(
          db.query("select public.get_match_state($1)", [newMatches[0]]),
          /Нет доступа/,
        );
        await db.exec("set role anon");
        await assert.rejects(join("C1"), /permission denied/);
      },
    );
    await t.test(
      "schema and migration can both be reapplied without duplicating or resetting advanced data",
      async () => {
        await admin();
        const before = await rows("profiles");
        const words = await rows("words");
        await db.exec(await readFile(schemaUrl, "utf8"));
        await db.exec(migration);
        assert.deepEqual(await rows("profiles"), before);
        assert.deepEqual(await rows("words"), words);
        for (const field of ["rating_b1", "rating_b2", "rating_c1"])
          await assert.rejects(
            db.query(`update public.profiles set ${field}=99 where id=$1`, [
              ids[0],
            ]),
            /check constraint/,
          );
      },
    );
  } finally {
    await db.close();
  }
});
