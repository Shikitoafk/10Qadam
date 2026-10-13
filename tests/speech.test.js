import { test } from "node:test";
import assert from "node:assert/strict";
import { speakWord, stopSpeech } from "../src/speech.js";

function browser(t, voices = []) {
  const previousWindow = globalThis.window;
  const synth = new EventTarget();
  synth.voices = voices;
  synth.spoken = [];
  synth.cancelCount = 0;
  synth.resumeCount = 0;
  synth.getVoices = () => synth.voices;
  synth.speak = (utterance) => synth.spoken.push(utterance);
  synth.cancel = () => synth.cancelCount++;
  synth.resume = () => synth.resumeCount++;
  class Utterance {
    constructor(text) {
      this.text = text;
    }
  }
  globalThis.window = {
    speechSynthesis: synth,
    SpeechSynthesisUtterance: Utterance,
  };
  t.after(() => {
    stopSpeech();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  });
  return synth;
}

const british = { name: "Microsoft Hazel", lang: "en-GB" };
const natural = { name: "Microsoft Aria Online (Natural)", lang: "en-US" };

test("selects a natural English voice over a default non-English or basic voice", async (t) => {
  const synth = browser(t, [
    { name: "Russian", lang: "ru-RU", default: true },
    british,
    natural,
  ]);
  const pending = speakWord(" apple ");
  // Existing voices must play in the original click's synchronous call stack.
  assert.equal(synth.spoken.length, 1);
  assert.equal(await pending, true);
  assert.equal(synth.spoken[0].voice, natural);
  assert.equal(synth.spoken[0].text, "apple");
  assert.equal(synth.spoken[0].lang, "en-US");
  assert.equal(synth.spoken[0].rate, 0.86);
  assert.equal(synth.spoken[0].pitch, 1);
  assert.equal(synth.spoken[0].volume, 1);
});

test("prefers British pronunciation among equally clear voices", async (t) => {
  const gb = { name: "Google UK English Female", lang: "en-GB" };
  const synth = browser(t, [
    { name: "Google US English", lang: "en-US", default: true },
    gb,
    { name: "Microsoft Daniel", lang: "en-GB" },
  ]);
  await speakWord("neighbour");
  assert.equal(synth.spoken[0].voice, gb);
});

test("waits for English voice loading and ignores early non-English voices", async (t) => {
  const synth = browser(t);
  const errors = [];
  const pending = speakWord("garden", { onError: (code) => errors.push(code) });
  synth.voices = [{ name: "Russian", lang: "ru-RU" }];
  synth.dispatchEvent(new Event("voiceschanged"));
  assert.equal(synth.spoken.length, 0);
  synth.voices.push(british);
  synth.dispatchEvent(new Event("voiceschanged"));
  assert.equal(await pending, true);
  assert.equal(synth.spoken[0].voice, british);
  synth.dispatchEvent(new Event("voiceschanged"));
  assert.equal(synth.spoken.length, 1);
  assert.deepEqual(errors, []);
});

test("stopping cancels pending playback even when English voices load afterwards", async (t) => {
  const synth = browser(t);
  const errors = [];
  const pending = speakWord("school", { onError: (code) => errors.push(code) });
  stopSpeech();
  synth.voices = [natural];
  synth.dispatchEvent(new Event("voiceschanged"));
  assert.equal(await pending, false);
  assert.equal(synth.spoken.length, 0);
  assert.deepEqual(errors, []);
});

test("rapid repeat requests only speak the newest word after loading", async (t) => {
  const synth = browser(t);
  const errors = [];
  const first = speakWord("apple", { onError: (code) => errors.push(code) });
  const latest = speakWord("water", { onError: (code) => errors.push(code) });
  synth.voices = [british];
  synth.dispatchEvent(new Event("voiceschanged"));
  assert.equal(await first, false);
  assert.equal(await latest, true);
  assert.deepEqual(
    synth.spoken.map((utterance) => utterance.text),
    ["water"],
  );
  assert.deepEqual(errors, []);
});

test("missing English voices report an actionable code instead of using another language", async (t) => {
  const synth = browser(t, [{ name: "Russian", lang: "ru-RU" }]);
  const errors = [];
  assert.equal(
    await speakWord("flower", { onError: (code) => errors.push(code) }),
    false,
  );
  assert.deepEqual(errors, ["no-english-voice"]);
  assert.equal(synth.spoken.length, 0);
});

test("unsupported browsers and synchronous synthesis failure have stable error codes", async (t) => {
  const synth = browser(t, [british]);
  const errors = [];
  delete globalThis.window.SpeechSynthesisUtterance;
  assert.equal(
    await speakWord("apple", { onError: (code) => errors.push(code) }),
    false,
  );
  globalThis.window.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
    }
  };
  synth.speak = () => {
    throw new Error("Unavailable output");
  };
  assert.equal(
    await speakWord("apple", { onError: (code) => errors.push(code) }),
    false,
  );
  assert.deepEqual(errors, ["unsupported", "playback-failed"]);
});

test("resumes paused synthesis, ignores cancellation, and reports other playback failures once", async (t) => {
  const synth = browser(t, [natural]);
  const errors = [];
  synth.paused = true;
  await speakWord("happy", { onError: (code) => errors.push(code) });
  assert.equal(synth.resumeCount, 1);
  const utterance = synth.spoken[0];
  utterance.onerror({ error: "canceled" });
  utterance.onerror({ error: "interrupted" });
  assert.deepEqual(errors, []);
  utterance.onerror({ error: "audio-unavailable" });
  utterance.onerror({ error: "synthesis-failed" });
  assert.deepEqual(errors, ["playback-failed"]);
});

test("late errors from a replaced word cannot show a toast for the new round", async (t) => {
  const synth = browser(t, [british]);
  const errors = [];
  await speakWord("apple", { onError: (code) => errors.push(code) });
  const lateError = synth.spoken[0].onerror;
  await speakWord("water", { onError: (code) => errors.push(code) });
  lateError({ error: "audio-unavailable" });
  assert.deepEqual(errors, []);
  assert.equal(synth.spoken[0].onerror, null);
});

test("empty words cancel stale speech without queueing meaningless audio", async (t) => {
  const synth = browser(t, [british]);
  await speakWord("apple");
  assert.equal(await speakWord("  "), false);
  assert.equal(synth.spoken.length, 1);
  assert.equal(synth.cancelCount, 2);
});
