import {
  BATTLE_FORMATS,
  matchRules,
  sentenceCompare,
  sentencePlace,
  battleAccuracy,
} from "./sentence-battle.js";
import { compareDictation } from "./study.js";
import { t } from "./i18n.js";

export function battleFormatUI(state, escape) {
  const tr = (key) => escape(t(key, state.language));
  return `<div class="battle-format" data-no-i18n><span>${tr("Battle format")}</span><div role="group" aria-label="${tr("Battle format")}">${BATTLE_FORMATS.map((format) => `<button data-battle-format="${format}" class="${(state.format || "words") === format ? "selected" : ""}" aria-pressed="${(state.format || "words") === format}">${tr(format === "sentences" ? "Sentences" : "Words")}</button>`).join("")}</div><small>${tr(state.format === "sentences" ? "5 sentences · 35 seconds each" : "10 words · 12 seconds each")}</small></div>${state.format === "sentences" ? `<p class="battle-format-note" data-no-i18n>${tr("Sentence accuracy decides the winner. No speed bonus. Equal accuracy is a draw.")}<br>${tr("Sentence ratings are separate from word ratings.")}</p>` : ""}`;
}

export function sentenceArenaUI({
  state,
  escape,
  icons,
  levels,
  modes,
  onlineConfigured,
  shortcut,
}) {
  const tr = (key) => escape(t(key, state.language));
  return `<section class="page-intro"><div><div class="eyebrow">10QADAM / ${tr("Sentences")}</div><h1>${tr("A sentence at a time.")}</h1><p>${tr("Listen, type and compare your accuracy.")}</p></div><div class="intro-stamp"><span>LISTEN</span><span class="stamp-cross">×</span><span>TYPE</span><span class="stamp-cross">×</span><span>WIN</span></div></section>${battleFormatUI(state, escape)}<section class="hero-arena"><div class="hero-copy"><span class="pill">${icons.sound} A1–C1</span><h2>${tr("Listen to the sentence")}</h2><p>${tr("Replay as often as you need before time runs out. One submitted answer per round.")}</p><button class="button light" data-action="quick-play">Выйти на арену ${icons.arrow}</button><div class="hero-meta"><span>${tr("5 sentences · 35 seconds each")}</span><i></i><span>${tr("Accuracy only")}</span></div></div><div class="hero-visual" aria-hidden="true"><div class="visual-grid"></div><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="letter-tile tile-s">Aa</div><div class="visual-score"><span class="score-check">${icons.check}</span><div>${tr("Accuracy")}<small>78% → 80%</small></div></div></div></section><section class="mode-section"><div class="section-heading"><h2>Как играем?</h2><div class="level-select"><span>Уровень английского</span><div role="group">${levels.map((level) => `<button data-level="${level}" class="${state.level === level ? "selected" : ""}" aria-pressed="${state.level === level}">${level}</button>`).join("")}</div></div></div><div class="mode-grid">${Object.entries(
    modes,
  )
    .map(
      ([key, mode]) =>
        `<button class="mode-card ${mode.color} ${state.mode === key ? "chosen" : ""}" data-mode="${key}" aria-pressed="${state.mode === key}"><div class="mode-card-top"><span class="mode-code">${mode.label}</span><span class="selection-circle">${state.mode === key ? icons.check : ""}</span></div><div class="mode-illustration ${key}"><span class="mini-letter first">Aa</span>${key !== "solo" ? '<em>vs</em><span class="mini-letter second">Bb</span>' : '<span class="solo-ring"></span>'}</div><div class="mode-title"><h3>${mode.name}</h3><span>${mode.players}<small>ИГРОКА</small></span></div><p>${tr("Listen, type and compare your accuracy.")}</p><div class="mode-card-bottom">${mode.caption} ${icons.arrow}</div></button>`,
    )
    .join(
      "",
    )}</div><div class="play-bar"><div><span class="play-ready">${icons.sound}</span><p><strong>${tr(modes[state.mode].name)} · ${state.level} · ${tr("Sentences")}</strong><span>${state.mode === "solo" ? "Тренировка без регистрации" : onlineConfigured ? "Соперники с близким рейтингом" : "Проверь механику в демо с ботами"}</span></p></div><button class="button dark" data-action="play">${state.mode === "solo" ? "Начать тренировку" : onlineConfigured ? "Найти игру" : "Попробовать баттл"} ${icons.arrow}</button></div></section><p class="battle-format-note">${tr("Capital letters and punctuation do not affect accuracy. Missing rounds count as zero.")}</p>${shortcut}`;
}

