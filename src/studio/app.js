import "./studio.css";
import {
  STORAGE_KEY,
  WALLPAPERS,
  MAX_TASKS,
  MAX_DECKS,
  MAX_CARDS,
  dateKey,
  shiftDay,
  weekOf,
  duration,
  remaining,
  newTimer,
  toggleTimer,
  finishTimer,
  streak,
  gameQuestions,
  canPlay,
  shuffle,
  escapeHtml as e,
  load,
} from "./model.js";
import { icon, dog, todayArt } from "./art.js";

const app = document.querySelector("#studio");
const storage = { getItem: (key) => window.localStorage.getItem(key) };
const data = load(storage);
let saveError = false;
let selectedDay = dateKey();
let calendarDay = selectedDay;
let deckId = null;
let review = null;
let game = null;
let zen = false;
let focusTaskId = data.timer?.taskId || "";
let focusDraft = String(data.minutes);
let noticeTimer;
const screens = {
  today: ["Сегодня", "sun"],
  plan: ["Планы", "calendar"],
  focus: ["Фокус", "timer"],
  cards: ["Карточки", "cards"],
  game: ["Игра", "game"],
  progress: ["Прогресс", "chart"],
};
const wallpaperNames = { forest: "Тихий лес", dusk: "Сумерки", ocean: "Океан" };
const longDate = new Intl.DateTimeFormat("ru", {
  day: "numeric",
  month: "long",
});
const shortDate = new Intl.DateTimeFormat("ru", {
  day: "numeric",
  month: "short",
});
const dayLabel = new Intl.DateTimeFormat("ru", { weekday: "short" });
const fullDate = new Intl.DateTimeFormat("ru", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const asDate = (key) => new Date(key + "T12:00:00");
const format = (key, fmt = longDate) => fmt.format(asDate(key));
const plural = (n, one, few, many) =>
  n % 100 >= 11 && n % 100 <= 14
    ? many
    : n % 10 === 1
      ? one
      : n % 10 >= 2 && n % 10 <= 4
        ? few
        : many;
const uid = () => crypto.randomUUID();
const page = () => {
  const key = location.hash.slice(1);
  return Object.hasOwn(screens, key) ? key : "today";
};
function go(key) {
  if (page() === key) render();
  else location.hash = key;
}
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    saveError = false;
  } catch {
    saveError = true;
  }
}
function updateAndRender() {
  persist();
  render();
}
function notify(text) {
  const live = document.querySelector("#studio-live");
  if (!live) return;
  live.textContent = text;
  live.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    live.hidden = true;
  }, 4000);
}
function tasksOn(day) {
  return data.tasks
    .filter((task) => task.date === day)
    .sort((a, b) => (a.time || "24:00").localeCompare(b.time || "24:00"));
}
const action = (name, label, { glyph = "", variant = "", value = "" } = {}) =>
  `<button type="button" class="s-btn ${variant}" data-action="${name}"${value ? ` data-value="${e(value)}"` : ""}>${glyph ? icon(glyph) : ""}${label}</button>`;
const link = (key, label, variant = "") =>
  `<a class="s-btn ${variant}" href="#${key}">${label}${icon("arrow")}</a>`;
const eyebrow = (label) => `<span class="s-eyebrow">${label}</span>`;
const heading = (tag, title, text, extra = "") =>
  `<div class="s-heading"><div>${eyebrow(tag)}<h1 id="studio-heading" tabindex="-1">${title}</h1><p>${text}</p></div>${extra}</div>`;

