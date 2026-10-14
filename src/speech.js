// Use native English voices regardless of the interface language.
const VOICE_LOAD_TIMEOUT_MS = 700;
const SETTINGS_KEY = "10qadam-speech";
const DEFAULT_SETTINGS = { rate: 0.86, voiceURI: "auto" };
let requestId = 0;
let pendingVoiceLoad = null;
let activeUtterance = null;

function storageOrDefault(storage) {
  try {
    return storage === undefined ? globalThis.localStorage : storage;
  } catch {
    return null;
  }
}

function validSettings(value, base = DEFAULT_SETTINGS) {
  const result = { ...base };
  if (!value || typeof value !== "object" || Array.isArray(value))
    return result;
  if (Number.isFinite(value.rate) && value.rate >= 0.65 && value.rate <= 1.1) {
    result.rate = value.rate;
  }
  if (
    typeof value.voiceURI === "string" &&
    value.voiceURI.trim() &&
    value.voiceURI.length <= 512 &&
    !/[\u0000-\u001f\u007f]/.test(value.voiceURI)
  ) {
    result.voiceURI = value.voiceURI.trim();
  }
  return result;
}

export function getSpeechSettings(storage) {
  try {
    return validSettings(
      JSON.parse(storageOrDefault(storage)?.getItem(SETTINGS_KEY) ?? "null"),
    );
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Invalid fields leave the current setting unchanged; blocked storage is safe. */
export function saveSpeechSettings(patch, storage) {
  const settings = validSettings(patch, getSpeechSettings(storage));
  try {
    storageOrDefault(storage)?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Private browsing and storage restrictions must not break the game.
  }
  return settings;
}

function voiceQuality(voice) {
  const name = voice.name || "";
  return (
    (/natural|neural|premium|enhanced/i.test(name) ? 100 : 0) +
    (/google/i.test(name) ? 50 : 0) +
    (/^en[-_]GB$/i.test(voice.lang) ? 10 : 0) +
    (voice.default ? 1 : 0)
  );
}

function englishVoices(synth) {
  return [...synth.getVoices()]
    .filter((voice) => /^en(?:[-_]|$)/i.test(voice.lang || ""))
    .sort((a, b) => voiceQuality(b) - voiceQuality(a));
}

/** Plain metadata only: native voice objects stay inside the speech module. */
export function listEnglishVoices() {
  try {
    const synth = globalThis.window?.speechSynthesis;
    if (!synth) return [];
    const seen = new Set();
    return englishVoices(synth).flatMap((voice) => {
      if (
        typeof voice.voiceURI !== "string" ||
        !voice.voiceURI ||
        seen.has(voice.voiceURI)
      )
        return [];
      seen.add(voice.voiceURI);
      return [
        {
          voiceURI: voice.voiceURI,
          name: String(voice.name || voice.voiceURI),
          lang: String(voice.lang),
        },
      ];
    });
  } catch {
    return [];
  }
}

function englishVoice(synth, preferredURI) {
  const voices = englishVoices(synth);
  return (
    voices.find(
      (voice) => preferredURI !== "auto" && voice.voiceURI === preferredURI,
    ) || voices[0]
  );
}

function waitForEnglishVoice(synth, preferredURI) {
  return new Promise((resolve) => {
    let timeout;
    let finished = false;
    function finish(voice) {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      synth.removeEventListener("voiceschanged", checkVoices);
      pendingVoiceLoad = null;
      resolve(voice);
    }
    function checkVoices() {
      try {
        const voice = englishVoice(synth, preferredURI);
        if (voice) finish(voice);
      } catch {
        finish(null);
      }
    }
    pendingVoiceLoad = () => finish(null);
    synth.addEventListener("voiceschanged", checkVoices);
    timeout = setTimeout(() => finish(null), VOICE_LOAD_TIMEOUT_MS);
    // Recheck after subscribing so a just-loaded voice is not missed.
    checkVoices();
  });
}

export function stopSpeech() {
  requestId++;
  pendingVoiceLoad?.();
  if (activeUtterance) {
    activeUtterance.onend = activeUtterance.onerror = null;
    activeUtterance = null;
  }
  try {
    globalThis.window?.speechSynthesis?.cancel();
  } catch {
    // Cleanup must not prevent navigation or ending a round.
  }
}

/** Queue one word. onError receives a translatable, stable error code. */
export function speakWord(word, { onError, rate } = {}) {
  stopSpeech();
  const settings = validSettings({ rate }, getSpeechSettings());
  const currentRequest = requestId;
  const synth = globalThis.window?.speechSynthesis;
  const Utterance = globalThis.window?.SpeechSynthesisUtterance;
  let reported = false;
  const report = (code) => {
    if (currentRequest === requestId && !reported) {
      reported = true;
      onError?.(code);
    }
    return false;
  };
  if (!synth || !Utterance) {
    return Promise.resolve(report("unsupported"));
  }
  const text = String(word ?? "").trim();
  if (!text) return Promise.resolve(false);

  const play = (voice) => {
    if (currentRequest !== requestId) return false;
    if (!voice) return report("no-english-voice");
    try {
      const utterance = new Utterance(text);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = settings.rate;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.onend = () => {
        if (activeUtterance === utterance) activeUtterance = null;
      };
      utterance.onerror = (event) => {
        if (activeUtterance === utterance) activeUtterance = null;
        if (!["canceled", "interrupted"].includes(event.error)) {
          report("playback-failed");
        }
      };
      activeUtterance = utterance;
      // A paused browser synthesizer otherwise silently queues the word.
      if (synth.paused) synth.resume();
      synth.speak(utterance);
      return true;
    } catch {
      activeUtterance = null;
      return report("playback-failed");
    }
  };

  try {
    const voice = englishVoice(synth, settings.voiceURI);
    // Keep playback synchronous when voices exist, preserving click activation.
    if (voice) return Promise.resolve(play(voice));
    return waitForEnglishVoice(synth, settings.voiceURI).then(play);
  } catch {
    return Promise.resolve(report("playback-failed"));
  }
}
