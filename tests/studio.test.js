import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  STORAGE_KEY,
  initialState,
  load,
  dateKey,
  shiftDay,
  weekOf,
  duration,
  remaining,
  newTimer,
  toggleTimer,
  finishTimer,
  streak,
  canPlay,
  gameQuestions,
  normalizeAnswer,
  escapeHtml,
} from "../src/studio/model.js";

const storage = (data) => ({
  getItem(key) {
    assert.equal(key, STORAGE_KEY);
    return JSON.stringify(data);
  },
});

test("calendar weeks start Monday and handle year and month boundaries", () => {
  assert.deepEqual(weekOf("2026-01-01"), [
    "2025-12-29",
    "2025-12-30",
    "2025-12-31",
    "2026-01-01",
    "2026-01-02",
    "2026-01-03",
    "2026-01-04",
  ]);
  assert.equal(shiftDay("2028-02-28", 1), "2028-02-29");
  assert.equal(shiftDay("2028-02-29", 1), "2028-03-01");
});

test("focus resumes from the paused remainder after reload and records only one completion", () => {
  const start = new Date(2026, 10, 7, 23, 59, 50).getTime();
  const initial = initialState();
  initial.timer = toggleTimer(newTimer(1, "task-1"), start);
  assert.equal(remaining(initial.timer, start + 10_000), 50_000);
  initial.timer = toggleTimer(initial.timer, start + 10_000);
  const reloaded = load(storage(initial));
  assert.equal(reloaded.timer.taskId, "task-1");
  assert.equal(remaining(reloaded.timer, start + 80_000), 50_000);
  assert.equal(finishTimer(reloaded, start + 100_000), null);
  reloaded.timer = toggleTimer(reloaded.timer, start + 100_000);
  assert.equal(finishTimer(reloaded, start + 149_999), null);
  assert.deepEqual(finishTimer(reloaded, start + 600_000), {
    day: "2026-11-08",
    minutes: 1,
  });
  assert.equal(finishTimer(reloaded, start + 600_001), null);
  assert.equal(reloaded.sessions.length, 1);
  assert.equal(duration("25"), 25);
  assert.equal(duration(""), null);
  assert.equal(duration(1.5), null);
  assert.equal(newTimer(121), null);
});

test("streak counts unique consecutive days and stays alive until a full day is missed", () => {
  const sessions = ["2026-10-29", "2026-10-29", "2026-10-30", "2026-11-01"].map(
    (day) => ({ day, minutes: 25 }),
  );
  assert.deepEqual(streak(sessions, "2026-10-31"), { count: 2, today: false });
  assert.deepEqual(streak(sessions, "2026-11-01"), { count: 1, today: true });
  assert.deepEqual(streak(sessions, "2026-11-03"), { count: 0, today: false });
  assert.equal(dateKey(new Date(2026, 0, 9)), "2026-01-09");
});

test("game uses learner answers as distinct lanes and supports two-option decks", () => {
  const cards = [
    { front: "One", back: "F = ma" },
    { front: "Two", back: "πr²" },
    { front: "Three", back: " f  =  MA " },
  ];
  assert.equal(canPlay([cards[0], cards[2]]), false);
  assert.equal(canPlay(cards), true);
  assert.deepEqual(gameQuestions([cards[0], cards[2]]), []);
  const questions = gameQuestions(cards, () => 0.2);
  assert.equal(questions.length, cards.length);
  for (const item of questions) {
    assert.equal(item.choices.length, 2);
    assert.equal(new Set(item.choices.map(normalizeAnswer)).size, 2);
    assert.equal(
      item.choices[item.correct],
      cards.find((card) => card.front === item.front).back,
    );
  }
  const demo = initialState().decks[0].cards;
  assert.equal(gameQuestions(demo)[0].choices.length, 3);
  assert.equal(
    gameQuestions(
      Array.from({ length: 30 }, (_, i) => ({
        front: String(i),
        back: String(i),
      })),
    ).length,
    10,
  );
});

test("storage rejects broken records and never renders supplied markup as HTML", () => {
  assert.equal(
    load({
      getItem() {
        throw new Error("denied");
      },
    }).decks[0].id,
    "sample",
  );
  const loaded = load(
    storage({
      wallpaper: "<script>",
      minutes: -2,
      timer: { minutes: 25, end: -3, left: 10 },
      tasks: [
        { id: "bad", title: "A", date: "2026-02-30" },
        { id: "good", title: "B", date: "2026-02-28", time: "09:15" },
      ],
      decks: [
        {
          id: "mine",
          name: "<img>",
          cards: [{ id: "c", front: "One", back: "Two" }],
        },
      ],
    }),
  );
  assert.equal(loaded.tasks.length, 1);
  assert.equal(loaded.tasks[0].time, "09:15");
  assert.equal(loaded.timer, null);
  assert.equal(loaded.wallpaper, "forest");
  assert.equal(loaded.minutes, 25);
  assert.equal(loaded.decks[0].cards[0].back, "Two");
  assert.equal(escapeHtml(loaded.decks[0].name), "&lt;img&gt;");
});

test("home links to a separate deployable studio entry without replacing the arena", () => {
  const file = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
  assert.match(file("../src/home.js"), /href="\/studio\/"/);
  assert.match(file("../studio/index.html"), /src="\/src\/studio\/app.js"/);
  const config = JSON.parse(file("../vercel.json"));
  assert.ok(
    config.rewrites.some(
      (r) => r.source === "/studio" && r.destination === "/studio/index.html",
    ),
  );
  assert.ok(
    config.rewrites.some(
      (r) => r.source === "/arena" && r.destination === "/index.html",
    ),
  );
});