function flame(compact = false) {
  const { count, today } = streak(data.sessions);
  return `<div class="s-flame ${compact ? "compact" : ""} ${today ? "is-lit" : ""}"><span class="s-flame-icon">${icon("flame")}</span><div><strong>${count} ${plural(count, "день", "дня", "дней")} подряд</strong><small>${today ? "Сегодня огонёк горит" : "Заверши фокус-сессию"}</small></div></div>`;
}
function shell(content) {
  const current = page();
  return `<a class="s-skip" href="#studio-heading">К содержанию</a><div class="s-shell ${zen && current === "focus" ? "s-zen" : ""}">
    <aside class="s-sidebar"><a href="#today" class="s-brand"><span class="s-mark">${icon("brand")}</span><span>10Qadam<small>STUDY STUDIO</small></span></a>
    <div class="s-nav-label">РАБОЧЕЕ ПРОСТРАНСТВО</div><nav aria-label="Разделы студии">${Object.entries(
      screens,
    )
      .map(
        ([key, [name, glyph]]) =>
          `<a href="#${key}"${current === key ? ' aria-current="page"' : ""}>${icon(glyph)}<span>${name}</span></a>`,
      )
      .join("")}</nav>
    <div class="s-sidebar-end">${flame(true)}<a href="/" class="s-back">${icon("back")} Главная 10Qadam</a></div></aside>
    <div class="s-workspace"><header class="s-top"><span><a href="/" class="s-top-brand">10Qadam · </a>Студия <b>/</b> ${screens[current][0]}</span>
    <div>${data.timer && current !== "focus" ? '<a class="s-mini-timer" href="#focus" data-clock aria-label="Открыть таймер">—</a>' : ""}<span class="s-top-date">${format(dateKey(), fullDate)}</span></div></header>
    <main class="s-content">${content}</main><footer class="s-foot">${saveError ? "Не удалось сохранить изменения в браузере. Не закрывай вкладку, если данные нужны." : "Планы, карточки и прогресс сохранены в этом браузере."}<a href="/arena">Английская арена ${icon("arrow")}</a></footer></div>
    <div id="studio-live" role="status" hidden></div><dialog id="studio-dialog"></dialog></div>`;
}

function taskList(tasks, empty = "На этот день пока ничего не запланировано.") {
  if (!tasks.length)
    return `<div class="s-empty">${icon("calendar")}<p>${empty}</p></div>`;
  return `<ul class="s-tasks">${tasks
    .map(
      (task) => `<li class="${task.done ? "is-done" : ""}">
    <button class="s-task-check" data-action="toggle-task" data-value="${e(task.id)}" aria-label="${task.done ? "Снять отметку" : "Отметить выполненной"}: ${e(task.title)}" aria-pressed="${task.done}">${icon("check")}</button>
    <button class="s-task-title" data-action="edit-task" data-value="${e(task.id)}"><strong>${e(task.title)}</strong>${task.notes ? `<small>${e(task.notes)}</small>` : ""}</button>
    <span class="s-task-time">${task.time || "Без времени"}</span>
    ${!task.done ? `<button class="s-icon-btn" data-action="task-focus" data-value="${e(task.id)}" aria-label="Фокус: ${e(task.title)}">${icon("timer")}</button>` : ""}</li>`,
    )
    .join("")}</ul>`;
}

function todayPage() {
  const today = dateKey();
  const tasks = tasksOn(today);
  const sessions = data.sessions.filter((item) => item.day === today);
  return `<div class="s-intro">${eyebrow("ЛИЧНОЕ ПРОСТРАНСТВО")}<h1 id="studio-heading" tabindex="-1">Твой день.</h1><p>Одна задача, один отрезок времени. Остальное подождёт.</p></div>
  <section class="s-today-hero"><div>${eyebrow("01 / СОБЕРИСЬ С МЫСЛЯМИ")}<h2>Время для<br />одного дела.</h2><p>Убери лишнее, выбери задачу и дай себе 25 спокойных минут.</p>${link("focus", "Открыть таймер", "primary")}</div>${todayArt()}</section>
  <div class="s-today-grid"><section class="s-panel"><div class="s-panel-head"><div>${eyebrow("РАСПИСАНИЕ")}<h2>Планы на сегодня</h2></div>
  ${action("new-task", "Добавить", { glyph: "plus", value: today })}</div>${taskList(tasks, "Начни с одной задачи на сегодня.")}
  <div class="s-panel-tail">${link("plan", "Вся неделя", "quiet")}</div></section>
  <section class="s-panel s-habit"><div class="s-panel-head"><div>${eyebrow("ПРИВЫЧКА")}<h2>Твой огонёк</h2></div></div>${flame()}
  <p class="s-habit-copy">Одна законченная фокус-сессия в день поддерживает серию.</p><div class="s-habit-stat"><strong>${sessions.reduce((sum, item) => sum + item.minutes, 0)}</strong><span>мин в фокусе сегодня</span></div>
  ${link("progress", "Мой прогресс", "quiet")}</section></div>
  <section class="s-learn-strip"><span class="s-learn-icon">${icon("cards")}</span><div><h2>Закрепи материал</h2><p>Повтори карточки или попробуй те же вопросы в игре.</p></div><div>${link("cards", "Карточки")}${link("game", "Играть")}</div></section>`;
}
function planPage() {
  const week = weekOf(calendarDay);
  return `${heading("02 / РАСПИСАНИЕ", "Планы на неделю.", "Разложи дела по дням и выбери, на чём сфокусироваться.", action("new-task", "Новая задача", { glyph: "plus", variant: "primary", value: selectedDay }))}
    <section class="s-panel s-calendar"><div class="s-calendar-top"><div class="s-calendar-nav">
    ${action("week-back", '<span class="s-sr">Предыдущая неделя</span>', { glyph: "left" })}${action("week-next", '<span class="s-sr">Следующая неделя</span>', { glyph: "right" })}${action("week-today", "Сегодня")}</div>
    <strong>${format(week[0], shortDate)} — ${format(week[6])} ${asDate(week[6]).getFullYear()}</strong></div>
    <div class="s-week">${week
      .map((day) => {
        const tasks = tasksOn(day);
        return `<div class="s-day ${day === selectedDay ? "selected" : ""}"><button class="s-day-btn" data-action="pick-day" data-value="${day}" aria-pressed="${day === selectedDay}" aria-label="${format(day, fullDate)}"><span>${format(day, dayLabel)}</span><strong>${asDate(day).getDate()}</strong><small>${tasks.length ? tasks.length : "·"}</small></button>
        <div class="s-day-preview">${tasks
          .slice(0, 4)
          .map(
            (task) =>
              `<button class="${task.done ? "is-done" : ""}" data-action="edit-task" data-value="${e(task.id)}">${task.time ? `<small>${task.time}</small>` : ""}${e(task.title)}</button>`,
          )
          .join(
            "",
          )}${tasks.length > 4 ? `<span>+ ${tasks.length - 4}</span>` : ""}</div></div>`;
      })
      .join("")}</div></section>
    <section class="s-panel"><div class="s-panel-head"><div>${eyebrow("ВЫБРАННЫЙ ДЕНЬ")}<h2>${format(selectedDay, fullDate)}</h2></div>${action("new-task", "Добавить", { glyph: "plus", value: selectedDay })}</div>${taskList(tasksOn(selectedDay))}</section>`;
}

