import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { t } from "../src/i18n.js";
import {
  battleRules,
  matchRules,
  battleAccuracy,
  scoreSentenceBattle,
  makeSentenceBattleDeck,
  sentenceCompare,
  sentencePlace,
} from "../src/sentence-battle.js";

// Exercise the production asynchronous handlers with delayed RPCs, without a
// browser, a Supabase account or copies of the application logic.
const source = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
function productionFunction(name) {
  const start = new RegExp(`^(?:async )?function ${name}\\(`, "m").exec(source);
  assert.ok(start, `Production handler ${name} exists`);
  const rest = source.slice(start.index + start[0].length);
  const next = /^(?:async )?function \w+\(/m.exec(rest);
  return source.slice(
    start.index,
    next
      ? start.index + start[0].length + next.index
      : source.lastIndexOf("initialize();"),
  );
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function harness(functions, online = {}) {
  const input = {
    value: "apple",
    disabled: false,
    focus() {},
    toggleAttribute(name, enabled) {
      this[name] = enabled;
    },
  };
  const button = {
    disabled: false,
    toggleAttribute(name, enabled) {
      this[name] = enabled;
    },
  };
  const feedback = { className: "", textContent: "" };
  const context = {
    t,
    battleRules,
    matchRules,
    battleAccuracy,
    scoreSentenceBattle,
    makeSentenceBattleDeck,
    sentenceCompare,
    sentencePlace,
    study: { stop() {} },
    syncRoute() {},
    online,
    state: {
      mode: "duel",
      format: "words",
      level: "A1",
      page: "arena",
      user: { id: "self" },
      match: null,
    },
    modes: { duel: { name: "Дуэль" }, four: { name: "Баттл" } },
    queueActive: false,
    queueGeneration: 0,
    queueTimer: null,
    pollTimer: null,
    gameTimer: null,
    dialog: null,
    Date,
    renders: 0,
    cleared: [],
    messages: [],
    timers: new Map(),
    nextTimer: 0,
    document: {
      querySelector(selector) {
        return selector === "#answer"
          ? input
          : selector === "#answer-form button"
            ? button
            : selector === "#answer-feedback"
              ? feedback
              : null;
      },
      querySelectorAll: () => [],
    },
    setInterval(callback) {
      const id = ++context.nextTimer;
      context.timers.set(id, callback);
      return id;
    },
    clearInterval(id) {
      context.cleared.push(id);
      context.timers.delete(id);
    },
    closeModal() {
      context.dialog = null;
    },
    modal() {
      context.dialog = {
        querySelector: () => ({ remove() {} }),
        addEventListener() {},
      };
    },
    stopGame() {
      context.state.match = null;
    },
    render() {
      context.renders++;
    },
    toast(message) {
      context.messages.push(message);
    },
    speak() {},
    tickOnline() {},
    refreshUser: async () => {},
    offerLearningLevel() {},
    initialRoute: { level: null },
    pollMatch: async () => {},
    startOnline() {},
    cancelQueue() {},
  };
  vm.createContext(context);
  for (const name of functions)
    vm.runInContext(productionFunction(name), context);
  return { context, input, button };
}
function matchState(overrides = {}) {
  const now = Date.now();
  return {
    id: "old",
    mode: "duel",
    level: "A1",
    status: "playing",
    round_index: 0,
    starts_at: new Date(now - 1000).toISOString(),
    ends_at: new Date(now + 119000).toISOString(),
    server_now: new Date(now).toISOString(),
    challenge: { index: 0, word: "apple" },
    players: [
      {
        id: "self",
        username: "Player",
        score: 0,
        correct: 0,
        answered_current: false,
      },
    ],
    ...overrides,
  };
}

test("initial auth refresh does not replace a practice game started during loading", async () => {
  const auth = deferred();
  const { context: c } = harness(["initialize"], {
    isOnlineConfigured: true,
    onAuthStateChange() {},
  });
  c.refreshUser = () => auth.promise;
  const loading = c.initialize();
  assert.equal(c.renders, 1, "the arena is available without waiting for auth");
  c.state.page = "game";
  auth.resolve();
  await loading;
  assert.equal(
    c.renders,
    1,
    "a live answer input is not recreated by late auth",
  );
});

test("completed results still render when refreshing the profile fails", async () => {
  const { context: c } = harness(["pollMatch"], {
    getMatchState: async () => matchState({ status: "finished" }),
    finishMatch: async () => ({ results: [], answers: [] }),
  });
  c.state.match = { id: "old", local: false, finished: false };
  c.refreshUser = async () => {
    throw new Error("Profile unavailable");
  };
  await c.pollMatch();
  assert.equal(c.state.match.finished, true);
  assert.equal(c.renders, 1);
  assert.equal(c.messages.length, 1);
});

test("expired matchmaking queue exits search instead of waiting forever", async () => {
  const { context: c } = harness(["startQueue"], {
    joinQueue: async () => ({ status: "waiting" }),
    pollQueue: async () => ({ status: "idle" }),
  });
  await c.startQueue();
  const timer = c.queueTimer;
  await c.timers.get(timer)();
  assert.equal(c.queueActive, false);
  assert.equal(c.dialog, null);
  assert.ok(c.cleared.includes(timer));
  assert.ok(c.messages.length > 0);
});

test("rejected old queue poll cannot cancel a newer search", async () => {
  const oldPoll = deferred();
  const { context: c } = harness(["startQueue", "cancelQueue"], {
    joinQueue: async () => ({ status: "waiting" }),
    pollQueue: () => oldPoll.promise,
    cancelQueue: async () => {},
  });
  await c.startQueue();
  const pendingTick = c.timers.get(c.queueTimer)();
  await c.cancelQueue();
  await c.startQueue();
  const newTimer = c.queueTimer,
    newDialog = c.dialog;
  oldPoll.reject(new Error("old request failed"));
  await pendingTick;
  assert.equal(c.queueActive, true);
  assert.equal(c.dialog, newDialog);
  assert.ok(!c.cleared.includes(newTimer));
});

test("finishing a left match does not stop a newly started game", async () => {
  const final = deferred(),
    started = deferred();
  const { context: c } = harness(["pollMatch"], {
    getMatchState: async () => matchState({ status: "finished" }),
    finishMatch: () => {
      started.resolve();
      return final.promise;
    },
  });
  c.state.match = { id: "old", local: false, finished: false };
  const pending = c.pollMatch();
  await started.promise;
  const newMatch = { id: "new", local: true, finished: false };
  c.state.match = newMatch;
  c.pollTimer = 200;
  c.gameTimer = 201;
  final.resolve({ results: [], answers: [] });
  await pending;
  assert.equal(c.state.match, newMatch);
  assert.ok(!c.cleared.includes(200));
  assert.ok(!c.cleared.includes(201));
  assert.equal(c.renders, 0);
});

test("failed initial request for a left match cannot overwrite a new game", async () => {
  const initial = deferred(),
    started = deferred();
  const { context: c } = harness(["startOnline"]);
  c.pollMatch = () => {
    started.resolve();
    return initial.promise;
  };
  const pending = c.startOnline("old");
  await started.promise;
  const newMatch = { id: "new", local: true, finished: false };
  c.state.match = newMatch;
  c.state.page = "game";
  initial.reject(new Error("old request failed"));
  await pending;
  assert.equal(c.state.match, newMatch);
  assert.equal(c.state.page, "game");
});

test("old answer completion keeps the next round submission marked pending", async () => {
  const first = deferred(),
    second = deferred();
  const { context: c, input } = harness(["submitCurrent"], {
    submitAnswer: (_id, index) =>
      index === 0 ? first.promise : second.promise,
  });
  const match = { id: "old", local: false, index: 0, answered: false };
  c.state.match = match;
  const pendingFirst = c.submitCurrent();
  match.index = 1;
  match.answered = false;
  input.disabled = false;
  const pendingSecond = c.submitCurrent();
  first.resolve({ correct: true, points: 145 });
  await pendingFirst;
  assert.equal(match.submitting, 1);
  second.resolve({ correct: true, points: 145 });
  await pendingSecond;
});

test("older state response cannot reopen a successfully submitted answer", async () => {
  const snapshot = deferred(),
    started = deferred();
  const {
    context: c,
    input,
    button,
  } = harness(["submitCurrent", "pollMatch"], {
    getMatchState: () => {
      started.resolve();
      return snapshot.promise;
    },
    submitAnswer: async () => ({ correct: true, points: 145 }),
  });
  const match = {
    id: "old",
    local: false,
    index: 0,
    answered: false,
    finished: false,
  };
  c.state.match = match;
  const pendingPoll = c.pollMatch();
  await started.promise;
  await c.submitCurrent();
  snapshot.resolve(matchState());
  await pendingPoll;
  assert.equal(match.answered, true);
  assert.equal(input.disabled, true);
  assert.equal(button.disabled, true);
});

test("sentence protocol restores five 35-second rounds independently from the arena selection", async () => {
  const { context: c } = harness(["pollMatch"], {
    getMatchState: async () =>
      matchState({
        format: "sentences",
        round_count: 5,
        round_seconds: 35,
        challenge: { word: "We should listen carefully." },
      }),
  });
  c.state.match = { id: "old", local: false, index: -1 };
  await c.pollMatch();
  assert.equal(c.state.match.format, "sentences");
  assert.equal(c.state.match.roundCount, 5);
  assert.equal(c.state.match.roundSeconds, 35);
  assert.equal(c.state.match.currentWord, "We should listen carefully.");
});

test("production sentence timer and progress use the current match duration, not twelve seconds", () => {
  const { context: c } = harness(["updateTimer", "tickOnline"]);
  const seconds = {},
    listen = {},
    fill = { style: {}, classList: { toggle() {} } };
  c.document.querySelector = (selector) =>
    selector === "#seconds"
      ? seconds
      : selector === "#time-track-fill"
        ? fill
        : selector === '[data-action="listen"]'
          ? listen
          : null;
  c.state.match = {
    format: "sentences",
    index: 1,
    starts: Date.now(),
    roundSeconds: 35,
    roundCount: 5,
  };
  c.updateTimer(17500);
  assert.equal(fill.style.width, "50%");
  assert.equal(seconds.innerHTML, "17.5<span>s</span>");
  assert.equal(listen.disabled, false);
  c.updateTimer(0);
  assert.equal(listen.disabled, true);
  const now = Date.now();
  c.Date = { now: () => now };
  c.state.match.starts = now - 50000;
  c.tickOnline();
  assert.equal(seconds.innerHTML, "20.0<span>s</span>");
});

test("production local sentence rounds finish at five and use 35-second deadlines", () => {
  const { context: c } = harness(["nextLocalRound", "tickLocal"]);
  c.performance = { now: () => 1000 };
  c.state.match = {
    local: true,
    format: "sentences",
    index: -1,
    deck: makeSentenceBattleDeck("C1", () => 0),
    finished: false,
  };
  c.nextLocalRound();
  assert.equal(c.state.match.deadline, 36000);
  assert.ok(c.state.match.currentWord.length > 15);
  const answers = [];
  c.recordLocalAnswer = (...args) => answers.push(args);
  c.performance.now = () => 36000;
  c.updateTimer = () => {};
  c.tickLocal();
  assert.deepEqual(answers, [["", 35000]]);
  let finished = false;
  c.finishLocal = () => {
    finished = true;
  };
  c.state.match.index = 4;
  c.nextLocalRound();
  assert.equal(finished, true);
  assert.equal(c.state.match.index, 5);
});

test("production sentence submission displays partial accuracy instead of marking it simply wrong", async () => {
  const { context: c } = harness(["submitCurrent"], {
    submitAnswer: async () => ({ correct: false, points: 78, accuracy: 78 }),
  });
  c.state.language = "en";
  c.state.match = {
    id: "old",
    format: "sentences",
    local: false,
    index: 0,
    answered: false,
  };
  await c.submitCurrent();
  assert.equal(c.state.match.acceptedIndex, 0);
  assert.match(
    c.document.querySelector("#answer-feedback").textContent,
    /Accuracy: 78%/,
  );
});
