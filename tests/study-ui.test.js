import { test } from "node:test";
import assert from "node:assert/strict";
import { createStudyController } from "../src/study-ui.js";
import { sentenceDeck, loadStudy } from "../src/study.js";

function controller(t) {
  const values = new Map();
  const previousStorage = globalThis.localStorage,
    previousDocument = globalThis.document;
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  globalThis.document = { querySelector: () => null };
  let lang = "en",
    renders = 0,
    now = 0;
  t.mock.method(performance, "now", () => now);
  t.mock.method(Math, "random", () => 0.5);
  const escape = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll('"', "&quot;");
  const spoken = [];
  const ui = createStudyController({
    language: () => lang,
    escape,
    icons: { sound: "", arrow: "" },
    speak: (text) => spoken.push(text),
    render: () => renders++,
    openLevel: () => {},
  });
  t.after(() => {
    ui.stop();
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  });
  return {
    ui,
    spoken,
    values,
    click: (action, value) =>
      ui.action({ dataset: { studyAction: action, value } }),
    language: (value) => {
      lang = value;
    },
    advance: (value) => {
      now = value;
    },
    renders: () => renders,
  };
}

test("cards require revealing, remember advanced words and persist across controllers", (t) => {
  const c = controller(t);
  c.ui.setLevel("B2");
  c.click("cards-start");
  assert.match(c.ui.render(), /1 \/ 10/);
  c.click("card-known");
  assert.equal(loadStudy().known.length, 0);
  c.click("flip");
  c.click("card-known");
  assert.equal(loadStudy().known.length, 1);
  assert.match(c.ui.render(), /2 \/ 10/);
  for (let i = 1; i < 10; i++) {
    c.click("flip");
    c.click("card-known");
  }
  assert.match(c.ui.render(), /Session complete/);
  assert.equal(loadStudy().known.length, 10);
  c.click("cards-unknown");
  assert.match(c.ui.render(), /1 \/ 10/);
});

test("dictation keeps a draft through language changes and reveals answers only after checking", (t) => {
  const c = controller(t);
  c.ui.setLevel("C1");
  c.click("tab", "sentences");
  c.click("dictation-start");
  const sentence = sentenceDeck("C1", () => 0.5)[0].text;
  assert.equal(c.spoken[0], sentence);
  assert.ok(!c.ui.render().includes(sentence));
  c.ui.input({
    target: { id: "dictation-answer", value: "<script>hello</script>" },
  });
  c.language("ru");
  assert.match(c.ui.render(), /&lt;script>/);
  assert.match(c.ui.render(), /Запиши услышанное/);
  let prevented = false;
  c.ui.submit({
    target: { id: "dictation-form" },
    preventDefault() {
      prevented = true;
    },
  });
  assert.ok(prevented);
  assert.ok(c.ui.render().includes(sentence));
  assert.match(c.ui.render(), /Правильное предложение/);
});

test("replays do not extend deadlines; late input checks the last on-time draft", (t) => {
  const c = controller(t);
  c.click("tab", "sentences");
  c.click("dictation-start");
  c.ui.input({ target: { id: "dictation-answer", value: "on time" } });
  c.advance(34000);
  c.click("sentence-hear");
  assert.equal(c.spoken.length, 2);
  c.advance(35001);
  c.ui.input({ target: { id: "dictation-answer", value: "too late" } });
  assert.match(c.ui.render(), /Time is up/);
  assert.match(c.ui.render(), /on time/);
  assert.doesNotMatch(c.ui.render(), /too late/);
  c.click("dictation-end");
  assert.equal(c.ui.isActive(), false);
});

test("all five answers complete a sentence session and persist an accurate advanced result", (t) => {
  const c = controller(t);
  c.ui.setLevel("B1");
  c.click("tab", "sentences");
  c.click("dictation-start");
  const deck = sentenceDeck("B1", () => 0.5);
  for (const item of deck) {
    c.ui.input({ target: { id: "dictation-answer", value: item.text } });
    c.ui.submit({ target: { id: "dictation-form" }, preventDefault() {} });
    c.click("sentence-next");
  }
  assert.match(c.ui.render(), /AVERAGE ACCURACY/);
  assert.match(c.ui.render(), /100/);
  assert.deepEqual(
    { ...loadStudy().lastSession, date: null },
    { level: "B1", accuracy: 100, rounds: 5, date: null },
  );
  assert.equal(c.ui.isActive(), false);
});

test("companion preference is optional and stored; changing levels cancels an active dictation", (t) => {
  const c = controller(t);
  c.click("companion", "hidden");
  assert.equal(c.ui.mascot(), "");
  assert.equal(c.values.get("10qadam-companion"), "hidden");
  c.click("tab", "sentences");
  c.click("dictation-start");
  assert.ok(c.ui.isActive());
  c.ui.setLevel("C1");
  assert.equal(c.ui.isActive(), false);
  assert.equal(c.ui.getLevel(), "C1");
  assert.match(c.ui.render(), /Start dictation/);
  assert.ok(!c.ui.change({ target: { id: "unknown" } }));
});