export function sentenceResultUI({ match: m, state, escape, icons, avatar }) {
  const tr = (key) => escape(t(key, state.language));
  const rules = matchRules(m);
  const results = [...(m.results || [])].sort(sentenceCompare);
  const mine = results.find(
    (p) => p.id === (m.local ? "self" : state.user?.id),
  ) || { score: 0, correct: 0 };
  const place = sentencePlace(mine, results);
  const tie =
    results.filter((p) => Number(p.score) === Number(mine.score)).length > 1;
  const title =
    m.mode === "solo"
      ? "Ещё на шаг вперёд."
      : place === 1 && tie
        ? "You tied for first place."
        : place === 1
          ? "Твоё слово победило."
          : "Хороший матч. Ещё один?";
  const ranking =
    m.mode === "solo"
      ? ""
      : `<div class="result-ranking">${results.map((p) => `<div class="history-row"><span class="leader-place">${sentencePlace(p, results)}</span><div class="leader-player">${avatar(p.username)}<strong data-no-i18n>${escape(p.username)}</strong></div><strong>${battleAccuracy(p, m)}%<small>${tr("Average accuracy")}${!m.local && p.rating_change !== undefined ? ` · ${p.rating_change >= 0 ? "+" : ""}${Number(p.rating_change)} ${tr("rating")}` : ""}</small></strong></div>`).join("")}</div>`;
  const review = (m.answers || [])
    .map((answer) => {
      const target = answer.word || answer.text || "";
      const comparison = compareDictation(answer.answer || "", target);
      const diff = comparison.diff
        .map((part) =>
          part.type === "same"
            ? escape(part.actual)
            : part.type === "extra"
              ? `<del>${escape(part.actual)}</del>`
              : `<mark>${escape(part.expected)}</mark>`,
        )
        .join("");
      return `<div class="review-word ${answer.correct ? "correct" : "incorrect"}"><span>${answer.correct ? icons.check : icons.close}</span><div><strong data-no-i18n>${escape(target)}</strong><small data-no-i18n>${tr("Твой ответ:")} ${escape(answer.answer || t("нет ответа", state.language))}</small><div class="sentence-diff" data-no-i18n>${diff}</div></div><button class="icon-button" data-speak="${escape(target)}" aria-label="${tr("Listen to the sentence")}">${icons.sound}</button><b>${Number(answer.accuracy ?? answer.points ?? 0)}%</b></div>`;
    })
    .join("");
  return `<section class="result-header"><span class="eyebrow">${tr(m.local && m.mode !== "solo" ? "ДЕМО ЗАВЕРШЕНО" : "МАТЧ ЗАВЕРШЁН")} · ${escape(m.level)} · ${tr("Sentences")}</span><h1>${tr(title)}</h1><p>${tr("Sentence accuracy decides the winner. No speed bonus. Equal accuracy is a draw.")}</p>${m.local && m.mode !== "solo" ? `<p>${t("Боты не влияют на твой рейтинг", state.language)}</p>` : ""}</section><div class="result-stats"><div><span>${tr("Average accuracy")}</span><strong>${battleAccuracy(mine, m)}<small>%</small></strong></div><div><span>${tr("Perfect sentences")}</span><strong>${Number(mine.correct || 0)}<small> / ${rules.roundCount}</small></strong></div><div><span>${tr("Accuracy points")}</span><strong>${Number(mine.score || 0)}<small> / ${rules.roundCount * 100}</small></strong></div></div>${ranking}<div class="result-actions"><button class="button dark" data-action="again">Ещё один матч ${icons.arrow}</button><button class="button outline" data-action="home">На главную</button></div><section class="review-section sentence-review"><div class="section-heading"><h2>${tr("Sentence review")}</h2></div><p class="battle-format-note">${tr("Capital letters and punctuation do not affect accuracy. Missing rounds count as zero.")}</p><div class="review-grid">${review}</div></section>`;
}