function clockText(milliseconds) {
  const seconds = Math.ceil(milliseconds / 1000);
  return [Math.floor(seconds / 60), seconds % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}
function focusPage() {
  const timer = data.timer;
  const task = data.tasks.find(
    (item) => item.id === (timer ? timer.taskId : focusTaskId),
  );
  const running = timer && timer.end !== null;
  return `${heading("03 / ФОКУС", "Время без отвлечений.", "Выбери длину сессии, фон и одно дело.")}
    <div class="s-focus-grid"><section class="s-clock wallpaper-${data.wallpaper}"><div class="s-clock-art" aria-hidden="true"></div>
    <button class="s-zen-toggle" data-action="zen" aria-label="${zen ? "Выйти из режима без отвлечений" : "Режим без отвлечений"}" title="${zen ? "Выйти из режима без отвлечений" : "Режим без отвлечений"}">${icon(zen ? "close" : "expand")}</button>
    <div class="s-clock-content">${eyebrow("ГЛУБОКИЙ ФОКУС")}<h2>${e(task?.title || "Одна задача за раз")}</h2><strong class="s-clock-time" data-clock role="timer">${clockText(timer ? remaining(timer) : data.minutes * 60_000)}</strong>
    <div class="s-clock-actions">${action("timer-toggle", running ? "Пауза" : timer ? "Продолжить" : "Начать фокус", { glyph: running ? "pause" : "play", variant: "primary" })}
    ${timer ? action("timer-reset", "Сбросить", { glyph: "reset" }) : ""}</div></div></section>
    <aside class="s-panel s-focus-settings"><div>${eyebrow("ПОД СЕБЯ")}<h2>Настройки</h2></div>
    <form id="focus-form"><label for="focus-minutes">Длительность, мин</label><div class="s-pills">${[
      15, 25, 50,
    ]
      .map(
        (n) =>
          `<button type="button" data-action="minutes" data-value="${n}" aria-pressed="${data.minutes === n}" ${timer ? "disabled" : ""}>${n} мин</button>`,
      )
      .join("")}</div>
    <input id="focus-minutes" type="number" name="minutes" min="1" max="120" step="1" value="${e(focusDraft)}" ${timer ? "disabled" : ""} required />
    <label for="focus-task">Задача <span>(необязательно)</span></label><select id="focus-task" name="task" ${timer ? "disabled" : ""}><option value="">Без привязки</option>${data.tasks
      .filter((item) => !item.done)
      .map(
        (item) =>
          `<option value="${e(item.id)}"${focusTaskId === item.id ? " selected" : ""}>${e(item.title)} · ${format(item.date, shortDate)}</option>`,
      )
      .join("")}</select></form>
    <div class="s-wallpapers"><strong>Обои таймера</strong><div>${WALLPAPERS.map((key) => `<button type="button" data-action="wallpaper" data-value="${key}" aria-pressed="${data.wallpaper === key}"><span class="wallpaper-${key}"></span>${wallpaperNames[key]}</button>`).join("")}</div></div>
    ${flame(true)}</aside></div>`;
}

function cardsPage() {
  const deck = data.decks.find((item) => item.id === deckId);
  if (review) {
    const card = review.cards[review.index];
    return `${heading("04 / КАРТОЧКИ", e(review.name), "Сначала вспомни ответ, потом переверни карточку.", action("stop-review", "К набору", { glyph: "back" }))}
    <section class="s-panel s-review">${
      card
        ? `
    <div class="s-review-meta"><span>Карточка ${review.index + 1} / ${review.cards.length}</span><span>${review.known} вспомнено</span></div>
    <button class="s-flashcard ${review.back ? "is-back" : ""}" data-action="flip-card"><span>${review.back ? "ОТВЕТ" : "ВОПРОС"}</span><strong>${e(review.back ? card.back : card.front)}</strong><small>Нажми, чтобы перевернуть</small></button>
    <div class="s-row">${action("review-next", "Ещё повторю", { value: "again" })}${action("review-next", "Вспомнил", { glyph: "check", variant: "primary", value: "known" })}</div>`
        : `<div class="s-empty"><h2>Повторение закончено</h2><p>Вспомнено ${review.known} из ${review.cards.length}.</p></div><div class="s-row">${review.missed.length ? action("review-missed", "Повторить сложные", { glyph: "reset", variant: "primary" }) : action("start-review", "Ещё раз", { glyph: "reset" })}${action("start-game", "Сыграть", { glyph: "game", value: deck?.id })}</div>`
    }</section>`;
  }
  if (deck)
    return `${heading("04 / КАРТОЧКИ", e(deck.name), "Термины, слова, даты и формулы — в одном наборе.", action("back-decks", "Все наборы", { glyph: "back" }))}
    <section class="s-panel"><div class="s-panel-head"><div><h2>${deck.cards.length} ${plural(deck.cards.length, "карточка", "карточки", "карточек")}</h2></div>${action("new-card", "Добавить карточку", { glyph: "plus", variant: "primary" })}</div>
    ${
      deck.cards.length
        ? `<div class="s-row s-deck-actions">${action("start-review", "Повторять", { glyph: "cards" })}${action("start-game", "Играть с этим набором", { glyph: "game", value: deck.id })}${action("edit-deck", "Название", { glyph: "edit" })}</div>
    <ul class="s-card-list">${deck.cards.map((card) => `<li><button data-action="edit-card" data-value="${e(card.id)}"><strong>${e(card.front)}</strong><span>${e(card.back)}</span>${icon("edit")}</button></li>`).join("")}</ul>`
        : `<div class="s-empty"><p>Добавь вопрос и ответ, чтобы начать повторение.</p>${action("edit-deck", "Изменить набор", { glyph: "edit" })}</div>`
    }</section>`;
  return `${heading("04 / КАРТОЧКИ", "Материал, который остаётся.", "Создай набор, переворачивай карточки и тренируй память.", action("new-deck", "Новый набор", { glyph: "plus", variant: "primary" }))}
    <div class="s-decks">${data.decks.map((item) => `<button class="s-deck" data-action="open-deck" data-value="${e(item.id)}"><span class="s-deck-icon">${icon("cards")}</span><strong>${e(item.name)}</strong><span>${item.cards.length} ${plural(item.cards.length, "карточка", "карточки", "карточек")}</span>${icon("arrow")}</button>`).join("")}</div>
    ${!data.decks.length ? '<section class="s-panel s-empty"><p>Наборов пока нет. Создай первый, чтобы добавить карточки.</p></section>' : ""}`;
}

function gamePage() {
  const intro = heading(
    "05 / ИГРА",
    "Лапы на старт.",
    "Веди собаку по дорожке с верным ответом. Вопросы — из твоих карточек.",
  );
  if (!game)
    return `${intro}<div class="s-game-intro"><div>${eyebrow("ТРЕНИРОВКА ПАМЯТИ")}<h2>Короткий забег</h2><p>До десяти вопросов. Выбирай ответ касанием или клавишами 1–3. Можно подумать: таймера здесь нет.</p>
    ${
      data.decks.some((deck) => canPlay(deck.cards))
        ? `<form id="game-form"><label for="game-deck">Набор карточек</label><select name="deck" id="game-deck" required>${data.decks
            .filter((deck) => canPlay(deck.cards))
            .map(
              (deck) =>
                `<option value="${e(deck.id)}"${deck.id === deckId ? " selected" : ""}>${e(deck.name)}</option>`,
            )
            .join("")}</select>
    <button class="s-btn primary" type="submit">${icon("play")} Начать забег</button><p class="s-form-error" role="alert"></p></form>`
        : `<p>Добавь в один набор хотя бы две карточки с разными ответами.</p>${link("cards", "Открыть карточки", "primary")}`
    }</div><div class="s-game-art">${dog()}</div></div>`;
  const item = game.questions[game.index];
  if (!item)
    return `${intro}<section class="s-game-intro"><div>${eyebrow("ФИНИШ")}<h2>${game.score} из ${game.questions.length} верно</h2><p>Повтори набор и попробуй улучшить результат.</p><div class="s-row">${action("start-game", "Ещё забег", { glyph: "reset", variant: "primary", value: game.deckId })}${action("leave-game", "К наборам")}</div></div><div class="s-game-art">${dog()}</div></section>`;
  const feedback =
    game.answer === null
      ? ""
      : game.answer === item.correct
        ? "Верно!"
        : `Правильный ответ: ${e(item.choices[item.correct])}`;
  const lane = (index) => ((index + 0.5) / item.choices.length) * 100 + "%";
  return `${intro}<section class="s-panel s-game"><div class="s-panel-head"><div>${eyebrow("ВОПРОС " + (game.index + 1) + " / " + game.questions.length)}<h2>${e(item.front)}</h2></div><strong>${game.score} верно</strong></div>
    <div class="s-track" style="--lanes:${item.choices.length};--lane-from:${lane(game.from)};--lane-to:${lane(game.lane)}"><div class="s-racer ${game.answer !== null ? "running" : ""}">${dog(game.answer !== null)}</div>${item.choices
      .map(
        (choice, index) => `<div class="s-lane"><div class="s-lane-road"></div>
    <button type="button" data-action="game-answer" data-value="${index}" ${game.answer !== null ? "disabled" : ""} class="${game.answer !== null ? (index === item.correct ? "right" : index === game.answer ? "wrong" : "") : ""}"><small>${index + 1}</small><span>${e(choice)}</span></button></div>`,
      )
      .join("")}</div>
    <div class="s-game-result" role="status">${feedback}</div><div class="s-row">${action("leave-game", "Выйти", { glyph: "back" })}${game.answer !== null ? action("game-next", game.index + 1 === game.questions.length ? "К результату" : "Дальше", { glyph: "arrow", variant: "primary" }) : ""}</div></section>`;
}
function progressPage() {
  const today = dateKey();
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(today, i - 6));
  const totals = days.map((day) =>
    data.sessions
      .filter((entry) => entry.day === day)
      .reduce((sum, entry) => sum + entry.minutes, 0),
  );
  const max = Math.max(1, ...totals);
  return `${heading("06 / ПРОГРЕСС", "Держи огонёк.", "Один законченный отрезок фокуса — один день в серии.")}
    <div class="s-progress-grid"><section class="s-panel s-progress-flame">${eyebrow("ТЕКУЩАЯ СЕРИЯ")}${flame()}<p>Можно завершить сессию даже за одну минуту. Паузы не сбрасывают таймер.</p>${link("focus", "К фокус-таймеру", "primary")}</section>
    <section class="s-panel"><div class="s-panel-head"><div>${eyebrow("ПОСЛЕДНИЕ 7 ДНЕЙ")}<h2>Минуты в фокусе</h2></div><strong>${totals.reduce((a, b) => a + b, 0)} мин</strong></div>
    <div class="s-chart">${days.map((day, i) => `<div aria-label="${format(day, fullDate)}: ${totals[i]} мин"><span>${totals[i]}</span><div><i style="height:${totals[i] ? Math.max(7, (totals[i] / max) * 100) : 2}%"></i></div><small>${format(day, dayLabel)}</small></div>`).join("")}</div></section></div>`;
}
const renderers = {
  today: todayPage,
  plan: planPage,
  focus: focusPage,
  cards: cardsPage,
  game: gamePage,
  progress: progressPage,
};
function render() {
  app.innerHTML = shell(renderers[page()]());
  tickClock();
}
function tickClock() {
  const text = clockText(
    data.timer ? remaining(data.timer) : data.minutes * 60_000,
  );
  for (const element of app.querySelectorAll("[data-clock]")) {
    if (element.textContent !== text) element.textContent = text;
  }
}
function tick() {
  const finished = finishTimer(data);
  if (finished) {
    persist();
    const dialog = app.querySelector("dialog[open]");
    if (dialog) {
      dialog.addEventListener("close", () => render(), { once: true });
      app.querySelector(".s-mini-timer")?.remove();
    } else render();
    notify("Фокус-сессия завершена. Огонёк засчитан!");
  } else tickClock();
  return Boolean(finished);
}
window.addEventListener("hashchange", () => {
  if (page() !== "focus") zen = false;
  if (page() !== "cards") review = null;
  render();
  window.scrollTo(0, 0);
  document.querySelector("#studio-heading")?.focus({ preventScroll: true });
});

