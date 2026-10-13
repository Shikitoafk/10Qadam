// Use native English voices regardless of the interface language.
const VOICE_LOAD_TIMEOUT_MS = 700;
let requestId = 0;
let pendingVoiceLoad = null;
let activeUtterance = null;

function voiceQuality(voice) {
  const name = voice.name || "";
  return (
    (/natural|neural|premium|enhanced/i.test(name) ? 100 : 0) +
    (/google/i.test(name) ? 50 : 0) +
    (/^en[-_]GB$/i.test(voice.lang) ? 10 : 0) +
    (voice.default ? 1 : 0)
  );
}

function englishVoice(synth) {
  return [...synth.getVoices()]
    .filter((voice) => /^en(?:[-_]|$)/i.test(voice.lang || ""))
    .sort((a, b) => voiceQuality(b) - voiceQuality(a))[0];
}

function waitForEnglishVoice(synth) {
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
        const voice = englishVoice(synth);
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
export function speakWord(word, { onError } = {}) {
  stopSpeech();
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
      utterance.rate = 0.86;
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
    const voice = englishVoice(synth);
    // Keep playback synchronous when voices exist, preserving click activation.
    if (voice) return Promise.resolve(play(voice));
    return waitForEnglishVoice(synth).then(play);
  } catch {
    return Promise.resolve(report("playback-failed"));
  }
}
