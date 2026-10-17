import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { homePage, homeShell } from "../src/home.js";
import { t } from "../src/i18n.js";
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const options = {
  language: "en",
  escape,
  icons: { arrow: "→", sound: "sound", user: "user" },
  level: "C1",
};

test("home offers only real practice paths and direct access to all five levels", () => {
  const html = homePage(options);
  assert.equal((html.match(/<h1>/g) || []).length, 1);
  for (const level of ["A1", "A2", "B1", "B2", "C1"])
    assert.ok(
      html.includes(`href="/learn/${level}" data-study-level="${level}"`),
    );
  assert.match(html, /home-level-current[^>]*href="\/learn\/C1"/);
  assert.match(html, /data-home-practice="cards"/);
  assert.match(html, /data-home-practice="sentences"/);
  for (const page of ["plan", "arena", "leaders"])
    assert.ok(html.includes(`data-page="${page}"`));
  assert.match(html, /data-speak="opportunity"/);
  assert.doesNotMatch(
    html,
    /sample course|demo account|Global Minds|contactForm|10qadam_users/,
  );
});
test("home translations cover all languages and preserve the official slogans", () => {
  for (const language of ["en", "kk", "ru"]) {
    const html = homePage({ ...options, language });
    assert.ok(html.includes(t("Start learning", language)));
    assert.ok(html.includes(t("How do sentence battles work?", language)));
    assert.ok(
      html.includes(
        t("Practice collections, not a certified CEFR assessment.", language),
      ),
    );
  }
  assert.match(homePage(options), /Spell Your Way,/);
  assert.match(homePage({ ...options, language: "kk" }), /Äripten sözge,/);
});
test("responsive home shell uses real auth actions, a language picker and a native menu", () => {
  const guest = homeShell(homePage(options), options);
  assert.match(guest, /<details class="home-mobile-menu">/);
  assert.match(guest, /id="language-select"/);
  assert.match(guest, /data-action="auth"/);
  assert.match(guest, /data-action="signup"/);
  assert.doesNotMatch(guest, /class="sidebar"/);
  for (const anchor of [
    "home",
    "learning",
    "about",
    "community",
    "choose-level",
  ])
    assert.ok(guest.includes(`id="${anchor}"`));
  const member = homeShell("", {
    ...options,
    user: { id: "u" },
    username: '<img src=x onerror="bad()">',
  });
  assert.match(member, /data-page="profile"/);
  assert.doesNotMatch(member, /<img|data-action="signup"/);
  assert.match(member, /&lt;img/);
});
test("home integration keeps existing study handlers and scopes mobile navigation changes", () => {
  const main = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/home.css", import.meta.url), "utf8");
  assert.match(main, /if \(state.page === "welcome"\)\s+return homeShell/);
  assert.match(
    main,
    /\["cards", "sentences"\]\.includes\(el.dataset.homePractice\)/,
  );
  assert.match(main, /value: el.dataset.homePractice/);
  assert.match(
    main,
    /homeAnchor.closest\("details"\)\?\.removeAttribute\("open"\)/,
  );
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /\.home-page \.home-main/);
});
