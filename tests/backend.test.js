import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("Supabase game rules execute in PostgreSQL with isolated auth stubs", async (t) => {
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
    const schema = await readFile(
      new URL("../supabase/schema.sql", import.meta.url),
      "utf8",
    );
    await db.exec(schema);
    await db.exec(schema);
    const ids = Array.from(
      { length: 8 },
      (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    );
    for (let i = 0; i < ids.length; i++)
      await db.query(
        "insert into auth.users(id,raw_user_meta_data) values($1,$2)",
        [ids[i], JSON.stringify({ username: `Player ${i + 1}` })],
      );
    const asUser = async (id) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      await db.exec("set role authenticated");
    };
    const admin = async () => db.exec("reset role");
    const rpc = async (sql, args = []) =>
      (await db.query(sql, args)).rows[0].data;
    let duel;
    await t.test(
      "schema is repeatable; queue respects level and assigns exactly two players",
      async () => {
        await asUser(ids[0]);
        assert.equal(
          (await rpc("select public.join_matchmaking('duel','A1') as data"))
            .status,
          "waiting",
        );
        await asUser(ids[1]);
        assert.equal(
          (await rpc("select public.join_matchmaking('duel','A2') as data"))
            .status,
          "waiting",
        );
        await rpc("select public.cancel_matchmaking() as data");
        const match = await rpc(
          "select public.join_matchmaking('duel','A1') as data",
        );
        duel = match.match_id;
        assert.ok(duel);
        await asUser(ids[0]);
        assert.equal(
          (await rpc("select public.poll_matchmaking() as data")).match_id,
          duel,
        );
        const state = await rpc("select public.get_match_state($1) as data", [
          duel,
        ]);
        assert.equal(state.players.length, 2);
        assert.equal(state.challenge, null);
        assert.equal(state.status, "countdown");
        assert.equal(state.answers.length, 0);
        await admin();
        assert.equal(
          (
            await db.query(
              "select count(*)::integer as count from public.match_rounds where match_id=$1",
              [duel],
            )
          ).rows[0].count,
          10,
        );
      },
    );
    await t.test(
      "direct score writes, future-word reads and чужой матч are denied",
      async () => {
        await asUser(ids[0]);
        await assert.rejects(
          db.query("update public.profiles set rating_a1=99999 where id=$1", [
            ids[0],
          ]),
          /permission denied/,
        );
        await assert.rejects(
          db.query("select * from public.words"),
          /permission denied/,
        );
        await asUser(ids[2]);
        await assert.rejects(
          db.query("select public.get_match_state($1)", [duel]),
          /Нет доступа/,
        );
        await db.exec("set role anon");
        await assert.rejects(
          db.query("select public.join_matchmaking('duel','A1')"),
          /permission denied/,
        );
      },
    );
    await t.test(
      "deadline, correct answer normalization and single attempt are server enforced",
      async () => {
        await asUser(ids[0]);
        await assert.rejects(
          db.query("select public.submit_match_answer($1,0,$2)", [
            duel,
            "apple",
          ]),
          /Время ответа/,
        );
        await admin();
        await db.query(
          "update public.matches set starts_at=clock_timestamp()-interval '1 second',ends_at=clock_timestamp()+interval '119 seconds' where id=$1",
          [duel],
        );
        const word = (
          await db.query(
            "select w.word from public.match_rounds r join public.words w on w.id=r.word_id where r.match_id=$1 and r.round_index=0",
            [duel],
          )
        ).rows[0].word;
        await asUser(ids[0]);
        const answer = await rpc(
          "select public.submit_match_answer($1,0,$2) as data",
          [duel, ` ${word.toUpperCase()} `],
        );
        assert.equal(answer.correct, true);
        assert.ok(answer.points >= 100 && answer.points <= 150);
        await assert.rejects(
          db.query("select public.submit_match_answer($1,0,$2)", [duel, word]),
          /уже отправлен/,
        );
        await assert.rejects(
          db.query("select public.submit_match_answer($1,1,$2)", [duel, word]),
          /Время ответа/,
        );
        await admin();
        await db.query(
          "update public.matches set starts_at=clock_timestamp()-interval '13 seconds' where id=$1",
          [duel],
        );
        await asUser(ids[1]);
        await assert.rejects(
          db.query("select public.submit_match_answer($1,0,$2)", [duel, word]),
          /Время ответа/,
        );
        await assert.rejects(
          db.query("select public.finish_match($1)", [duel]),
          /еще не завершен/,
        );
      },
    );
    await t.test(
      "accuracy wins over speed; Elo is level specific and applied exactly once",
      async () => {
        await admin();
        await db.query(
          "update public.match_players set correct=10,score=1000 where match_id=$1 and user_id=$2",
          [duel, ids[0]],
        );
        await db.query(
          "update public.match_players set correct=9,score=1350 where match_id=$1 and user_id=$2",
          [duel, ids[1]],
        );
        await db.query(
          "update public.matches set ends_at=clock_timestamp()-interval '1 second' where id=$1",
          [duel],
        );
        await asUser(ids[0]);
        const result = await rpc("select public.finish_match($1) as data", [
          duel,
        ]);
        assert.equal(result.results[0].id, ids[0]);
        assert.equal(result.results[0].rating_change, 16);
        assert.equal(result.results[1].rating_change, -16);
        assert.equal(result.answers.length, 10);
        await rpc("select public.finish_match($1) as data", [duel]);
        await admin();
        const p = (
          await db.query("select * from public.profiles where id=$1", [ids[0]])
        ).rows[0];
        assert.equal(p.rating_a1, 1016);
        assert.equal(p.rating_a2, 1000);
        assert.equal(p.games, 1);
      },
    );
    await t.test(
      "four-player room needs four real players; all-zero tie leaves rating unchanged",
      async () => {
        let match;
        for (const id of ids.slice(2, 6)) {
          await asUser(id);
          match = await rpc(
            "select public.join_matchmaking('four','A2') as data",
          );
        }
        assert.ok(match.match_id);
        const matchId = match.match_id;
        const state = await rpc("select public.get_match_state($1) as data", [
          matchId,
        ]);
        assert.equal(state.players.length, 4);
        await admin();
        await db.query(
          "update public.matches set ends_at=clock_timestamp()-interval '1 second' where id=$1",
          [matchId],
        );
        await asUser(ids[2]);
        const result = await rpc("select public.finish_match($1) as data", [
          matchId,
        ]);
        assert.ok(result.results.every((x) => x.rating_change === 0));
        assert.equal(result.answers.length, 10);
      },
    );
    await t.test(
      "stale queues expire and repeated joins never duplicate an entry",
      async () => {
        await asUser(ids[6]);
        await rpc("select public.join_matchmaking('duel','A1') as data");
        await rpc("select public.join_matchmaking('duel','A1') as data");
        await admin();
        assert.equal(
          (
            await db.query(
              "select count(*)::integer as count from public.matchmaking_queue where user_id=$1",
              [ids[6]],
            )
          ).rows[0].count,
          1,
        );
        await db.query(
          "update public.matchmaking_queue set heartbeat_at=clock_timestamp()-interval '31 seconds' where user_id=$1",
          [ids[6]],
        );
        await asUser(ids[7]);
        assert.equal(
          (await rpc("select public.join_matchmaking('duel','A1') as data"))
            .status,
          "waiting",
        );
        await rpc("select public.cancel_matchmaking() as data");
        assert.equal(
          (await rpc("select public.poll_matchmaking() as data")).status,
          "idle",
        );
      },
    );
  } finally {
    await db.close();
  }
});
