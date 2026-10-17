import { t, slogan } from "./i18n.js";
import { mascotMarkup } from "./mascot.js";

const levels = [
  ["A1", "Beginner", "Everyday words. Your first sentences."],
  ["A2", "Elementary", "Build confidence in familiar situations."],
  ["B1", "Intermediate", "Express ideas and connect your thoughts."],
  ["B2", "Upper intermediate", "More precise words. More complex ideas."],
  ["C1", "Advanced", "Nuance, detail and fluent expression."],
];

export function homePage({ language, escape, icons, level = "A1" }) {
  const h = (key) => escape(t(key, language));
  const selected = levels.some(([value]) => value === level) ? level : "A1";
  const features = [
    [
      "📖",
      "Learn in small sessions",
      "A few words, whenever you have a moment.",
    ],
    ["🪜", "Start at your level", "A1 to C1. No need to repeat the basics."],
    [
      "🏆",
      "Make it a friendly challenge",
      "Solo practice, duels and four-player battles.",
    ],
    [
      "📱",
      "Made for your phone, too",
      "Clear buttons. Your learning, wherever you are.",
    ],
  ];
  const paths = [
    [
      "📚",
      "START WITH A WORD",
      "Words that stay with you.",
      "Flip flashcards, hear each word and revisit the ones you want to remember.",
      "Explore flashcards",
      "cards",
    ],
    [
      "🎧",
      "LISTEN & WRITE",
      "Catch the whole thought.",
      "Listen, replay and type a sentence. See which letters need another try.",
      "Try sentence dictation",
      "sentences",
    ],
    [
      "✨",
      "YOUR OWN ROUTINE",
      "A week shaped around you.",
      "Tell Gemini your goal, level and available time for a personal seven-day practice plan.",
      "Make my study plan",
      "plan",
    ],
  ];
  return `<section class="home-hero" id="home"><div class="home-wrap"><div class="home-hero-grid"><div class="home-hero-copy"><span class="home-kicker"><i></i>${h("Your English. Your next chapter.")}</span><p class="home-name" data-no-i18n>10Qadam</p><h1>${escape(slogan(language)[0])}<br><span>${escape(slogan(language)[1])}</span></h1><p class="home-lead">${h("Learn a word, catch a sentence, challenge a friend. Start at your own level and make English part of your day.")}</p><div class="home-actions"><a class="button home-primary" href="#choose-level">${h("Start learning")} ${icons.arrow}</a><a class="button home-secondary" href="#about">${h("Explore 10Qadam")} ↗</a></div></div><div class="home-art"><span class="home-art-orbit" aria-hidden="true"></span><span class="home-float home-float-book" aria-hidden="true">📚</span><span class="home-float home-float-star" aria-hidden="true">✦</span><div class="home-companion">${mascotMarkup("sky")}<span>${h("A small step. A little more confidence.")}</span></div><button class="home-audio-card" data-speak="opportunity" aria-label="${h("Hear a word")}: opportunity"><span class="home-audio-icon">${icons.sound}</span><span><small>${h("Your next word")}</small><strong lang="en">opportunity</strong></span><span class="home-audio-bars" aria-hidden="true">▂▅▃▇▅▂</span></button><span class="home-art-caption">${h("Listen. Spell. Keep going.")}</span></div></div><div class="home-features">${features.map(([emoji, title, text]) => `<div><span class="home-feature-icon" aria-hidden="true">${emoji}</span><div><strong>${h(title)}</strong><p>${h(text)}</p></div></div>`).join("")}</div></div></section>
  <section class="home-section home-wrap" id="learning"><header class="home-section-head"><span class="home-eyebrow">${h("Find your next step")}</span><h2>${h("A little curious? Start here.")}</h2><p>${h("Three ways to practise, one place to come back to.")}</p></header><div class="home-paths">${paths.map(([emoji, kicker, title, description, label, kind]) => `<article class="home-path"><div class="home-path-top"><span aria-hidden="true">${emoji}</span><small>${h(kicker)}</small></div><h3>${h(title)}</h3><p>${h(description)}</p><button class="home-path-link" ${kind === "plan" ? 'data-page="plan"' : `data-home-practice="${kind}"`}>${h(label)} ${icons.arrow}</button></article>`).join("")}</div></section>
  <section class="home-about" id="about"><div class="home-wrap home-about-grid"><div class="home-about-art" aria-hidden="true"><span class="home-book-spine">10QADAM</span><div class="home-about-book"><span>10</span><small>STEP BY STEP</small><i>↗</i></div><span class="home-about-spark">✦</span><div class="home-about-note"><span>✎</span> Every letter counts.</div></div><div class="home-about-copy"><span class="home-eyebrow">${h("About 10Qadam")}</span><h2>${h("Big progress starts small.")}</h2><p>${h("10Qadam means ten steps. We believe practice should feel approachable: a word you recognise, a sentence you understand, a little more confidence than yesterday.")}</p><p>${h("Choose where to begin. Keep your own pace.")}</p><a class="home-text-link" href="#choose-level">${h("Choose your starting point")} ${icons.arrow}</a></div></div></section>
  <section class="home-section home-wrap" id="choose-level"><header class="home-section-head"><span class="home-eyebrow">A1 — C1</span><h2>${h("Choose your starting point")}</h2><p>${h("No placement test. No locked levels. You can switch at any time.")}</p></header><div class="home-levels">${levels.map(([value, label, description]) => `<a class="home-level ${value === selected ? "home-level-current" : ""}" href="/learn/${value}" data-study-level="${value}"><strong>${value}</strong><h3>${h(label)}</h3><p>${h(description)}</p><span>${icons.arrow}</span></a>`).join("")}</div><p class="home-level-note">${h("Practice collections, not a certified CEFR assessment.")}</p></section>
  <section class="home-community home-wrap" id="community"><div><span class="home-eyebrow">${h("Make it a friendly challenge")}</span><h2>${h("Your next challenge is waiting.")}</h2><p>${h("Put your listening and spelling into play. Choose words or sentences, then solo, a duel or a four-player battle.")}</p><div class="home-actions"><button class="button home-primary" data-page="arena">${h("Enter the arena")} ${icons.arrow}</button><button class="home-text-link" data-page="leaders">${h("See the leaderboard")} ↗</button></div><small>${h("Solo is open without an account. Sign in for ranked matches.")}</small></div><div class="home-community-art" aria-hidden="true"><span>Aa</span><i>vs</i><span>Bb</span><b>🏆</b></div></section>
  <section class="home-section home-wrap home-faq" id="questions"><header><span class="home-eyebrow">10QADAM / FAQ</span><h2>${h("A few things worth knowing")}</h2></header><div>${[
    [
      "Do I have to start at A1?",
      "No. Choose any level from A1 to C1 and change it whenever you want. Your account can remember your preferred level.",
    ],
    [
      "How do sentence battles work?",
      "Five sentences, 35 seconds each. Replay within the timer. The highest average character accuracy wins; speed is not a tie-breaker.",
    ],
    [
      "Is this a CEFR placement test?",
      "No. The levels guide your practice collections. They are not a certified assessment or a promise of a particular result.",
    ],
  ]
    .map(
      ([question, answer]) =>
        `<details><summary>${h(question)}<span aria-hidden="true">+</span></summary><p>${h(answer)}</p></details>`,
    )
    .join("")}</div></section>`;
}

