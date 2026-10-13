import "./style.css";
import {
  WORDS,
  makeDeck,
  scoreAnswer,
  loadPractice,
  savePractice,
  comparePlayers,
  playerPlace,
  ROUND_COUNT,
  ROUND_SECONDS,
} from "./game.js";
import * as online from "./online.js";
import {
  t,
  localize,
  loadLanguage,
  saveLanguage,
  LOCALES,
  slogan,
} from "./i18n.js";
import { wordMeaning, matchesWord } from "./vocabulary.js";
import { speakWord, stopSpeech } from "./speech.js";

const app = document.querySelector("#app");
const svg = (path, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
const icons = {
  arena: svg(
    '<path d="m4 4 16 16M20 4 4 20M4 4v5m0-5h5m11 0v5m0-5h-5M4 20v-5m0 5h5m11 0v-5m0 5h-5"/>',
  ),
  chart: svg('<path d="M5 20V12m7 8V5m7 15V9M3 20h18"/>'),
  book: svg(
    '<path d="M12 5v15M12 5C9 2 4 3 3 4v15c4-2 7-1 9 1 2-2 5-3 9-1V4c-1-1-6-2-9 1Z"/>',
  ),
  user: svg(
    '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  ),
  arrow: svg('<path d="M4 12h15m-6-6 6 6-6 6"/>'),
  chevron: svg('<path d="m9 5 7 7-7 7"/>'),
  bolt: svg('<path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z"/>'),
  sound: svg(
    '<path d="m11 4-6 5H2v6h3l6 5V4ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  ),
  check: svg('<path d="m5 12 4 4L19 6"/>'),
  close: svg('<path d="m6 6 12 12M18 6 6 18"/>'),
  trophy: svg(
    '<path d="M8 3h8v6a4 4 0 0 1-8 0V3ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 1v6m-5 2h10m-8-2h6"/>',
  ),
  time: svg(
    '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6m-3 0v3"/>',
  ),
  moon: svg('<path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z"/>'),
  exit: svg('<path d="M9 4H4v16h5m5-13 5 5-5 5m-6-5h11"/>'),
};
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (x) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        x
      ],
  );
const state = {
  page: "arena",
  language: loadLanguage(),
  level: "A1",
  mode: "duel",
  user: null,
  profile: null,
  match: null,
  leaderboard: [],
  leaderLoading: false,
  history: loadPractice(),
};
let gameTimer, pollTimer, queueTimer, toastTimer;
let queueGeneration = 0;
let queueActive = false;
let leaderRequest = 0;
let dialog = null;
const modes = {
  duel: {
    name: "Дуэль",
    caption: "Один на один",
    players: "02",
    description:
      "Ты, соперник и десять слов. Пусть клавиатура скажет всё за тебя.",
    label: "1 VS 1",
    color: "coral",
  },
  four: {
    name: "Баттл",
    caption: "Каждый за себя",
    players: "04",
    description:
      "Четыре игрока. Одна арена. Забери первое место в общем зачёте.",
    label: "FREE FOR ALL",
    color: "lime",
  },
  solo: {
    name: "Соло",
    caption: "В своём темпе",
    players: "01",
    description:
      "Разомни пальцы и прокачай spelling. Здесь соперник — твой прошлый результат.",
    label: "PRACTICE",
    color: "cream",
  },
};
function toast(message) {
  document.querySelector(".toast")?.remove();
  const element = document.createElement("div");
  element.className = "toast";
  element.role = "status";
  element.textContent = t(message, state.language);
  document.body.append(element);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.remove(), 4500);
}
function avatar(name = "?", cls = "") {
  return `<span class="avatar ${cls}" data-no-i18n>${escape(name.slice(0, 2).toUpperCase())}</span>`;
}
function navItem(page, label, icon) {
  return `<button class="nav-item ${state.page === page ? "active" : ""}" data-page="${page}" ${state.page === page ? 'aria-current="page"' : ""}>${icons[icon]}<span>${label}</span>${state.page === page ? '<span class="nav-dot"></span>' : ""}</button>`;
}
function shell(content) {
  return `<aside class="sidebar"><a class="brand" href="#" aria-label="10Qadam, главная"><span class="brand-mark" role="img" aria-label="Логотип 10Qadam"></span><span>10Qadam<span class="brand-sub">THE SPELLING ARENA</span></span></a><div class="nav-label">PLAYGROUND</div><nav aria-label="Главная навигация">${navItem("arena", "Арена", "arena")}${navItem("leaders", "Рейтинг", "chart")}${navItem("words", "Словарь", "book")}${navItem("profile", "Мой профиль", "user")}</nav><div class="sidebar-bottom"><div class="mini-note"><p>Маленькие шаги.<br><strong>Большой словарный запас.</strong></p></div><span class="side-version">MADE FOR YOUR NEXT LEVEL ↗</span></div></aside><div class="workspace"><header class="topbar"><div class="breadcrumb">PLAYGROUND <span>/</span> ${escape({ arena: "Арена", leaders: "Рейтинг", words: "Словарь", profile: "Профиль", game: "Матч" }[state.page] || "Арена")}</div><div class="top-actions"><select id="language-select" aria-label="Language" title="Language">${[
    ["en", "EN"],
    ["kk", "KZ"],
    ["ru", "RU"],
  ]
    .map(
      ([code, label]) =>
        `<option value="${code}" ${state.language === code ? "selected" : ""}>${label}</option>`,
    )
    .join(
      "",
    )}</select><span class="service-status"><i class="${online.isOnlineConfigured ? "connected" : ""}"></i>${online.isOnlineConfigured ? "Онлайн доступен" : "Тренировка доступна"}</span>${state.user ? `<button class="profile-button" data-page="profile">${avatar(state.profile?.username || t("Игрок", state.language))}<span data-no-i18n>${escape(state.profile?.username || t("Игрок", state.language))}</span>${icons.chevron}</button>` : `<button class="login-button" data-action="auth">Войти ${icons.arrow}</button>`}</div></header><main id="main-content">${content}</main><footer><a href="#" class="footer-brand">10QADAM <span>↗</span> THE SPELLING ARENA</a><span>Слушай. Пиши. Становись лучше.</span><button data-action="rules">Как играть ${icons.arrow}</button></footer></div>`;
}
function render() {
  const pages = {
    arena: renderArena,
    leaders: renderLeaders,
    words: renderWords,
    profile: renderProfile,
    game: renderGame,
  };
  app.innerHTML = shell((pages[state.page] || renderArena)());
  localize(app, state.language);
  document.documentElement.lang = state.language;
  document.title = t("10Qadam — English spelling arena", state.language);
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute(
      "content",
      t(
        "Listen, spell and compete. English A1/A2 practice, duels and four-player battles.",
        state.language,
      ),
    );
  if (state.page === "game") bindAnswer();
}
function rating() {
  const p = state.profile;
  return p
    ? ((state.level === "A1" ? p.rating_a1 : p.rating_a2) ?? 1000)
    : null;
}
function renderArena() {
  const personal = state.history;
  return `<section class="page-intro"><div><div class="eyebrow"><span class="eyebrow-line"></span> <span data-no-i18n>10QADAM —</span></div><h1 data-no-i18n>${slogan(state.language)[0]}<br><span class="underlined">${slogan(state.language)[1]}</span></h1><p>Английский на слух. Баттлы на скорость.<br>Десять слов, чтобы стать чуть лучше.</p></div><div class="intro-stamp"><span>LISTEN</span><span class="stamp-cross">×</span><span>TYPE</span><span class="stamp-cross">×</span><span>WIN</span><i>↗</i></div></section>
  <section class="hero-arena" aria-label="Соревнование по spelling"><div class="hero-copy"><span class="pill">${icons.bolt} ТВОЯ СЛЕДУЮЩАЯ ПОБЕДА</span><h2>Включай звук.<br>Выключай сомнения.</h2><p>Слово прозвучало. Таймер пошёл.<br>Кто напишет правильно первым?</p><button class="button light" data-action="quick-play">Выйти на арену ${icons.arrow}</button><div class="hero-meta"><span>10 СЛОВ</span><i></i><span>12 СЕК / СЛОВО</span><i></i><span>A1 — A2</span></div></div><div class="hero-visual" aria-hidden="true"><div class="visual-grid"></div><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><span class="floating-label">EVERY LETTER COUNTS</span><div class="letter-tile tile-s">S<span>01</span></div><div class="letter-tile tile-p">P<span>02</span></div><div class="letter-tile tile-e">E<span>03</span></div><div class="letter-tile tile-l">L<span>04</span></div><div class="letter-tile tile-l2">L<span>05</span></div><div class="visual-score"><span class="score-check">${icons.check}</span><div>THAT'S CORRECT.<small>+100 accuracy &nbsp; +42 speed</small></div></div><div class="visual-corner">01:24 <span>● REC</span></div></div></section>
  <section class="mode-section"><div class="section-heading"><div><span class="eyebrow small">PICK YOUR BATTLE</span><h2>Как играем?</h2></div><div class="level-select" aria-label="Уровень английского"><span>Уровень слов</span><div role="group">${["A1", "A2"].map((l) => `<button data-level="${l}" class="${state.level === l ? "selected" : ""}" aria-pressed="${state.level === l}">${l}</button>`).join("")}</div></div></div><div class="mode-grid">${Object.entries(
    modes,
  )
    .map(
      ([key, m]) =>
        `<button class="mode-card ${m.color} ${state.mode === key ? "chosen" : ""}" data-mode="${key}" aria-pressed="${state.mode === key}"><div class="mode-card-top"><span class="mode-code">${m.label}</span><span class="selection-circle">${state.mode === key ? icons.check : ""}</span></div><div class="mode-illustration ${key}">${key === "duel" ? '<span class="mini-letter first">a</span><em>vs</em><span class="mini-letter second">b</span>' : key === "four" ? '<span class="mini-letter first">a</span><span class="mini-letter second">b</span><span class="mini-letter third">c</span><span class="mini-letter fourth">d</span>' : '<span class="solo-ring"></span><span class="mini-letter first">a</span>'}</div><div class="mode-title"><h3>${m.name}</h3><span>${m.players}<small>ИГРОКА</small></span></div><p>${m.description}</p><div class="mode-card-bottom">${m.caption} <span>${icons.arrow}</span></div></button>`,
    )
    .join(
      "",
    )}</div><div class="play-bar"><div><span class="play-ready">${icons.bolt}</span><p><strong>${modes[state.mode].name} · ${state.level}</strong><span>${state.mode === "solo" ? "Тренировка без регистрации" : online.isOnlineConfigured ? "Соперники с близким рейтингом" : "Проверь механику в демо с ботами"}</span></p></div><button class="button dark" data-action="play">${state.mode === "solo" ? "Начать тренировку" : online.isOnlineConfigured ? "Найти игру" : "Попробовать баттл"} ${icons.arrow}</button></div></section>
  <section class="bottom-section"><div class="how-block"><div class="section-heading"><h2>Три шага к победе</h2><button class="text-link" data-action="rules">Правила ${icons.arrow}</button></div><div class="steps"><div><b>01</b>${icons.sound}<h3>Слушай</h3><p>Слово звучит на английском.<br>Можно послушать ещё раз.</p></div><div><b>02</b>${icons.bolt}<h3>Пиши</h3><p>Введи слово и нажми Enter.<br>Точность важнее скорости.</p></div><div><b>03</b>${icons.trophy}<h3>Забирай очки</h3><p>Правильный ответ — 100 очков.<br>Скорость — до 50 сверху.</p></div></div></div><aside class="progress-note"><span class="eyebrow small">YOUR PERSONAL BEST</span><h3>${personal.length ? Math.max(...personal.map((x) => x.score)) : "—"}<span>очков</span></h3><p>${personal.length ? `Ты уже завершил ${personal.length} тренировок. Следующий рекорд рядом.` : "Первая тренировка — начало твоей истории. Сделаем первый шаг?"}</p><button class="text-link" data-action="solo">В соло ${icons.arrow}</button></aside></section>`;
}
function renderLeaders() {
  return `<section class="simple-intro"><span class="eyebrow">THE SPELLING CLUB</span><h1>Таблица <span class="underlined">лидеров.</span></h1><p>Правильные слова. Заслуженные победы.</p></section><div class="section-heading"><h2>Рейтинг ${state.level}</h2><div class="level-select"><div>${["A1", "A2"].map((l) => `<button data-level="${l}" class="${state.level === l ? "selected" : ""}">${l}</button>`).join("")}</div></div></div><div class="leader-table"><div class="leader-row heading"><span>МЕСТО</span><span>ИГРОК</span><span>РЕЙТИНГ</span></div>${state.leaderLoading ? '<div class="empty-state">Загружаем рейтинг…</div>' : state.leaderboard.length ? state.leaderboard.map((p, i) => `<div class="leader-row"><span class="leader-place">${String(i + 1).padStart(2, "0")}</span><span class="leader-player">${avatar(p.username)}<span data-no-i18n>${escape(p.username)}</span>${p.id === state.user?.id ? "<small>ТЫ</small>" : ""}</span><strong>${escape(p.rating ?? p[`rating_${state.level.toLowerCase()}`] ?? 1000)}</strong></div>`).join("") : `<div class="empty-state">${icons.trophy}<h3>${online.isOnlineConfigured ? "Лидеры ещё не появились" : "Здесь будут настоящие игроки"}</h3><p>${online.isOnlineConfigured ? "Заверши первый рейтинговый матч и займи своё место." : "Таблица заработает после подключения Supabase. А пока можно поставить личный рекорд в соло."}</p><button class="button dark" data-action="solo">Играть соло ${icons.arrow}</button></div>`}</div>`;
}
function renderWords() {
  return `<section class="simple-intro"><span class="eyebrow">ONE WORD AT A TIME</span><h1>Твой <span class="underlined">словарь.</span></h1><p>Послушай, запомни, попробуй в игре.</p></section><div class="section-heading"><h2>${WORDS[state.level].length} слов · ${state.level}</h2><div class="level-select"><div>${["A1", "A2"].map((l) => `<button data-level="${l}" class="${state.level === l ? "selected" : ""}">${l}</button>`).join("")}</div></div></div><label class="search-field">${icons.book}<input id="word-search" placeholder="Найти слово или перевод…" autocomplete="off" aria-label="Поиск слов" /></label><div class="word-grid" id="word-grid">${wordCards(WORDS[state.level])}</div><p class="vocab-note">Уровни A1/A2 обозначают учебные подборки. Написание слов — британский английский.</p>`;
}
function wordCards(words) {
  return words.length
    ? words
        .map(
          ([word]) =>
            `<div class="word-card"><div><strong data-no-i18n>${escape(word)}</strong><span data-no-i18n>${escape(wordMeaning(word, state.language))}</span></div><button class="icon-button" data-speak="${escape(word)}" aria-label="Послушать ${escape(word)}">${icons.sound}</button></div>`,
        )
        .join("")
    : '<p class="empty-state">Такого слова пока нет в подборке.</p>';
}
function renderProfile() {
  const history = state.history;
  return `<section class="simple-intro"><span class="eyebrow">YOUR NEXT LEVEL</span><h1>Каждый шаг <span class="underlined">считается.</span></h1><p>Твои тренировки, результаты и рост.</p></section><section class="profile-summary">${avatar(state.profile?.username || t("Ты", state.language), "large")}<div><h2 data-no-i18n>${escape(state.profile?.username || t("Гость арены", state.language))}</h2><p>${state.user ? "Твой путь к новому уровню" : "Соло доступно без аккаунта. Для рейтинга — войди."}</p></div>${state.user ? '<button class="text-link" data-action="signout">Выйти ' + icons.exit + "</button>" : '<button class="button dark" data-action="auth">Создать аккаунт ' + icons.arrow + "</button>"}</section><div class="stat-grid"><div><span>РЕЙТИНГ A1</span><strong>${state.profile?.rating_a1 ?? "—"}</strong><small>Дуэли и баттлы</small></div><div><span>РЕЙТИНГ A2</span><strong>${state.profile?.rating_a2 ?? "—"}</strong><small>Дуэли и баттлы</small></div><div><span>ЛИЧНЫЙ РЕКОРД</span><strong>${history.length ? Math.max(...history.map((x) => x.score)) : "—"}</strong><small>Соло на этом устройстве</small></div></div><div class="section-heading"><h2>Последние тренировки</h2><button class="text-link" data-action="solo">Ещё одну ${icons.arrow}</button></div><div class="history-list">${
    history.length
      ? history
          .slice(0, 10)
          .map(
            (x) =>
              `<div class="history-row"><span class="history-icon">${icons.bolt}</span><div><strong>Соло · ${escape(x.level)}</strong><small>${new Date(x.date).toLocaleDateString(LOCALES[state.language], { day: "numeric", month: "long" })}</small></div><span>${x.correct}/10 <small>верно</small></span><strong>${x.score} <small>очков</small></strong></div>`,
          )
          .join("")
      : '<div class="empty-state"><h3>Чистый лист — хороший старт</h3><p>Заверши тренировку, и здесь появится первый результат.</p></div>'
  }</div>`;
}
function modal(content) {
  closeModal();
  dialog = document.createElement("dialog");
  dialog.className = "modal";
  dialog.innerHTML = `<button class="modal-close icon-button" data-action="close" aria-label="Закрыть">${icons.close}</button>${content}`;
  localize(dialog, state.language);
  document.body.append(dialog);
  dialog.showModal();
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) closeModal();
  });
  dialog.addEventListener("cancel", () => closeModal());
}
function closeModal() {
  if (dialog) {
    dialog.close();
    dialog.remove();
    dialog = null;
  }
}
function showRules() {
  modal(
    `<span class="eyebrow">THE RULES ARE SIMPLE</span><h2>Слушай. Пиши.<br>Побеждай.</h2><div class="rules-list"><p><b>01</b><span>В матче 10 слов. На каждое — 12 секунд. В онлайне все участники получают одинаковую последовательность.</span></p><p><b>02</b><span>Слушай слово, вводи ответ и нажимай Enter. Повторное прослушивание не останавливает таймер.</span></p><p><b>03</b><span>Правильное слово даёт 100 очков. Чем быстрее ответ, тем больше бонус — до 50 очков.</span></p><p><b>04</b><span>Одна попытка на слово. Регистр букв не важен. Побеждает тот, у кого больше верных слов. При равной точности решают очки за скорость; полный равный результат — ничья.</span></p><p><b>05</b><span>A1 и A2 имеют отдельный рейтинг. В соло и демо рейтинг не меняется.</span></p></div><button class="button dark full" data-action="close">Понятно, погнали ${icons.arrow}</button>`,
  );
}
function showAuth(signup = false) {
  const googleOption = online.isGoogleConfigured
    ? '<button class="google-button" data-action="google"><span>G</span> Продолжить с Google</button><div class="divider"><span>или через почту</span></div>'
    : "";
  modal(
    `<span class="eyebrow">WELCOME TO THE CLUB</span><h2>${signup ? "Твой первый шаг." : "Снова на арену."}</h2><p class="modal-sub">${online.isOnlineConfigured ? "Войди, чтобы соревноваться и сохранять рейтинг." : "Регистрация будет доступна после подключения Supabase. Соло и демо уже работают."}</p>${online.isOnlineConfigured ? `${googleOption}<form id="auth-form" data-signup="${signup}">${signup ? '<label>Никнейм<input name="username" required minlength="2" maxlength="24" placeholder="Например, wordhunter" autocomplete="nickname" /></label>' : ""}<label>Email<input type="email" name="email" required placeholder="you@example.com" autocomplete="email" /></label><label>Пароль<input type="password" name="password" required minlength="8" placeholder="Не менее 8 символов" autocomplete="${signup ? "new-password" : "current-password"}" /></label><p id="auth-error" class="form-error" role="alert"></p><button type="submit" class="button dark full">${signup ? "Создать аккаунт" : "Войти"} ${icons.arrow}</button></form><p class="auth-switch">${signup ? "Уже есть аккаунт?" : "Первый раз здесь?"} <button data-action="${signup ? "signin" : "signup"}">${signup ? "Войти" : "Зарегистрироваться"}</button></p>` : `<div class="connection-note">${icons.user}<p>Онлайн требует собственного проекта Supabase. Код регистрации, матчей и рейтинга уже подготовлен.</p></div><button class="button dark full" data-action="solo">Пока сыграть соло ${icons.arrow}</button>`}`,
  );
}
function showDemoChoice() {
  modal(
    `<span class="eyebrow">TRY THE ARENA</span><h2>Разминка<br>перед онлайном.</h2><p class="modal-sub">Настоящие соперники появятся после подключения Supabase. Сейчас можно попробовать ${state.mode === "four" ? "баттл на четверых" : "дуэль"} с ботами.</p><div class="connection-note">${icons.arena}<p>Это демо. Соперники — боты, результат не влияет на рейтинг.</p></div><button class="button dark full" data-action="demo">Играть с ботами ${icons.arrow}</button><button class="text-link full" data-action="solo">Или тренироваться соло</button>`,
  );
}
function speak(word) {
  speakWord(word, {
    onError: (code) =>
      toast(
        {
          unsupported:
            "Браузер не поддерживает озвучку. Попробуй Chrome или Edge.",
          "no-english-voice":
            "Установи английский голос в настройках устройства или попробуй другой браузер.",
          "playback-failed":
            "Не удалось озвучить слово. Проверь звук и английский голос в браузере.",
        }[code],
      ),
  });
}

