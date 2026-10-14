import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getSpeechSettings,
  listEnglishVoices,
  saveSpeechSettings,
  speakWord,
  stopSpeech,
} from "../src/speech.js";

function memoryStorage(initial) {
  let value = initial ?? null;
  return {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next;
    },
  };
}

function browserStorage(t, storage) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
  });
}

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

test("speech settings persist, merge partial updates, and reject invalid fields", () => {
  const storage = memoryStorage();
  assert.deepEqual(getSpeechSettings(storage), {
    rate: 0.86,
    voiceURI: "auto",
  });
  assert.deepEqual(
    saveSpeechSettings({ rate: 0.7, voiceURI: "English voice" }, storage),
    {
      rate: 0.7,
      voiceURI: "English voice",
    },
  );
  saveSpeechSettings({ rate: 1.1 }, storage);
  assert.deepEqual(getSpeechSettings(storage), {
    rate: 1.1,
    voiceURI: "English voice",
  });
  for (const rate of [0.64, 1.11, NaN, Infinity, "0.7", null]) {
    saveSpeechSettings({ rate, voiceURI: "\ninvalid" }, storage);
  }
  saveSpeechSettings({ voiceURI: "x".repeat(513) }, storage);
  saveSpeechSettings({ voiceURI: "" }, storage);
  assert.deepEqual(getSpeechSettings(storage), {
    rate: 1.1,
    voiceURI: "English voice",
  });
  saveSpeechSettings({ rate: 0.65, voiceURI: "auto" }, storage);
  assert.deepEqual(getSpeechSettings(storage), {
    rate: 0.65,
    voiceURI: "auto",
  });
});

test("malformed and inaccessible storage use safe defaults", (t) => {
  for (const initial of [
    "{broken",
    "null",
    "[]",
    '"string"',
    '{"rate":9,"voiceURI":42}',
  ]) {
    assert.deepEqual(getSpeechSettings(memoryStorage(initial)), {
      rate: 0.86,
      voiceURI: "auto",
    });
  }
  const inaccessible = {
    getItem() {
      throw new Error("Storage blocked");
    },
    setItem() {
      throw new Error("Storage blocked");
    },
  };
  assert.deepEqual(getSpeechSettings(inaccessible), {
    rate: 0.86,
    voiceURI: "auto",
  });
  assert.deepEqual(saveSpeechSettings({ rate: 0.7 }, inaccessible), {
    rate: 0.7,
    voiceURI: "auto",
  });
  browserStorage(t, null);
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("SecurityError");
    },
  });
  assert.deepEqual(getSpeechSettings(), { rate: 0.86, voiceURI: "auto" });
  assert.doesNotThrow(() => saveSpeechSettings({ rate: 1 }));
});

test("lists only English voice metadata in quality order and handles unsupported browsers", (t) => {
  const synth = browser(t, [
    { ...british, voiceURI: "gb" },
    { name: "Russian", lang: "ru-RU", voiceURI: "ru" },
    { ...natural, voiceURI: "natural" },
    { ...british, voiceURI: "gb" },
  ]);
  assert.deepEqual(listEnglishVoices(), [
    { name: natural.name, lang: "en-US", voiceURI: "natural" },
    { name: british.name, lang: "en-GB", voiceURI: "gb" },
  ]);
  synth.getVoices = () => {
    throw new Error("Unavailable");
  };
  assert.deepEqual(listEnglishVoices(), []);
  delete globalThis.window.speechSynthesis;
  assert.deepEqual(listEnglishVoices(), []);
});

test("uses a saved English voice and speed with a validated per-call speed override", async (t) => {
  const gb = { ...british, voiceURI: "gb" };
  const synth = browser(t, [gb, { ...natural, voiceURI: "natural" }]);
  browserStorage(t, memoryStorage());
  saveSpeechSettings({ voiceURI: "gb", rate: 0.7 });
  await speakWord("The garden is quiet.");
  assert.equal(synth.spoken[0].voice, gb);
  assert.equal(synth.spoken[0].rate, 0.7);
  assert.equal(synth.spoken[0].text, "The garden is quiet.");
  await speakWord("apple", { rate: 1 });
  assert.equal(synth.spoken[1].rate, 1);
  await speakWord("apple", { rate: 5 });
  assert.equal(synth.spoken[2].rate, 0.7);
  assert.equal(getSpeechSettings().rate, 0.7);
});

test("missing or non-English saved voices fall back to the clearest English voice", async (t) => {
  const best = { ...natural, voiceURI: "natural" };
  const synth = browser(t, [
    best,
    { name: "Russian", lang: "ru-RU", voiceURI: "ru" },
  ]);
  browserStorage(t, memoryStorage());
  for (const voiceURI of ["missing", "ru", "auto"]) {
    saveSpeechSettings({ voiceURI });
    await speakWord("flower");
    assert.equal(synth.spoken.at(-1).voice, best);
  }
});

test("delayed voice loading respects the saved preference and removes its listener", async (t) => {
  const synth = browser(t);
  browserStorage(t, memoryStorage());
  saveSpeechSettings({ voiceURI: "gb", rate: 0.65 });
  const pending = speakWord("school");
  const gb = { ...british, voiceURI: "gb" };
  synth.voices = [gb, { ...natural, voiceURI: "natural" }];
  synth.dispatchEvent(new Event("voiceschanged"));
  assert.equal(await pending, true);
  assert.equal(synth.spoken[0].voice, gb);
  assert.equal(synth.spoken[0].rate, 0.65);
  synth.dispatchEvent(new Event("voiceschanged"));
  assert.equal(synth.spoken.length, 1);
});