export function homeShell(
  content,
  { language, escape, icons, user, username },
) {
  const h = (key) => escape(t(key, language));
  const accountButton = user
    ? `<button class="home-account" data-page="profile" aria-label="${escape(username || t("Мой профиль", language))}">${icons.user}<span>${escape(username || t("Мой профиль", language))}</span></button>`
    : `<button class="home-signin" data-action="auth">${h("Войти")}</button><button class="button home-primary home-signup" data-action="signup">${h("Создать аккаунт")} ↗</button>`;
  const links = () =>
    `<a href="#home">${h("Home")}</a><a href="#learning">${h("Learning")}</a><a href="#about">${h("About 10Qadam")}</a><a href="#community">${h("Арена")}</a>`;
  return `<div class="home-page" data-no-i18n><a class="home-skip" href="#main-content">${h("Start learning")}</a><header class="home-header"><div class="home-wrap home-nav"><a class="brand home-brand" href="/" aria-label="${h("10Qadam, главная")}"><span class="brand-mark" role="img" aria-label="${h("Логотип 10Qadam")}"></span><span>10Qadam</span></a><nav class="home-desktop-nav" aria-label="${h("Главная навигация")}">${links()}</nav><div class="home-nav-actions"><select id="language-select" aria-label="${h("Language")}">${[
    ["en", "EN"],
    ["kk", "KZ"],
    ["ru", "RU"],
  ]
    .map(
      ([code, label]) =>
        `<option value="${code}" ${language === code ? "selected" : ""}>${label}</option>`,
    )
    .join(
      "",
    )}</select>${accountButton}<details class="home-mobile-menu"><summary aria-label="${h("Open menu")}"><span aria-hidden="true">☰</span></summary><nav aria-label="${h("Главная навигация")}">${links()}<button data-page="words">${h("Словарь")}</button><button data-page="plan">${h("My study plan")}</button>${!user ? `<button data-action="signup">${h("Создать аккаунт")} ↗</button>` : ""}</nav></details></div></div></header><main id="main-content" class="home-main">${content}</main><footer class="home-footer"><div class="home-wrap"><a class="brand home-brand" href="/">10Qadam<span>↗</span></a><span>${h("Listen. Spell. Keep going.")}</span><a href="/vocabulary-sources.html">${h("Sources & licences")} ↗</a></div></footer></div>`;
}