function openEditor(kind, record, date = selectedDay) {
  const isTask = kind === "task";
  const isDeck = kind === "deck";
  const name = isTask ? "задачу" : isDeck ? "набор" : "карточку";
  const dialog = app.querySelector("#studio-dialog");
  const heading = record ? "Редактировать " + name : "Добавить " + name;
  const fields = isTask
    ? `
    <label>Название<input name="title" maxlength="100" required value="${e(record?.title)}" placeholder="Например, повторить формулы" /></label>
    <div class="s-field-row"><label>Дата<input name="date" type="date" min="1900-01-01" max="2200-12-31" required value="${e(record?.date || date)}" /></label>
    <label>Время <span>(необязательно)</span><input name="time" type="time" value="${e(record?.time)}" /></label></div>
    <label>Заметки <span>(необязательно)</span><textarea name="notes" maxlength="400" rows="3">${e(record?.notes)}</textarea></label>`
    : isDeck
      ? `<label>Название набора<input name="name" maxlength="70" required value="${e(record?.name)}" placeholder="Например, физика" /></label>`
      : `<label>Вопрос или термин<textarea name="front" maxlength="220" rows="2" required placeholder="Например, второй закон Ньютона">${e(record?.front)}</textarea></label>
    <label>Ответ<textarea name="back" maxlength="300" rows="3" required placeholder="Например, F = ma">${e(record?.back)}</textarea></label>`;
  dialog.setAttribute("aria-labelledby", "editor-title");
  dialog.innerHTML = `<form id="editor-form" data-kind="${kind}" data-id="${e(record?.id)}">
    <div class="s-panel-head"><h2 id="editor-title">${heading}</h2><button type="button" class="s-icon-btn" data-action="close-editor" aria-label="Закрыть">${icon("close")}</button></div>${fields}
    <p class="s-form-error" role="alert"></p><div class="s-row s-editor-actions">${record ? action("ask-delete", "Удалить", { variant: "danger" }) : ""}
    <button type="submit" class="s-btn primary">${icon("check")} Сохранить</button></div></form>`;
  dialog.showModal();
}
function askDelete() {
  const dialog = app.querySelector("dialog");
  const { kind, id } = dialog.querySelector("form").dataset;
  const question =
    kind === "deck"
      ? "Удалить набор и все его карточки?"
      : kind === "task"
        ? "Удалить задачу?"
        : "Удалить карточку?";
  dialog.innerHTML = `<div class="s-panel-head"><h2 id="editor-title">${question}</h2></div><p>Это действие нельзя отменить.</p>
    <div class="s-row s-editor-actions">${action("close-editor", "Отмена")}${action("delete-record", "Удалить", { variant: "danger", value: kind + ":" + id })}</div>`;
  dialog.querySelector('[data-action="close-editor"]').focus();
}
function activeDeck() {
  return data.decks.find((deck) => deck.id === deckId);
}
function startGame(id) {
  const deck = data.decks.find((item) => item.id === id);
  const questions = deck ? gameQuestions(deck.cards) : [];
  if (!questions.length) {
    notify("Для игры нужны хотя бы две карточки с разными ответами.");
    return;
  }
  deckId = id;
  game = {
    deckId: id,
    questions,
    index: 0,
    answer: null,
    lane: 0,
    from: 0,
    score: 0,
  };
  go("game");
}
function answerGame(index) {
  const item = game?.questions[game.index];
  if (
    !item ||
    game.answer !== null ||
    !Number.isInteger(index) ||
    !item.choices[index]
  )
    return;
  game.answer = index;
  game.from = game.lane;
  game.lane = index;
  if (index === item.correct) game.score++;
  render();
  app
    .querySelector('[data-action="game-next"]')
    ?.focus({ preventScroll: true });
}