document.addEventListener("change", (event) => {
  if (event.target.id !== "language-select") return;
  const answer = document.querySelector("#answer");
  const typed = answer?.value;
  const focusedAnswer = document.activeElement === answer;
  const search = document.querySelector("#word-search")?.value;
  state.language = event.target.value;
  saveLanguage(state.language);
  render();
  if (typed !== undefined) {
    const nextInput = document.querySelector("#answer");
    if (nextInput) {
      nextInput.value = typed;
      if (focusedAnswer) nextInput.focus();
    }
  }
  if (search !== undefined) {
    document.querySelector("#word-search").value = search;
    renderFilteredWords(search);
  }
});

function renderFilteredWords(query) {
  const grid = document.querySelector("#word-grid");
  if (!grid) return;
  grid.innerHTML = wordCards(
    WORDS[state.level].filter(([word]) => matchesWord(word, query)),
  );
  localize(grid, state.language);
}

document.addEventListener("click", async (event) => {
  const el = event.target.closest("button,a.brand,a.footer-brand");
  if (!el) return;
  if (el.matches("a.brand,a.footer-brand")) {
    event.preventDefault();
    navigate("arena");
    return;
  }
  if (el.dataset.page) {
    navigate(el.dataset.page);
    return;
  }
  if (el.dataset.level) {
    state.level = el.dataset.level;
    render();
    if (state.page === "leaders") fetchLeaders();
    return;
  }
  if (el.dataset.mode) {
    state.mode = el.dataset.mode;
    render();
    return;
  }
  if (el.dataset.speak) {
    speak(el.dataset.speak);
    return;
  }
  const action = el.dataset.action;
  if (action === "close") closeModal();
  if (action === "rules") showRules();
  if (action === "auth" || action === "signin") showAuth();
  if (action === "signup") showAuth(true);
  if (action === "solo") {
    closeModal();
    startLocal("solo");
  }
  if (action === "demo") {
    closeModal();
    startLocal(state.mode);
  }
  if (action === "play" || action === "quick-play") play();
  if (action === "listen" && state.match?.currentWord)
    speak(state.match.currentWord);
  if (action === "leave") showLeave();
  if (action === "confirm-leave") {
    closeModal();
    stopGame();
    navigate("arena");
  }
  if (action === "cancel-queue") {
    await cancelQueue();
  }
  if (action === "again") {
    play();
  }
  if (action === "home") {
    stopGame();
    navigate("arena");
  }
  if (action === "google") {
    try {
      el.disabled = true;
      await online.signInWithGoogle();
    } catch (error) {
      el.disabled = false;
      toast(error.message);
    }
  }
  if (action === "signout") {
    try {
      await online.signOut();
      state.user = null;
      state.profile = null;
      render();
    } catch (error) {
      toast(error.message);
    }
  }
});
document.addEventListener("input", (event) => {
  if (event.target.id === "word-search") {
    renderFilteredWords(event.target.value);
  }
});
document.addEventListener("submit", async (event) => {
  if (event.target.id === "answer-form") {
    event.preventDefault();
    submitCurrent();
  }
  if (event.target.id === "auth-form") {
    event.preventDefault();
    const form = event.target,
      button = form.querySelector('button[type="submit"]'),
      data = new FormData(form);
    button.disabled = true;
    form.querySelector("#auth-error").textContent = "";
    try {
      if (form.dataset.signup === "true") {
        const result = await online.signUp(
          data.get("email"),
          data.get("password"),
          data.get("username"),
        );
        if (!result?.session) {
          form.innerHTML =
            '<div class="empty-state"><h3>Проверь почту</h3><p>Подтверди email по ссылке в письме, затем вернись и войди.</p></div>';
          localize(form, state.language);
          return;
        }
      } else {
        await online.signIn(data.get("email"), data.get("password"));
      }
      await refreshUser();
      closeModal();
      render();
      toast("Ты в игре. Добро пожаловать!");
    } catch (error) {
      form.querySelector("#auth-error").textContent = t(
        error.message,
        state.language,
      );
      button.disabled = false;
    }
  }
});
function navigate(page) {
  if (state.match && !state.match.finished && state.page === "game") {
    showLeave();
    return;
  }
  state.page = page;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (page === "leaders") fetchLeaders();
}
async function fetchLeaders() {
  if (!online.isOnlineConfigured) return;
  const request = ++leaderRequest;
  const level = state.level;
  state.leaderLoading = true;
  render();
  try {
    const leaders = await online.getLeaderboard(level);
    if (request === leaderRequest) state.leaderboard = leaders;
  } catch (error) {
    toast(error.message);
  } finally {
    if (request === leaderRequest) {
      state.leaderLoading = false;
      if (state.page === "leaders") render();
    }
  }
}
async function refreshUser() {
  state.user = (await online.getSession())?.user || null;
  state.profile = state.user ? await online.getProfile() : null;
}
async function initialize() {
  render();
  if (online.isOnlineConfigured) {
    try {
      await refreshUser();
      online.onAuthStateChange(() => {
        setTimeout(async () => {
          try {
            await refreshUser();
            if (state.page !== "game") render();
          } catch (error) {
            toast(error.message);
          }
        }, 0);
      });
    } catch (error) {
      toast("Не удалось подключиться: " + error.message);
    }
  }
  if (state.page !== "game") render();
}
function stopGame() {
  clearInterval(gameTimer);
  clearInterval(pollTimer);
  clearInterval(queueTimer);
  gameTimer = pollTimer = queueTimer = null;
  stopSpeech();
  state.match = null;
}
function play() {
  if (state.mode === "solo") startLocal("solo");
  else if (!online.isOnlineConfigured) showDemoChoice();
  else if (!state.user) showAuth();
  else startQueue();
}
function startLocal(mode) {
  stopGame();
  closeModal();
  state.mode = mode;
  const names =
    mode === "four"
      ? ["Bot Ray", "Bot Mia", "Bot Finn"]
      : mode === "duel"
        ? ["Bot Ray"]
        : [];
  state.match = {
    local: true,
    mode,
    level: state.level,
    deck: makeDeck(state.level),
    index: -1,
    score: 0,
    correct: 0,
    answers: [],
    players: names.map((username, i) => ({
      id: "bot" + i,
      username,
      score: 0,
      correct: 0,
      bot: true,
    })),
    starts: performance.now() + 3000,
    answered: false,
    finished: false,
  };
  state.page = "game";
  render();
  window.scrollTo(0, 0);
  gameTimer = setInterval(tickLocal, 100);
}
function renderGame() {
  const m = state.match;
  if (!m) return '<div class="empty-state">Матч не найден.</div>';
  if (m.finished) return renderResult(m);
  const playerList = m.local
    ? [
        {
          id: "self",
          username: state.profile?.username || t("Ты", state.language),
          score: m.score,
          correct: m.correct,
        },
        ...m.players,
      ]
    : m.players || [];
  const mine = playerList.find((p) => p.id === state.user?.id) || playerList[0];
  return `<section class="game-top"><button class="text-link" data-action="leave">${icons.exit} Покинуть матч</button><span class="match-label">${m.local && m.mode !== "solo" ? "ДЕМО С БОТАМИ" : m.mode === "solo" ? "ТРЕНИРОВКА" : "РЕЙТИНГОВЫЙ МАТЧ"} <b>${m.level}</b></span></section><div class="game-title"><span class="eyebrow">${modes[m.mode].label}</span><h1>${modes[m.mode].name}<span class="game-round" id="round-label">${m.index < 0 ? "Сейчас начнём" : `Слово ${m.index + 1} / 10`}</span></h1></div><section class="game-layout"><div class="game-stage"><div class="round-progress" id="round-progress">${Array.from({ length: 10 }, (_, i) => `<span class="${i < m.index ? "complete" : i === m.index ? "current" : ""}"></span>`).join("")}</div><div class="game-countdown" id="game-countdown" ${m.index >= 0 ? "hidden" : ""}><span>ПАЛЬЦЫ НА КЛАВИАТУРЕ</span><strong id="countdown-number">3</strong><p>Включи звук. Первое слово уже близко.</p></div><div class="challenge" id="challenge" ${m.index < 0 ? "hidden" : ""}><div class="challenge-timer"><span>${icons.time} ОСТАЛОСЬ</span><strong id="seconds">12.0<span>с</span></strong></div><button class="listen-button" data-action="listen" aria-label="Послушать слово ещё раз">${icons.sound}<span>Послушать слово<small>Нажми для повторения</small></span><span class="audio-bars"><i></i><i></i><i></i><i></i><i></i></span></button><form id="answer-form" autocomplete="off"><label for="answer">ЧТО ТЫ УСЛЫШАЛ?</label><div class="answer-wrap"><input id="answer" name="answer" placeholder="Напиши слово…" spellcheck="false" autocapitalize="off" autocorrect="off" autocomplete="off" maxlength="64" ${m.answered ? "disabled" : ""} /><button type="submit" aria-label="Отправить ответ" ${m.answered ? "disabled" : ""}>${icons.arrow}</button></div><div id="answer-feedback" class="answer-feedback" role="status">${m.answered ? "Ответ принят. Ждём следующее слово." : "Enter — отправить ответ · Одна попытка"}</div></form><div class="time-track"><span id="time-track-fill"></span></div></div><div class="game-stage-foot"><span>${icons.sound} Английский · UK</span><span>Точность + скорость</span></div></div><aside class="scoreboard"><span class="eyebrow">НА АРЕНЕ</span><h2>${m.mode === "solo" ? "Твой результат" : "Счёт матча"}</h2><div id="scoreboard-players">${playerList.map((p, i) => `<div class="score-player ${p.id === "self" || p.id === state.user?.id ? "you" : ""}" data-player="${escape(p.id)}">${avatar(p.username)}<div><strong><span data-no-i18n>${escape(p.username)}</span></strong><small>${p.bot ? "ДЕМО-БОТ" : p.id === "self" || p.id === state.user?.id ? "ЭТО ТЫ" : `ИГРОК ${i + 1}`}</small></div><b class="player-score">${p.score || 0}</b></div>`).join("")}</div><div class="score-explainer"><span>${icons.bolt}</span><p><strong>Каждая буква важна.</strong>100 очков за верное слово.<br>До 50 сверху за скорость.</p></div><div class="personal-correct"><span>Верных ответов</span><strong id="correct-counter">${mine?.correct || 0}<small> / 10</small></strong></div></aside></section>`;
}
function bindAnswer() {
  document.querySelector("#answer")?.addEventListener("paste", (e) => {
    e.preventDefault();
    toast("Вводи слово вручную — это spelling!");
  });
}
function tickLocal() {
  const m = state.match;
  if (!m || m.finished || !m.local) return;
  if (m.index < 0) {
    const remain = m.starts - performance.now();
    const num = document.querySelector("#countdown-number");
    if (num) num.textContent = Math.max(1, Math.ceil(remain / 1000));
    if (remain <= 0) nextLocalRound();
    return;
  }
  const remaining = m.deadline - performance.now();
  updateTimer(remaining);
  if (m.answered) {
    if (performance.now() >= m.advanceAt) nextLocalRound();
  } else if (remaining <= 0) recordLocalAnswer("", ROUND_SECONDS * 1000);
}
function nextLocalRound() {
  const m = state.match;
  if (!m) return;
  m.index++;
  if (m.index >= ROUND_COUNT) {
    finishLocal();
    return;
  }
  m.answered = false;
  m.currentWord = m.deck[m.index].word;
  m.roundStart = performance.now();
  m.deadline = m.roundStart + ROUND_SECONDS * 1000;
  render();
  document.querySelector("#answer")?.focus();
  speak(m.currentWord);
}
function updateTimer(remaining) {
  const seconds = document.querySelector("#seconds");
  if (seconds)
    seconds.innerHTML = `${Math.max(0, remaining / 1000).toFixed(1)}<span>${t("с", state.language)}</span>`;
  const fill = document.querySelector("#time-track-fill");
  if (fill) {
    fill.style.width = `${Math.max(0, Math.min(100, remaining / (ROUND_SECONDS * 10)))}%`;
    fill.classList.toggle("urgent", remaining < 3000);
  }
}
async function submitCurrent() {
  const m = state.match,
    input = document.querySelector("#answer");
  if (
    !m ||
    m.answered ||
    m.submitting === m.index ||
    m.index < 0 ||
    !input ||
    !input.value.trim()
  )
    return;
  if (m.local) {
    recordLocalAnswer(input.value, performance.now() - m.roundStart);
    return;
  }
  m.answered = true;
  const submittedIndex = m.index;
  m.submitting = submittedIndex;
  input.disabled = true;
  document.querySelector("#answer-form button").disabled = true;
  try {
    const result = await online.submitAnswer(m.id, submittedIndex, input.value);
    if (state.match !== m || m.index !== submittedIndex) return;
    m.acceptedIndex = submittedIndex;
    const feedback = document.querySelector("#answer-feedback");
    if (feedback) {
      feedback.className =
        "answer-feedback " + (result.correct ? "good" : "bad");
      feedback.textContent = t(
        result.correct
          ? `Верно! +${result.points ?? result.score ?? 100} очков`
          : "В этот раз не получилось. Следующее слово — новый шанс.",
        state.language,
      );
    }
    await pollMatch(false);
  } catch (error) {
    if (state.match !== m || m.index !== submittedIndex) return;
    toast(error.message);
    const feedback = document.querySelector("#answer-feedback");
    if (feedback)
      feedback.textContent = t("Проверяем статус ответа…", state.language);
    await pollMatch(false);
  } finally {
    if (m.submitting === submittedIndex) m.submitting = null;
    if (state.match === m && m.index === submittedIndex) {
      document
        .querySelector("#answer")
        ?.toggleAttribute("disabled", m.answered);
      document
        .querySelector("#answer-form button")
        ?.toggleAttribute("disabled", m.answered);
    }
  }
}
function recordLocalAnswer(answer, elapsed) {
  const m = state.match;
  if (!m || m.answered) return;
  m.answered = true;
  const result = scoreAnswer(answer, m.currentWord, elapsed);
  m.score += result.points;
  if (result.points > 0) m.correct++;
  m.answers.push({
    word: m.currentWord,
    translation: m.deck[m.index].translation,
    answer,
    correct: result.points > 0,
    points: result.points,
  });
  m.players.forEach((p) => {
    const correct = Math.random() < 0.72;
    const points = correct
      ? scoreAnswer(m.currentWord, m.currentWord, 1500 + Math.random() * 7000)
          .points
      : 0;
    p.score += points;
    if (correct) p.correct++;
  });
  const input = document.querySelector("#answer");
  input.disabled = true;
  document.querySelector("#answer-form button").disabled = true;
  const feedback = document.querySelector("#answer-feedback");
  feedback.className =
    "answer-feedback " + (result.points > 0 ? "good" : "bad");
  feedback.textContent = t(
    result.points > 0
      ? `Верно! +${result.points} очков`
      : `${answer ? "Правильно:" : "Время вышло:"} ${m.currentWord}`,
    state.language,
  );
  m.advanceAt = performance.now() + 1200;
  document.querySelectorAll("[data-player]").forEach((el) => {
    const p =
      el.dataset.player === "self"
        ? m
        : m.players.find((p) => p.id === el.dataset.player);
    if (p) el.querySelector(".player-score").textContent = p.score;
  });
  document.querySelector("#correct-counter").innerHTML =
    `${m.correct}<small> / 10</small>`;
}
function finishLocal() {
  const m = state.match;
  clearInterval(gameTimer);
  stopSpeech();
  m.finished = true;
  m.results = [
    {
      id: "self",
      username: state.profile?.username || t("Ты", state.language),
      score: m.score,
      correct: m.correct,
    },
    ...m.players,
  ].sort(comparePlayers);
  if (m.mode === "solo") {
    savePractice({ score: m.score, correct: m.correct, level: m.level });
    state.history = loadPractice();
  }
  render();
}
function renderResult(m) {
  const results = [...(m.results || [])].sort(comparePlayers),
    mine = results.find(
      (p) => p.id === (m.local ? "self" : state.user?.id),
    ) || { score: 0, correct: 0 };
  const place = playerPlace(mine, results);
  const title =
    m.mode === "solo"
      ? "Ещё на шаг вперёд."
      : place === 1
        ? "Твоё слово победило."
        : "Хороший матч. Ещё один?";
  const ranking =
    m.mode === "solo"
      ? ""
      : `<div class="result-ranking">${results
          .map(
            (p) => `
    <div class="history-row"><span class="leader-place">${playerPlace(p, results)}</span>
      <div class="leader-player">${avatar(p.username)}<strong><span data-no-i18n>${escape(p.username)}</span></strong></div>
      <strong>${p.correct}/10<small> верно · ${p.score} очков${!m.local && p.rating_change !== undefined ? ` · ${p.rating_change >= 0 ? "+" : ""}${p.rating_change} рейтинга` : ""}</small></strong>
    </div>`,
          )
          .join("")}</div>`;
  const review = !m.answers?.length
    ? ""
    : `<section class="review-section">
    <div class="section-heading"><h2>Разбор слов</h2><span>${m.answers.filter((a) => !a.correct).length} для повторения</span></div>
    <div class="review-grid">${m.answers
      .map(
        (a) => `<div class="review-word ${a.correct ? "correct" : "incorrect"}">
      <span>${a.correct ? icons.check : icons.close}</span><div><strong>${escape(a.word)}</strong>
      <small data-no-i18n>${escape(wordMeaning(a.word, state.language))}${!a.correct ? ` · ${t("Твой ответ:", state.language)} ${escape(a.answer || t("нет ответа", state.language))}` : ""}</small></div>
      <button class="icon-button" data-speak="${escape(a.word)}" aria-label="Послушать ${escape(a.word)}">${icons.sound}</button><b>+${a.points}</b>
    </div>`,
      )
      .join("")}</div></section>`;
  return `<section class="result-header">${m.mode === "solo" ? "" : `<span class="result-symbol">${icons.trophy}</span>`}
    <span class="eyebrow">${m.local && m.mode !== "solo" ? "ДЕМО ЗАВЕРШЕНО" : "МАТЧ ЗАВЕРШЁН"} · ${m.level}</span><h1>${title}</h1>
    <p>${m.mode === "solo" ? "Ошибки — это слова, которые ты скоро запомнишь." : `${place} место · ${m.local ? "Боты не влияют на твой рейтинг" : "Рейтинг обновлён по результату матча"}`}</p></section>
    <div class="result-stats"><div><span>ОЧКИ</span><strong>${mine.score}</strong></div>
    <div><span>ВЕРНЫЕ СЛОВА</span><strong>${mine.correct}<small> / 10</small></strong></div>
    <div><span>ТОЧНОСТЬ</span><strong>${mine.correct * 10}<small>%</small></strong></div></div>${ranking}
    <div class="result-actions"><button class="button dark" data-action="again">Ещё один матч ${icons.arrow}</button>
    <button class="button outline" data-action="home">На главную</button></div>${review}`;
}
function showLeave() {
  modal(
    `<span class="eyebrow">TAKE A BREATH</span><h2>Выйти из матча?</h2><p class="modal-sub">${state.match?.local ? "Текущая попытка не сохранится. Можно начать заново в любой момент." : "Матч продолжится. Уже отправленные ответы сохранятся, а пропущенные слова не принесут очков."}</p><button class="button dark full" data-action="close">Продолжить играть</button><button class="text-link full" data-action="confirm-leave">Покинуть матч</button>`,
  );
}
async function startQueue() {
  if (queueActive) return;
  queueActive = true;
  const generation = ++queueGeneration;
  stopGame();
  closeModal();
  const mode = state.mode,
    level = state.level;
  try {
    const queue = await online.joinQueue(mode, level);
    if (generation !== queueGeneration) return;
    if (queue.match_id) {
      startOnline(queue.match_id);
      return;
    }
    modal(
      `<span class="eyebrow">FINDING YOUR MATCH</span><h2>Ищем твоего<br>соперника.</h2><div class="queue-animation"><span>a</span><i>×</i><span>?</span></div><p class="modal-sub">${modes[mode].name} · ${level}<br>Подбираем игроков с близким рейтингом.</p><p class="queue-time" id="queue-time">00:00</p><button class="button outline full" data-action="cancel-queue">Отменить поиск</button>`,
    );
    dialog.querySelector(".modal-close").remove();
    dialog.oncancel = (e) => {
      e.preventDefault();
      cancelQueue();
    };
    dialog.addEventListener(
      "click",
      (e) => {
        if (e.target === dialog) cancelQueue();
      },
      { capture: true },
    );
    const started = Date.now();
    let checking = false;
    queueTimer = setInterval(async () => {
      if (checking || generation !== queueGeneration) return;
      checking = true;
      const elapsed = Math.floor((Date.now() - started) / 1000);
      const label = document.querySelector("#queue-time");
      if (label)
        label.textContent = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
      try {
        const q = await online.pollQueue();
        if (generation !== queueGeneration) return;
        if (q?.match_id) {
          clearInterval(queueTimer);
          closeModal();
          startOnline(q.match_id);
        } else if (q?.status === "idle") {
          clearInterval(queueTimer);
          queueTimer = null;
          queueActive = false;
          queueGeneration++;
          closeModal();
          toast(
            "Поиск остановлен после потери связи. Нажми «Играть», чтобы начать снова.",
          );
        }
      } catch (error) {
        if (generation !== queueGeneration) return;
        clearInterval(queueTimer);
        queueTimer = null;
        queueActive = false;
        closeModal();
        toast(error.message);
      } finally {
        checking = false;
      }
    }, 1500);
  } catch (error) {
    if (generation !== queueGeneration) return;
    queueActive = false;
    toast(error.message);
  }
}
async function cancelQueue() {
  const generation = ++queueGeneration;
  // Keep new searches blocked until the server finishes cancelling the old one.
  queueActive = true;
  clearInterval(queueTimer);
  queueTimer = null;
  closeModal();
  try {
    await online.cancelQueue();
  } catch (error) {
    if (generation === queueGeneration) toast(error.message);
  } finally {
    if (generation === queueGeneration) queueActive = false;
  }
}
async function startOnline(id) {
  queueActive = false;
  closeModal();
  const m = (state.match = {
    id,
    local: false,
    mode: state.mode,
    level: state.level,
    index: -1,
    players: [],
    answered: false,
    finished: false,
  });
  state.page = "game";
  render();
  try {
    await pollMatch(true);
    if (state.match !== m || m.finished) return;
    pollTimer = setInterval(() => pollMatch(false), 1200);
    gameTimer = setInterval(tickOnline, 100);
  } catch (error) {
    if (state.match !== m) return;
    stopGame();
    state.page = "arena";
    render();
    toast(error.message);
  }
}
async function pollMatch(initial = false) {
  const m = state.match;
  if (!m || m.local || m.finished || m.polling) return;
  m.polling = true;
  try {
    const data = await online.getMatchState(m.id);
    if (state.match !== m) return;
    const index = data.round_index ?? data.challenge?.index ?? -1;
    m.mode = data.mode;
    m.level = data.level;
    m.offset = Date.parse(data.server_now) - Date.now();
    m.starts = Date.parse(data.starts_at);
    m.ends = Date.parse(data.ends_at);
    m.players = data.players || [];
    if (data.status === "finished" || Date.now() + m.offset >= m.ends) {
      const final = await online.finishMatch(m.id);
      if (state.match !== m) return;
      m.finished = true;
      m.results = final.results || final.players || data.results || [];
      m.answers = final.answers || [];
      clearInterval(pollTimer);
      clearInterval(gameTimer);
      try {
        await refreshUser();
      } finally {
        if (state.match === m) render();
      }
      return;
    }
    const changed = m.index !== index || initial;
    m.index = index;
    m.currentWord = data.challenge?.word;
    m.answered =
      m.acceptedIndex === index ||
      m.players.find((p) => p.id === state.user?.id)?.answered_current ||
      false;
    if (changed) {
      render();
      if (m.currentWord) {
        document.querySelector("#answer")?.focus();
        speak(m.currentWord);
      }
    } else {
      document.querySelectorAll("[data-player]").forEach((el) => {
        const p = m.players.find((x) => x.id === el.dataset.player);
        if (p) el.querySelector(".player-score").textContent = p.score || 0;
      });
      const me = m.players.find((p) => p.id === state.user?.id);
      const counter = document.querySelector("#correct-counter");
      if (counter)
        counter.innerHTML = `${me?.correct || 0}<small> / 10</small>`;
      if (m.submitting !== m.index) {
        const input = document.querySelector("#answer");
        if (input) input.disabled = m.answered;
        const button = document.querySelector("#answer-form button");
        if (button) button.disabled = m.answered;
      }
    }
  } catch (error) {
    if (state.match !== m) return;
    if (initial) throw error;
    toast("Связь с матчем: " + error.message);
  } finally {
    m.polling = false;
  }
}
function tickOnline() {
  const m = state.match;
  if (!m || m.local || m.finished) return;
  const now = Date.now() + (m.offset || 0);
  if (m.index < 0) {
    const num = document.querySelector("#countdown-number");
    if (num) num.textContent = Math.max(1, Math.ceil((m.starts - now) / 1000));
  } else {
    updateTimer(m.starts + (m.index + 1) * ROUND_SECONDS * 1000 - now);
  }
}
initialize();
