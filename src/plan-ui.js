import { t } from "./i18n.js";
import { PLAN_LEVELS, validatePlan, validatePlanRequest } from "./plan.js";

const ERROR_COPY = {
  ai_not_configured:
    "Gemini is not connected yet. The site owner needs to add the server API key. Your current learning tools still work.",
  provider_configuration:
    "Google rejected the Gemini configuration. The site owner needs to check the API key, model access and Google project settings.",
  daily_limit:
    "Your account or the site has reached today’s plan limit. Try again after 00:00 UTC.",
  provider_busy:
    "Gemini is busy or its quota has been reached. Try again later; this attempt may have used your daily allowance.",
  generation_timeout:
    "Generation timed out. Try later; this attempt may have used your daily allowance.",
  invalid_request:
    "Check your goal, level, time and consent before submitting.",
  sign_in_required: "Sign in to create a plan",
};
const FAILURE =
  "Could not create a valid plan. Please try later. Your saved plan has not changed.";
const kindCopy = {
  words: "Words & flashcards",
  dictation: "Sentence dictation",
  review: "Review mistakes",
};

export function createPlanController({
  language,
  escape,
  render: rerender,
  getLevel,
  getUser,
  getAccessToken,
  onSignIn,
  openLevel,
}) {
  const text = (key) => t(key, language());
  const h = (key) => escape(text(key));
  let loadedUser = null,
    saved = null,
    completed = [],
    pending = false,
    error = "",
    request = null,
    generation = 0;
  let form = {
    level: getLevel() || "A1",
    goal: "",
    preferences: "",
    minutes: 20,
    consent: false,
  };
  const userId = () => getUser()?.id || null;
  const storageKey = () => `10qadam-plan:${userId()}`;
  function syncUser() {
    const id = userId();
    if (id === loadedUser) return;
    stop();
    loadedUser = id;
    saved = null;
    completed = [];
    error = "";
    form = {
      level: PLAN_LEVELS.includes(getLevel()) ? getLevel() : "A1",
      goal: "",
      preferences: "",
      minutes: 20,
      consent: false,
    };
    if (!id) return;
    try {
      const raw = localStorage.getItem(storageKey());
      if (!raw || raw.length > 50000) return;
      const data = JSON.parse(raw);
      saved = validatePlan(data.plan);
      if (saved && Array.isArray(data.completed))
        completed = data.completed.filter(
          (value) =>
            /^\d-\d$/.test(value) &&
            Number(value[0]) < 7 &&
            Number(value[2]) < saved.days[Number(value[0])].activities.length,
        );
    } catch {
      /* Optional local storage; a corrupt plan never breaks learning. */
    }
  }
  function persist() {
    if (!userId()) return;
    try {
      if (saved)
        localStorage.setItem(
          storageKey(),
          JSON.stringify({ plan: saved, completed }),
        );
      else localStorage.removeItem(storageKey());
    } catch {
      /* Browser storage can be disabled. */
    }
  }
  function render() {
    syncUser();
    const total =
      saved?.days.reduce((sum, day) => sum + day.activities.length, 0) || 0;
    return `<div class="plan-page" data-no-i18n><header class="plan-intro"><span class="study-kicker">10QADAM / GEMINI</span><h1>${h("A week shaped around you.")}</h1><p>${h("Tell Gemini your goal, level and daily time. Get seven small steps using words, sentence dictation and revision.")}</p></header>
      <div class="plan-layout"><section class="plan-form-panel"><h2>${h("My study plan")}</h2><form id="study-plan-form" data-plan-form aria-busy="${pending}"><fieldset ${pending ? "disabled" : ""}><div class="plan-form-row"><label>${h("Plan level")}<select name="level">${PLAN_LEVELS.map((level) => `<option value="${level}" ${form.level === level ? "selected" : ""}>${level}</option>`).join("")}</select></label><label>${h("Minutes per day")}<input name="minutes" type="number" min="10" max="90" step="1" required value="${form.minutes}"></label></div>
      <label>${h("Your learning goal")}<input name="goal" maxlength="1000" required value="${escape(form.goal)}" placeholder="${h("For example: understand films and improve spelling")}"></label><label>${h("Your wishes (optional)")}<textarea name="preferences" rows="4" maxlength="1000" placeholder="${h("Topics you enjoy, what feels difficult, how you prefer to learn…")}">${escape(form.preferences)}</textarea></label><p class="plan-note">${h("Do not include passwords, contact details or other sensitive information.")}</p><label class="plan-consent"><input type="checkbox" name="consent" required ${form.consent ? "checked" : ""}><span>${h("I agree to send these goals and wishes, my selected level and study time to Google Gemini to create this plan.")}</span></label><a class="plan-privacy" href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer">${h("Google Gemini privacy")} ↗</a><button class="button dark plan-generate" ${userId() ? 'type="submit"' : 'type="button" data-plan-action="signin"'}>${h(pending ? "Creating your seven steps…" : userId() ? "Create my plan" : "Sign in to create a plan")}</button></fieldset></form><p class="plan-note">${h("Up to 3 generation attempts per UTC day. Failed requests after generation starts count too; a shared site limit also applies.")}</p><div class="plan-message" role="status" aria-live="polite">${error ? h(ERROR_COPY[error] || FAILURE) : pending ? h("Creating your seven steps…") : ""}</div></section>
      <section class="plan-result" aria-label="${h("Your saved week")}">${
        saved
          ? `<div class="plan-result-heading"><span class="study-kicker">${h("Your saved week")} · ${saved.level}</span><h2>${escape(saved.title)}</h2><p>${escape(saved.summary)}</p><span class="plan-progress">${h("Completed activities")}: ${completed.length} / ${total}</span></div><div class="plan-days">${saved.days
              .map(
                (day, dayIndex) =>
                  `<article class="plan-day"><header><span>${h("Day")} ${day.day}</span><h3>${escape(day.title)}</h3></header><ul>${day.activities
                    .map((activity, index) => {
                      const id = `${dayIndex}-${index}`;
                      return `<li class="${completed.includes(id) ? "is-complete" : ""}"><button type="button" class="plan-check" data-plan-action="complete" data-activity="${id}" aria-label="${h("Mark activity complete")}" aria-pressed="${completed.includes(id)}">${completed.includes(id) ? "✓" : ""}</button><div><span class="plan-activity-meta">${h(kindCopy[activity.kind])} · ${activity.minutes} ${h("min")}</span><p>${escape(activity.description)}</p><button type="button" class="plan-practise" data-plan-action="practise" data-activity="${id}" data-kind="${activity.kind}">${h("Practise activity")} ↗</button></div></li>`;
                    })
                    .join("")}</ul></article>`,
              )
              .join(
                "",
              )}</div><div class="plan-footer-actions"><button type="button" class="button dark" data-plan-action="learn">${h("Open learning")} · ${saved.level}</button><button type="button" class="text-link" data-plan-action="remove">${h("Remove saved plan")}</button></div><p class="plan-note">${h("Saved only in this browser for this account. Goals and wishes are not saved.")}</p>`
          : `<div class="plan-empty"><span class="plan-seven" aria-hidden="true">07<span>STEPS</span></span><h2>${h("Your saved week")}</h2><p>${h("AI can make mistakes. This is a practice guide, not a placement result or a promise to reach a CEFR level.")}</p></div>`
      }</section></div>${saved ? `<p class="plan-note plan-disclaimer">${h("AI can make mistakes. This is a practice guide, not a placement result or a promise to reach a CEFR level.")}</p>` : ""}</div>`;
  }
  function input(event) {
    if (!event.target.closest?.("[data-plan-form]")) return false;
    const { name, value, checked } = event.target;
    if (name === "consent") form.consent = checked;
    else if (name === "minutes") form.minutes = Number(value);
    else if (["level", "goal", "preferences"].includes(name))
      form[name] = value;
    return true;
  }
  async function generate() {
    const payload = validatePlanRequest({ ...form, language: language() });
    if (!payload) {
      error = "invalid_request";
      rerender();
      return;
    }
    const id = userId(),
      current = ++generation;
    pending = true;
    error = "";
    request = new AbortController();
    const signal = request.signal;
    rerender();
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("sign_in_required");
      if (current !== generation || id !== userId()) return;
      const response = await fetch("/api/study-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          typeof data.error === "string" ? data.error : "generation_failed",
        );
      const plan = validatePlan(data.plan, payload.level, payload.minutes);
      if (!plan) throw new Error("generation_failed");
      if (current !== generation || id !== userId()) return;
      saved = plan;
      completed = [];
      persist();
    } catch (failure) {
      if (current !== generation || signal.aborted) return;
      error = failure.message;
    } finally {
      if (current === generation && id === userId()) {
        pending = false;
        request = null;
        rerender();
      }
    }
  }
  function submit(event) {
    if (event.target.id !== "study-plan-form") return false;
    event.preventDefault();
    if (!userId()) {
      onSignIn();
      return true;
    }
    if (!pending) void generate();
    return true;
  }
  function click(event) {
    const element = event.target.closest?.("[data-plan-action]");
    if (!element) return false;
    syncUser();
    if (element.dataset.planAction === "signin") {
      onSignIn();
      return true;
    }
    if (!saved) return true;
    const action = element.dataset.planAction;
    if (action === "learn") openLevel(saved.level);
    else if (action === "practise") {
      const id = element.dataset.activity;
      const activity =
        /^\d-\d$/.test(id) &&
        saved.days[Number(id[0])]?.activities[Number(id[2])];
      if (activity) openLevel(saved.level, activity.kind);
    } else if (action === "remove") {
      saved = null;
      completed = [];
      persist();
      rerender();
    } else if (action === "complete") {
      const id = element.dataset.activity;
      if (
        !/^\d-\d$/.test(id) ||
        !saved.days[Number(id[0])]?.activities[Number(id[2])]
      )
        return true;
      completed = completed.includes(id)
        ? completed.filter((value) => value !== id)
        : [...completed, id];
      persist();
      rerender();
    }
    return true;
  }
  function stop() {
    generation++;
    request?.abort();
    request = null;
    pending = false;
  }
  return { render, input, change: input, submit, click, stop };
}
