import { t } from "./i18n.js";
import {
  studyWords,
  sentenceDeck,
  compareDictation,
  loadStudy,
  saveStudy,
  DICTATION_SECONDS,
  DICTATION_ROUNDS,
} from "./study.js";
import { LEARNING_LEVELS } from "./routes.js";
import {
  getSpeechSettings,
  saveSpeechSettings,
  listEnglishVoices,
  stopSpeech,
} from "./speech.js";
import { mascotMarkup } from "./mascot.js";

export function createStudyController({
  language,
  escape,
  icons,
  speak,
  render,
  openLevel,
}) {
  let level = "A1",
    tab = "cards",
    cards = null,
    dictation = null,
    timer = null;
  let progress = loadStudy();
  let companion = "sky";
  try {
    const saved = localStorage.getItem("10qadam-companion");
    if (["sky", "ink", "hidden"].includes(saved)) companion = saved;
  } catch {
    /* Optional storage. */
  }
  const text = (key) => t(key, language());
  const h = (key) => escape(text(key));
  const meaning = (item) => item[language()] || item.en || item.text;
  const button = (action, key, style = "outline", extra = "") =>
    `<button type="button" class="button ${style}" data-study-action="${action}" ${extra}>${h(key)}</button>`;
  const shuffle = (items) => {
    const deck = [...items];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  };
  function stop() {
    clearInterval(timer);
    timer = null;
    dictation = null;
    stopSpeech();
  }
  function setLevel(next) {
    if (!LEARNING_LEVELS.includes(next)) return;
    if (next !== level) {
      stop();
      cards = null;
      level = next;
    }
    try {
      localStorage.setItem("10qadam-study-level", level);
    } catch {
      /* Optional. */
    }
  }
  function preferences() {
    const settings = getSpeechSettings(),
      voices = listEnglishVoices();
    return `<section class="study-panel study-preferences"><span class="study-kicker">${h("English audio")}</span><h3>${h("Study settings")}</h3>
      <label for="study-rate">${h("Playback speed")}</label><select class="study-select" id="study-rate">${[
        [0.7, "Clear & slow"],
        [0.86, "Balanced"],
        [1, "Natural pace"],
      ]
        .map(
          ([rate, key]) =>
            `<option value="${rate}" ${Math.abs(settings.rate - rate) < 0.01 ? "selected" : ""}>${h(key)} · ${rate}×</option>`,
        )
        .join(
          "",
        )}${![0.7, 0.86, 1].includes(settings.rate) ? `<option value="${settings.rate}" selected>${settings.rate}×</option>` : ""}</select>
      <label for="study-voice">${h("English voice")}</label><select class="study-select" id="study-voice"><option value="auto">${h("Best available (automatic)")}</option>${voices.map((voice) => `<option value="${escape(voice.voiceURI)}" ${settings.voiceURI === voice.voiceURI ? "selected" : ""}>${escape(voice.name)} · ${escape(voice.lang)}</option>`).join("")}</select>
      <div class="study-inline-actions">${button("voice-preview", "Preview voice")}${button("voices-refresh", "Refresh voices")}</div><p class="study-meta">${h("Voices depend on your browser and device. Replay never pauses a match timer.")}</p></section>
      <section class="study-panel"><span class="study-kicker">${h("YOUR COMPANION")}</span><h3>${h("Meet Qyran")}</h3>${mascotMarkup(companion, "study-companion")}<p class="study-meta">${h("A little company for your next step. Choose a style, or keep things quiet.")}</p><div class="mascot-choices">${[
        ["sky", "Sky"],
        ["ink", "Ink"],
        ["hidden", "Hidden"],
      ]
        .map(
          ([value, key]) =>
            `<button class="mascot-choice" data-study-action="companion" data-value="${value}" aria-pressed="${companion === value}">${h(key)}</button>`,
        )
        .join("")}</div></section>`;
  }
  function renderCards() {
    const words = studyWords(level),
      known = new Set(progress.known),
      knownCount = words.filter((item) => known.has(item.word)).length;
    if (!cards)
      return `<section class="study-panel"><span class="study-kicker">${h("Flashcards")} · ${level}</span><h2>${h("A fresh set of ten")}</h2><p>${h("Ten cards. No timer. Just you and your next ten words.")}</p><div class="study-session-stats"><div><span>${h("WORDS REMEMBERED")}</span><strong>${knownCount}<small> / ${words.length}</small></strong></div><p>${h("Saved on this device")}</p></div><div class="study-inline-actions">${button("cards-start", "Start cards", "dark")}${button("cards-unknown", "Practise unknown words")}</div>${knownCount === words.length ? `<p class="study-meta">${h("All words in this level are marked as known. Try a fresh set to keep them sharp.")}</p>` : ""}</section>`;
    if (cards.index >= cards.deck.length)
      return `<section class="study-panel study-summary"><span class="study-kicker">${h("Session complete")}</span><h2>${h("One small session. A real step forward.")}</h2><strong class="study-result-score">${cards.remembered}<small> / ${cards.deck.length}</small></strong><p>${h("remembered this session")}</p><div class="study-inline-actions">${button("cards-start", "Try another set", "dark")}${button("cards-unknown", "Practise unknown words")}</div></section>`;
    const card = cards.deck[cards.index];
    return `<section class="study-panel"><div class="study-section-heading"><span class="study-kicker">${h("Flashcards")} · ${level}</span><span>${cards.index + 1} / ${cards.deck.length}</span></div><div class="study-progress"><div class="study-progress-fill" style="width:${(cards.index / cards.deck.length) * 100}%"></div></div><button class="study-card" data-study-action="flip" data-side="${cards.revealed ? "back" : "front"}" aria-label="${h("Flip card")}"><span class="study-card-label">${h(cards.revealed ? (language() !== "en" && !card[language()] ? "English definition" : "MEANING") : "WORD")}</span><strong class="${cards.revealed ? "study-card-meaning" : "study-card-word"}">${escape(cards.revealed ? meaning(card) : card.word)}</strong><span class="study-card-hint">${h(cards.revealed ? "Tap to see the word" : "Tap to reveal the meaning")}</span></button><div class="study-inline-actions">${button("card-hear", "Hear it")}</div><div class="study-card-actions">${button("card-again", "Again", "outline", cards.revealed ? "" : "disabled")}${button("card-known", "I know this", "dark", cards.revealed ? "" : "disabled")}</div></section>`;
  }
  function diffMarkup(result) {
    return result.diff
      .map((part) =>
        part.type === "same"
          ? `<span class="diff-same">${escape(part.expected)}</span>`
          : `${part.actual ? `<del class="diff-extra">${escape(part.actual)}</del>` : ""}${part.expected ? `<ins class="diff-missing">${escape(part.expected)}</ins>` : ""}`,
      )
      .join("");
  }
  function renderDictation() {
    if (!dictation)
      return `<section class="study-panel"><span class="study-kicker">${h("Sentence dictation")} · ${level}</span><h2>${h("Five sentences. One clearer ear.")}</h2><p>${h("Listen and type what you hear. Replay as often as you like within 35 seconds.")}</p><p class="study-quote">${h("Character accuracy, not all or nothing. Capital letters and punctuation do not count as mistakes.")}</p><div class="study-meta">${h("Local practice · No rating changes")}</div><div class="study-inline-actions">${button("dictation-start", "Start dictation", "dark")}</div>${progress.lastSession ? `<p class="study-meta">${h("Last dictation")}: ${progress.lastSession.level} · ${progress.lastSession.accuracy}%</p>` : ""}</section>`;
    const d = dictation;
    if (d.finished)
      return `<section class="study-panel study-summary"><span class="study-kicker">${h("Session complete")} · ${level}</span><h2>${h("One small session. A real step forward.")}</h2><span class="study-kicker">${h("AVERAGE ACCURACY")}</span><strong class="study-result-score">${d.average}<small>%</small></strong><div class="study-inline-actions">${button("dictation-start", "Try another set", "dark")}${button("dictation-end", "End session")}</div><div class="study-review-list">${d.answers.map((a) => `<article class="study-review-item"><strong>${a.result.accuracy}%</strong><div class="study-review-copy"><p lang="en">${escape(a.item.text)}</p><small>${h("Your answer")}: ${escape(a.answer || text("No answer"))}</small><div class="study-diff" lang="en">${diffMarkup(a.result)}</div></div><button class="icon-button" data-study-action="review-hear" data-index="${d.answers.indexOf(a)}" aria-label="${h("Hear it")}">${icons.sound}</button></article>`).join("")}</div></section>`;
    const current = d.deck[d.index],
      checked = d.answers[d.index];
    return `<section class="study-panel"><div class="study-section-heading"><span class="study-kicker">${h("Sentence dictation")} · ${level}</span><span>${d.index + 1} / ${d.deck.length}</span><strong class="study-timer" id="study-timer" data-urgent="${!checked && d.deadline - performance.now() < 8000}">${checked ? "—" : Math.max(0, Math.ceil((d.deadline - performance.now()) / 1000))}<small>s</small></strong></div><div class="study-progress"><div class="study-progress-fill" style="width:${(d.index / d.deck.length) * 100}%"></div></div><div class="study-inline-actions">${button("sentence-hear", "Replay sentence", "light")}</div>
      ${checked ? `<div role="status"><span class="study-kicker">${h("CHARACTER ACCURACY")}</span><strong class="study-result-score">${checked.result.accuracy}<small>%</small></strong>${checked.timedOut ? `<p class="study-meta">${h("Time is up. Your answer has been checked.")}</p>` : ""}<h3>${h("Correct sentence")}</h3><p class="study-quote" lang="en">${escape(current.text)}</p>${language() !== "en" ? `<p>${escape(meaning(current))}</p>` : ""}<p class="study-meta">${h("Your answer")}: ${escape(checked.answer || text("No answer"))}</p><div class="study-diff" lang="en">${diffMarkup(checked.result)}</div><div class="study-meta"><ins class="diff-missing">${h("Letters to add or replace")}</ins> · <del class="diff-extra">${h("Your extra letters")}</del></div><div class="study-inline-actions">${button("sentence-next", d.index + 1 === d.deck.length ? "See results" : "Next sentence", "dark")}</div></div>` : `<form id="dictation-form" class="study-form"><label for="dictation-answer">${h("Type what you hear")}</label><textarea id="dictation-answer" name="sentence" rows="3" maxlength="280" placeholder="${h("Your sentence…")}" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off" lang="en">${escape(d.draft)}</textarea><div class="study-inline-actions"><button class="button dark" type="submit">${h("Check sentence")}</button>${button("dictation-end", "End session")}</div></form>`}
      <p class="study-meta">${h("Local practice · No rating changes")}</p></section>`;
  }
  function view() {
    return `<section data-no-i18n><header class="study-intro"><div><span class="study-kicker">${h("YOUR LEARNING SPACE")} / ${level}</span><h1>${h("Learn it. Hear it. Own it.")}</h1><p>${h("Small sessions for the words that stay with you.")}</p></div>${mascotMarkup(companion, "study-intro-mascot")}</header><div class="study-section-heading"><div class="study-levels" aria-label="${h("Your level")}">${LEARNING_LEVELS.map((l) => `<a href="/learn/${l}" class="study-pill ${level === l ? "active" : ""}" data-study-level="${l}" ${level === l ? 'aria-current="page"' : ""}>${l}</a>`).join("")}</div><a class="text-link" href="/">${h("Change level")} ${icons.arrow}</a></div><div class="study-tabs" role="tablist" aria-label="${h("YOUR LEARNING SPACE")}">${[
      ["cards", "Flashcards"],
      ["sentences", "Sentence dictation"],
    ]
      .map(
        ([value, key]) =>
          `<button role="tab" data-study-action="tab" data-value="${value}" aria-controls="study-content" aria-selected="${tab === value}">${h(key)}</button>`,
      )
      .join(
        "",
      )}</div><div class="study-layout"><div id="study-content" role="tabpanel" aria-label="${h(tab === "cards" ? "Flashcards" : "Sentence dictation")}">${tab === "cards" ? renderCards() : renderDictation()}</div><aside class="study-side">${preferences()}</aside></div></section>`;
  }
  function startCards(unknown = false) {
    let pool = studyWords(level);
    const known = new Set(progress.known);
    if (unknown) pool = pool.filter((item) => !known.has(item.word));
    if (!pool.length) {
      cards = null;
      render();
      return;
    }
    cards = {
      deck: shuffle(pool).slice(0, 10),
      index: 0,
      revealed: false,
      remembered: 0,
    };
    render();
  }
  function beginSentence() {
    const d = dictation;
    d.draft = "";
    d.deadline = performance.now() + DICTATION_SECONDS * 1000;
    clearInterval(timer);
    timer = setInterval(() => {
      if (dictation !== d || d.finished || d.answers[d.index]) return;
      const left = Math.max(
        0,
        Math.ceil((d.deadline - performance.now()) / 1000),
      );
      const clock = document.querySelector("#study-timer");
      if (clock) {
        clock.innerHTML = `${left}<small>s</small>`;
        clock.dataset.urgent = String(left < 8);
      }
      if (!left) checkSentence(true);
    }, 200);
    render();
    speak(d.deck[d.index].text);
    document.querySelector("#dictation-answer")?.focus();
  }
  function checkSentence(timedOut = false) {
    const d = dictation;
    if (!d || d.finished || d.answers[d.index]) return;
    clearInterval(timer);
    timer = null;
    stopSpeech();
    const item = d.deck[d.index],
      answer = d.draft.slice(0, 280);
    d.answers.push({
      item,
      answer,
      result: compareDictation(answer, item.text),
      timedOut,
    });
    render();
  }
  function action(el) {
    if (el.dataset.studyLevel) {
      openLevel(el.dataset.studyLevel);
      return true;
    }
    const action = el.dataset.studyAction;
    if (!action) return false;
    if (action === "tab" && ["cards", "sentences"].includes(el.dataset.value)) {
      stop();
      cards = null;
      tab = el.dataset.value;
      render();
    }
    if (action === "cards-start" || action === "cards-unknown")
      startCards(action === "cards-unknown");
    if (action === "flip" && cards && cards.index < cards.deck.length) {
      cards.revealed = !cards.revealed;
      render();
    }
    if (action === "card-hear" && cards) speak(cards.deck[cards.index].word);
    if (
      (action === "card-known" || action === "card-again") &&
      cards?.revealed
    ) {
      const word = cards.deck[cards.index].word;
      const known = new Set(progress.known);
      if (action === "card-known") {
        known.add(word);
        cards.remembered++;
      } else known.delete(word);
      progress = saveStudy({ ...progress, known: [...known] });
      cards.index++;
      cards.revealed = false;
      stopSpeech();
      render();
    }
    if (action === "dictation-start") {
      stop();
      dictation = {
        deck: sentenceDeck(level, Math.random, DICTATION_ROUNDS),
        answers: [],
        index: 0,
        draft: "",
        finished: false,
      };
      beginSentence();
    }
    if (action === "sentence-hear" && dictation && !dictation.finished) {
      if (
        !dictation.answers[dictation.index] &&
        performance.now() >= dictation.deadline
      )
        checkSentence(true);
      else speak(dictation.deck[dictation.index].text);
    }
    if (action === "sentence-next" && dictation?.answers[dictation.index]) {
      const d = dictation;
      if (d.index + 1 >= d.deck.length) {
        stopSpeech();
        d.finished = true;
        d.average = Math.round(
          d.answers.reduce((sum, a) => sum + a.result.accuracy, 0) /
            d.answers.length,
        );
        progress = saveStudy({
          ...progress,
          lastSession: {
            level,
            accuracy: d.average,
            rounds: d.answers.length,
            date: new Date().toISOString(),
          },
        });
        render();
      } else {
        d.index++;
        beginSentence();
      }
    }
    if (action === "dictation-end") {
      stop();
      render();
    }
    if (action === "review-hear" && dictation?.finished) {
      const item = dictation.answers[Number(el.dataset.index)];
      if (item) speak(item.item.text);
    }
    if (action === "voice-preview")
      speak("One small step today. A little more confidence tomorrow.");
    if (action === "voices-refresh") render();
    if (
      action === "companion" &&
      ["sky", "ink", "hidden"].includes(el.dataset.value)
    ) {
      companion = el.dataset.value;
      try {
        localStorage.setItem("10qadam-companion", companion);
      } catch {
        /* Optional storage. */
      }
      render();
    }
    return true;
  }
  function input(event) {
    if (
      event.target.id !== "dictation-answer" ||
      !dictation ||
      dictation.finished ||
      dictation.answers[dictation.index]
    )
      return;
    if (performance.now() >= dictation.deadline) checkSentence(true);
    else dictation.draft = event.target.value.slice(0, 280);
  }
  function submit(event) {
    if (event.target.id !== "dictation-form") return false;
    event.preventDefault();
    checkSentence(performance.now() >= dictation?.deadline);
    return true;
  }
  function change(event) {
    if (event.target.id === "study-rate") {
      saveSpeechSettings({ rate: Number(event.target.value) });
      return true;
    }
    if (event.target.id === "study-voice") {
      saveSpeechSettings({ voiceURI: event.target.value });
      return true;
    }
    return false;
  }
  return {
    render: view,
    action,
    input,
    submit,
    change,
    stop,
    setLevel,
    getLevel: () => level,
    isActive: () => Boolean(dictation && !dictation.finished),
    mascot: () => mascotMarkup(companion, "study-shortcut-visual"),
  };
}
