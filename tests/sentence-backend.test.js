import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { SENTENCES, compareDictation } from "../src/study.js";

const migration = await readFile(
  new URL(
    "../supabase/migrations/20261014_sentence_battles.sql",
    import.meta.url,
  ),
  "utf8",
);
const schema = await readFile(
  new URL("../supabase/schema.sql", import.meta.url),
  "utf8",
);
test("sentence migration upgrades live ranked games and enforces server-owned scoring", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;
      create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as
      $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to anon,authenticated;
      grant execute on function auth.uid() to anon,authenticated;`);
    // Real previous production schema: strip only the new additive block.
    await db.exec(
      schema.replace(
        /-- BEGIN SENTENCE BATTLES[\s\S]*?-- END SENTENCE BATTLES/,
        "",
      ),
    );
    const ids = Array.from(
      { length: 16 },
      (_, i) => `20000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    );
    for (const [index, id] of ids.entries())
      await db.query(
        "insert into auth.users(id,raw_user_meta_data) values($1,$2)",
        [id, JSON.stringify({ username: `Sentence ${index}` })],
      );
    const admin = () => db.exec("reset role");
    const asUser = async (id) => {
      await admin();
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      await db.exec("set role authenticated");
    };
    const rpc = async (query, args = []) =>
      (await db.query(query, args)).rows[0].data;
    const join = (level = "C1", format = "sentences", mode = "duel") =>
      rpc("select public.join_matchmaking($1,$2,$3) as data", [
        mode,
        level,
        format,
      ]);
    await asUser(ids[0]);
    await rpc("select public.join_matchmaking('duel','A1') as data");
    await asUser(ids[1]);
    const old = (
      await rpc("select public.join_matchmaking('duel','A1') as data")
    ).match_id;
    await admin();
    await db.query(
      "update public.matches set starts_at=clock_timestamp()-interval '1 second',ends_at=clock_timestamp()+interval '119 seconds' where id=$1",
      [old],
    );
    await asUser(ids[0]);
    await rpc("select public.submit_match_answer($1,0,'preserved') as data", [
      old,
    ]);
    await asUser(ids[2]);
    await rpc("select public.join_matchmaking('duel','A2') as data");
    await admin();
    await db.query(
      "update public.profiles set rating_c1=1432,games=9,wins=4 where id=$1",
      [ids[3]],
    );
    const previous = {};
    for (const table of [
      "matches",
      "match_players",
      "match_rounds",
      "answers",
      "matchmaking_queue",
      "profiles",
      "words",
    ])
      previous[table] = (
        await db.query(`select * from public.${table} order by 1,2`)
      ).rows;
    await db.exec(migration);
    await db.exec(migration);
    await t.test(
      "additive, repeatable migration preserves legacy records and seeds 12 original sentences per level",
      async () => {
        for (const [table, rows] of Object.entries(previous)) {
          const actual = (
            await db.query(`select * from public.${table} order by 1,2`)
          ).rows;
          for (const row of rows)
            for (const [key, value] of Object.entries(row))
              assert.deepEqual(
                actual.find(
                  (entry) =>
                    entry[table === "words" ? "id" : Object.keys(row)[0]] ===
                      row[table === "words" ? "id" : Object.keys(row)[0]] &&
                    ((table !== "match_players" &&
                      table !== "answers" &&
                      table !== "match_rounds") ||
                      entry[Object.keys(row)[1]] === row[Object.keys(row)[1]]),
                )[key],
                value,
                `${table}.${key}`,
              );
        }
        const entries = (
          await db.query(
            "select level,word from public.words where kind='sentences' order by level,word",
          )
        ).rows;
        assert.equal(entries.length, 60);
        for (const [level, items] of Object.entries(SENTENCES))
          assert.deepEqual(
            entries.filter((x) => x.level === level).map((x) => x.word),
            items.map((x) => x.text).sort(),
          );
      },
    );
    await t.test(
      "PostgreSQL similarity matches browser scorer for punctuation, whitespace and partial answers",
      async () => {
        for (const [actual, expected] of [
          ["  DON'T\t PANIC!!!", "Don't panic."],
          ["hello world", "Hello, world!"],
          ["abcd", "abce"],
          ["", "hello"],
          ["", ""],
          ["a+b $2", "a+b $2"],
          ["Ｍｙ　ｃａｔ", "My cat."],
          ...Object.values(SENTENCES)
            .flat()
            .map(({ text }) => [text.slice(2, -3), text]),
        ]) {
          const score = (
            await db.query(
              "select public.sentence_accuracy($1,$2) as accuracy",
              [actual, expected],
            )
          ).rows[0].accuracy;
          assert.equal(
            score,
            compareDictation(actual, expected).accuracy,
            `${actual} vs ${expected}`,
          );
        }
      },
    );
    let match;
    await t.test(
      "word/sentence queues and levels stay isolated, poll keeps format, five same-level prompts",
      async () => {
        await asUser(ids[3]);
        assert.equal((await join()).status, "waiting");
        await asUser(ids[4]);
        assert.equal((await join("C1", "words")).status, "waiting");
        await asUser(ids[5]);
        assert.equal((await join("B2")).status, "waiting");
        await asUser(ids[3]);
        const waiting = await rpc("select public.poll_matchmaking() as data");
        assert.equal(waiting.format, "sentences");
        await asUser(ids[6]);
        const result = await join();
        assert.equal(result.status, "matched");
        match = result.match_id;
        const state = await rpc("select public.get_match_state($1) as data", [
          match,
        ]);
        assert.equal(state.format, "sentences");
        assert.equal(state.round_count, 5);
        assert.equal(state.round_seconds, 35);
        assert.equal(
          Date.parse(state.ends_at) - Date.parse(state.starts_at),
          175000,
        );
        assert.ok(
          state.players.every((player) => player.rating_before === 1000),
        );
        assert.equal(state.challenge, null);
        assert.equal(state.answers.length, 0);
        await admin();
        const rounds = (
          await db.query(
            "select w.kind,w.level,w.word from public.match_rounds r join public.words w on w.id=r.word_id where r.match_id=$1",
            [match],
          )
        ).rows;
        assert.equal(rounds.length, 5);
        assert.equal(new Set(rounds.map((x) => x.word)).size, 5);
        assert.ok(
          rounds.every((x) => x.level === "C1" && x.kind === "sentences"),
        );
      },
    );
    await t.test(
      "35 second deadlines, long answers, single submission and actual round count enforced",
      async () => {
        await asUser(ids[3]);
        await assert.rejects(
          rpc("select public.submit_match_answer($1,0,'hello') as data", [
            match,
          ]),
          /Время ответа/,
        );
        await admin();
        await db.query(
          "update public.matches set starts_at=clock_timestamp()-interval '1 second',ends_at=clock_timestamp()+interval '174 seconds' where id=$1",
          [match],
        );
        const target = (
          await db.query(
            "select w.word from public.match_rounds r join public.words w on w.id=r.word_id where r.match_id=$1 and r.round_index=0",
            [match],
          )
        ).rows[0].word;
        assert.ok(target.length > 64);
        await asUser(ids[3]);
        const result = await rpc(
          "select public.submit_match_answer($1,0,$2) as data",
          [match, target.toUpperCase()],
        );
        assert.equal(result.accuracy, 100);
        assert.equal(result.points, 100);
        assert.equal(result.correct, true);
        await assert.rejects(
          rpc("select public.submit_match_answer($1,0,$2) as data", [
            match,
            target,
          ]),
          /уже отправлен/,
        );
        await assert.rejects(
          rpc("select public.submit_match_answer($1,5,$2) as data", [
            match,
            target,
          ]),
          /Время ответа/,
        );
        await asUser(ids[6]);
        await assert.rejects(
          rpc("select public.submit_match_answer($1,0,$2) as data", [
            match,
            "a".repeat(501),
          ]),
          /допустимой длины/,
        );
        const partial = await rpc(
          "select public.submit_match_answer($1,0,$2) as data",
          [match, "a".repeat(500)],
        );
        assert.equal(
          partial.accuracy,
          compareDictation("a".repeat(500), target).accuracy,
        );
        await admin();
        await db.query(
          "update public.matches set starts_at=clock_timestamp()-interval '35 seconds' where id=$1",
          [match],
        );
        await asUser(ids[3]);
        await assert.rejects(
          rpc("select public.submit_match_answer($1,0,'late') as data", [
            match,
          ]),
          /Время ответа/,
        );
        const state = await rpc("select public.get_match_state($1) as data", [
          match,
        ]);
        assert.equal(state.round_index, 1);
        assert.equal(state.answers[0].accuracy, 100);
      },
    );
    await t.test(
      "80 percent beats 78 regardless of exact answers or speed, separate Elo settles once",
      async () => {
        await admin();
        await db.query(
          "update public.match_players set score=390,correct=4 where match_id=$1 and user_id=$2",
          [match, ids[3]],
        );
        await db.query(
          "update public.match_players set score=400,correct=0 where match_id=$1 and user_id=$2",
          [match, ids[6]],
        );
        await db.query(
          "update public.matches set ends_at=clock_timestamp()-interval '1 second' where id=$1",
          [match],
        );
        await asUser(ids[6]);
        const result = await rpc("select public.finish_match($1) as data", [
          match,
        ]);
        assert.equal(result.results[0].id, ids[6]);
        assert.equal(result.results[0].accuracy, 80);
        assert.equal(result.results[1].accuracy, 78);
        assert.equal(result.results[0].rating_change, 16);
        assert.equal(result.results[1].rating_change, -16);
        await rpc("select public.finish_match($1) as data", [match]);
        await admin();
        const profiles = (
          await db.query(
            "select * from public.profiles where id=any($1::uuid[])",
            [[ids[3], ids[6]]],
          )
        ).rows;
        for (const player of profiles) {
          assert.equal(player.games_sentence, 1);
          assert.equal(
            player.rating_sentence_c1,
            player.id === ids[6] ? 1016 : 984,
          );
          assert.equal(player.rating_c1, player.id === ids[3] ? 1432 : 1000);
          assert.equal(player.games, player.id === ids[3] ? 9 : 0);
          for (const level of ["a1", "a2", "b1", "b2"])
            assert.equal(player[`rating_sentence_${level}`], 1000);
        }
      },
    );
    await t.test(
      "four players and equal-score draw ignore exact-answer count",
      async () => {
        let four;
        for (const [index, id] of ids.slice(8, 12).entries()) {
          await asUser(id);
          four = await join("B1", "sentences", "four");
          assert.equal(four.status, index === 3 ? "matched" : "waiting");
        }
        await admin();
        await db.query(
          "update public.match_players set score=400,correct=case when user_id=$2 then 4 else 0 end where match_id=$1",
          [four.match_id, ids[8]],
        );
        await db.query(
          "update public.matches set ends_at=clock_timestamp()-interval '1 second' where id=$1",
          [four.match_id],
        );
        await asUser(ids[8]);
        const state = await rpc("select public.finish_match($1) as data", [
          four.match_id,
        ]);
        assert.equal(state.players.length, 4);
        assert.ok(state.players.every((x) => x.rating_change === 0));
        await admin();
        assert.ok(
          (
            await db.query(
              "select wins_sentence from public.profiles where id=any($1::uuid[])",
              [ids.slice(8, 12)],
            )
          ).rows.every((x) => x.wins_sentence === 0),
        );
      },
    );
    await t.test(
      "old word wrapper stays compatible and all private data/scorers remain denied",
      async () => {
        await asUser(ids[12]);
        const first = await rpc(
          "select public.join_matchmaking('duel','A2') as data",
        );
        assert.equal(first.status, "matched"); // preserved legacy queued player
        const state = await rpc("select public.get_match_state($1) as data", [
          first.match_id,
        ]);
        assert.equal(state.format, "words");
        assert.equal(state.round_count, 10);
        assert.equal(state.round_seconds, 12);
        await asUser(ids[13]);
        for (const invalid of [null, "sentence", ""])
          await assert.rejects(join("C1", invalid), /Неизвестный/);
        for (const query of [
          "select * from public.words",
          "select public.sentence_accuracy('a','b')",
          "select public.normalize_sentence('a')",
          "update public.profiles set rating_sentence_c1=9999",
        ])
          await assert.rejects(db.query(query), /permission denied/);
        await assert.rejects(
          rpc("select public.get_match_state($1) as data", [match]),
          /Нет доступа/,
        );
        await db.exec("set role anon");
        await assert.rejects(join(), /permission denied/);
      },
    );
    await t.test(
      "full schema and migration remain repeatable after sentence results",
      async () => {
        await admin();
        const before = (
          await db.query("select * from public.profiles order by id")
        ).rows;
        await db.exec(schema);
        await db.exec(migration);
        assert.deepEqual(
          (await db.query("select * from public.profiles order by id")).rows,
          before,
        );
        assert.equal(
          (
            await db.query(
              "select count(*)::integer as n from public.words where kind='sentences'",
            )
          ).rows[0].n,
          60,
        );
      },
    );
  } finally {
    await db.close();
  }
});