app.addEventListener("click", (event) => {
  if (event.target.closest(".s-skip")) {
    event.preventDefault();
    app.querySelector("#studio-heading")?.focus();
    return;
  }
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const { action: type, value } = button.dataset;
  const deck = activeDeck();
  const task = data.tasks.find((item) => item.id === value);
  switch (type) {
    case "new-task":
      if (data.tasks.length >= MAX_TASKS)
        return notify("Достигнут предел задач. Удали ненужные.");
      openEditor("task", null, value);
      break;
    case "edit-task":
      if (task) openEditor("task", task);
      break;
    case "toggle-task":
      if (task) {
        task.done = !task.done;
        updateAndRender();
      }
      break;
    case "task-focus":
      if (!task || task.done) break;
      if (data.timer) {
        go("focus");
        if (page() === "focus")
          notify("Сначала закончи или сбрось текущую сессию.");
      } else {
        focusTaskId = task.id;
        go("focus");
      }
      break;
    case "week-back":
    case "week-next": {
      const offset = type === "week-back" ? -7 : 7;
      calendarDay = shiftDay(calendarDay, offset);
      selectedDay = shiftDay(selectedDay, offset);
      render();
      break;
    }
    case "week-today":
      calendarDay = selectedDay = dateKey();
      render();
      break;
    case "pick-day":
      selectedDay = value;
      render();
      app.querySelector('.s-day-btn[aria-pressed="true"]')?.focus();
      break;
    case "minutes":
      if (!data.timer && duration(value)) {
        data.minutes = duration(value);
        focusDraft = String(data.minutes);
        updateAndRender();
      }
      break;
    case "wallpaper":
      if (WALLPAPERS.includes(value)) {
        data.wallpaper = value;
        updateAndRender();
      }
      break;
    case "timer-toggle": {
      if (tick()) break;
      if (!data.timer) {
        const form = app.querySelector("#focus-form");
        if (!duration(focusDraft)) {
          if (zen) {
            zen = false;
            render();
          }
          app.querySelector("#focus-form").reportValidity();
          return;
        }
        const minutes = duration(new FormData(form).get("minutes"));
        if (!minutes) return notify("Укажи длительность от 1 до 120 минут.");
        data.minutes = minutes;
        focusDraft = String(minutes);
        data.timer = newTimer(
          minutes,
          data.tasks.some((item) => item.id === focusTaskId && !item.done)
            ? focusTaskId
            : null,
        );
      }
      data.timer = toggleTimer(data.timer);
      updateAndRender();
      app
        .querySelector('[data-action="timer-toggle"]')
        ?.focus({ preventScroll: true });
      break;
    }
    case "timer-reset":
      if (
        data.timer &&
        window.confirm("Сбросить таймер? Эта сессия не засчитается.")
      ) {
        if (tick()) break;
        data.timer = null;
        updateAndRender();
      }
      break;
    case "zen":
      zen = !zen;
      render();
      app.querySelector(".s-zen-toggle")?.focus();
      break;
    case "new-deck":
      if (data.decks.length >= MAX_DECKS)
        return notify("Достигнут предел наборов.");
      openEditor("deck");
      break;
    case "open-deck":
      deckId = value;
      review = null;
      render();
      break;
    case "back-decks":
      deckId = review = null;
      render();
      break;
    case "edit-deck":
      if (deck) openEditor("deck", deck);
      break;
    case "new-card":
      if (deck?.cards.length >= MAX_CARDS)
        return notify("В одном наборе может быть до 100 карточек.");
      if (deck) openEditor("card");
      break;
    case "edit-card": {
      const card = deck?.cards.find((item) => item.id === value);
      if (card) openEditor("card", card);
      break;
    }
    case "close-editor":
      app.querySelector("dialog")?.close();
      break;
    case "ask-delete":
      askDelete();
      break;
    case "delete-record": {
      const [kind, id] = value.split(":");
      if (kind === "task")
        data.tasks = data.tasks.filter((item) => item.id !== id);
      if (kind === "deck") {
        data.decks = data.decks.filter((item) => item.id !== id);
        deckId = review = null;
      }
      if (kind === "card" && deck)
        deck.cards = deck.cards.filter((item) => item.id !== id);
      updateAndRender();
      break;
    }
    case "review-missed":
      if (review?.missed.length) {
        review = {
          ...review,
          cards: shuffle(review.missed),
          missed: [],
          index: 0,
          back: false,
          known: 0,
        };
        render();
        app.querySelector(".s-flashcard")?.focus();
      }
      break;
    case "start-review":
      if (deck?.cards.length) {
        review = {
          name: deck.name,
          cards: shuffle(deck.cards),
          index: 0,
          back: false,
          known: 0,
          missed: [],
        };
        render();
        app.querySelector(".s-flashcard")?.focus();
      }
      break;
    case "stop-review":
      review = null;
      render();
      break;
    case "flip-card":
      if (review) {
        review.back = !review.back;
        render();
        app.querySelector(".s-flashcard")?.focus({ preventScroll: true });
      }
      break;
    case "review-next":
      if (review) {
        if (value !== "known" && review.cards[review.index])
          review.missed.push(review.cards[review.index]);
        review.index++;
        review.back = false;
        if (value === "known") review.known++;
        render();
        app
          .querySelector(
            ".s-flashcard, .s-review [data-action='start-review'], .s-review [data-action='review-missed']",
          )
          ?.focus({ preventScroll: true });
      }
      break;
    case "start-game":
      startGame(value);
      break;
    case "leave-game":
      game = null;
      render();
      break;
    case "game-answer":
      answerGame(Number(value));
      break;
    case "game-next":
      if (game?.answer !== null && game?.questions[game.index]) {
        game.index++;
        game.answer = null;
        render();
        app
          .querySelector(".s-game h2, .s-game-intro h2")
          ?.scrollIntoView({ block: "nearest" });
      }
      break;
  }
});

