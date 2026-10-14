import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("AI generation quotas are private, daily, capped project-wide and survive migration reruns", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema public,auth to anon,authenticated;
      grant execute on function auth.uid() to anon,authenticated;`);
    const migration = await readFile(
      new URL(
        "../supabase/migrations/20261014_ai_plan_quota.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.exec(migration);
    const ids = Array.from(
      { length: 35 },
      (_, i) => `20000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    );
    for (const id of ids)
      await db.query("insert into auth.users values($1)", [id]);
    const asUser = async (id) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      await db.exec("set role authenticated");
    };
    const consume = async () =>
      (await db.query("select public.consume_plan_quota() as allowed")).rows[0]
        .allowed;
    await asUser(ids[0]);
    assert.equal(await consume(), true);
    assert.equal(await consume(), true);
    assert.equal(await consume(), true);
    assert.equal(await consume(), false);
    await assert.rejects(
      db.query("select * from public.ai_plan_usage"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("update public.ai_plan_usage set attempts=1"),
      /permission denied/,
    );
    await db.exec("reset role");
    await db.exec(migration);
    await asUser(ids[0]);
    assert.equal(
      await consume(),
      false,
      "redeploy cannot reset a user's quota",
    );
    await db.exec("reset role");
    await db.exec("update public.ai_plan_usage set usage_date=usage_date-1");
    await asUser(ids[0]);
    assert.equal(
      await consume(),
      true,
      "yesterday does not consume today's quota",
    );
    let accepted = 1;
    for (const id of ids.slice(1)) {
      await asUser(id);
      for (let j = 0; j < 3; j++) if (await consume()) accepted++;
    }
    assert.equal(accepted, 100);
    assert.equal(
      await consume(),
      false,
      "new accounts cannot exceed project quota",
    );
    await db.exec("reset role; set role anon");
    await assert.rejects(
      db.query("select public.consume_plan_quota()"),
      /permission denied/,
    );
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub','',false)");
    await assert.rejects(
      db.query("select public.consume_plan_quota()"),
      /Authentication required/,
    );
  } finally {
    await db.close();
  }
});