app.addEventListener("input", (event) => {
  if (event.target.id === "focus-minutes") focusDraft = event.target.value;
});
app.addEventListener("change", (event) => {
  if (event.target.id === "focus-task") {
    focusTaskId = event.target.value;
    app.querySelector(".s-clock h2").textContent =
      data.tasks.find((item) => item.id === focusTaskId)?.title ||
      "Одна задача за раз";
  }
  if (
    event.target.id === "focus-minutes" &&
    !data.timer &&
    duration(focusDraft)
  ) {
    data.minutes = duration(focusDraft);
    persist();
    for (const button of app.querySelectorAll('[data-action="minutes"]'))
      button.setAttribute(
        "aria-pressed",
        String(Number(button.dataset.value) === data.minutes),
      );
    tickClock();
  }
});
app.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;
  const fields = new FormData(form);
  if (form.id === "focus-form") {
    app.querySelector('[data-action="timer-toggle"]')?.click();
    return;
  }
  if (form.id === "game-form") {
    startGame(fields.get("deck"));
    return;
  }
  if (form.id !== "editor-form") return;
  const text = (name) => String(fields.get(name) || "").trim();
  const { kind, id } = form.dataset;
  const invalid = (message) => {
    form.querySelector(".s-form-error").textContent = message;
  };
  if (kind === "task") {
    if (!text("title")) return invalid("Введи название задачи.");
    const old = data.tasks.find((task) => task.id === id);
    if (!old && data.tasks.length >= MAX_TASKS)
      return invalid("Достигнут предел задач.");
    const task = {
      id: id || uid(),
      title: text("title"),
      date: text("date"),
      time: text("time"),
      notes: text("notes"),
      done: old?.done || false,
    };
    if (old) Object.assign(old, task);
    else data.tasks.push(task);
    selectedDay = calendarDay = task.date;
    if (page() === "today" && task.date !== dateKey()) {
      persist();
      go("plan");
      return;
    }
  } else if (kind === "deck") {
    if (!text("name")) return invalid("Введи название набора.");
    const old = data.decks.find((deck) => deck.id === id);
    if (!old && data.decks.length >= MAX_DECKS)
      return invalid("Достигнут предел наборов.");
    if (old) old.name = text("name");
    else
      data.decks.push({ id: (deckId = uid()), name: text("name"), cards: [] });
  } else if (kind === "card") {
    const deck = activeDeck();
    if (!deck) return invalid("Набор больше не существует.");
    if (!text("front") || !text("back"))
      return invalid("Заполни вопрос и ответ.");
    const old = deck.cards.find((card) => card.id === id);
    if (!old && deck.cards.length >= MAX_CARDS)
      return invalid("Достигнут предел карточек.");
    const card = { id: id || uid(), front: text("front"), back: text("back") };
    if (old) Object.assign(old, card);
    else deck.cards.push(card);
  }
  updateAndRender();
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && zen) {
    zen = false;
    render();
    return;
  }
  if (
    page() !== "game" ||
    !game ||
    event.repeat ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.target.closest?.("input, select, textarea, [contenteditable]") ||
    !/^[123]$/.test(event.key)
  )
    return;
  answerGame(Number(event.key) - 1);
});
window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY || app.querySelector("dialog[open]")) return;
  Object.assign(data, load(storage));
  focusDraft = String(data.minutes);
  focusTaskId = data.timer?.taskId || "";
  render();
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) tick();
});
render();
tick();
setInterval(tick, 250);
