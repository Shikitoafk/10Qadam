export const STORAGE_KEY = "10qadam-studio-v1";
export const WALLPAPERS = ["forest", "dusk", "ocean"];
export const MAX_TASKS = 300;
export const MAX_DECKS = 40;
export const MAX_CARDS = 100;

export function dateKey(date = new Date()) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");
}

export function shiftDay(key, offset) {
  const date = new Date(key + "T12:00:00");
  date.setDate(date.getDate() + offset);
  return dateKey(date);
}

export function weekOf(key) {
  const weekday = new Date(key + "T12:00:00").getDay();
  const monday = shiftDay(key, -((weekday + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => shiftDay(monday, i));
}

function validDate(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    dateKey(new Date(value + "T12:00:00")) === value
  );
}

const SAMPLE = {
  id: "sample",
  name: "Формулы · пример",
  cards: [
    {
      id: "sample-1",
      front: "Площадь треугольника",
      back: "½ × основание × высота",
    },
    { id: "sample-2", front: "Площадь круга", back: "πr²" },
    { id: "sample-3", front: "Второй закон Ньютона", back: "F = ma" },
    { id: "sample-4", front: "Средняя скорость", back: "Путь ÷ время" },
  ],
};
export function initialState() {
  return {
    tasks: [],
    decks: [{ ...SAMPLE, cards: SAMPLE.cards.map((card) => ({ ...card })) }],
    sessions: [],
    wallpaper: "forest",
    minutes: 25,
    timer: null,
  };
}

export function duration(value) {
  const minutes = Number(value);
  return Number.isInteger(minutes) && minutes >= 1 && minutes <= 120
    ? minutes
    : null;
}

export function remaining(timer, now = Date.now()) {
  return timer.end === null ? timer.left : Math.max(0, timer.end - now);
}

export function newTimer(minutes, taskId = null) {
  const valid = duration(minutes);
  if (!valid) return null;
  return { minutes: valid, taskId, end: null, left: valid * 60_000 };
}

export function toggleTimer(timer, now = Date.now()) {
  if (timer.end === null && timer.left > 0)
    return { ...timer, end: now + timer.left };
  return { ...timer, end: null, left: remaining(timer, now) };
}

export function finishTimer(state, now = Date.now()) {
  const timer = state.timer;
  if (!timer || timer.end === null || remaining(timer, now) > 0) return null;
  const session = { day: dateKey(new Date(timer.end)), minutes: timer.minutes };
  state.sessions = [...state.sessions, session].slice(-4000);
  state.timer = null;
  return session;
}

export function streak(sessions, today = dateKey()) {
  const days = new Set(sessions.map((entry) => entry.day));
  let cursor = days.has(today) ? today : shiftDay(today, -1);
  let count = 0;
  while (days.has(cursor)) {
    count++;
    cursor = shiftDay(cursor, -1);
  }
  return { count, today: days.has(today) };
}

export function normalizeAnswer(text) {
  return text
    .trim()
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/\s+/gu, " ");
}

export function shuffle(values, random = Math.random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function gameQuestions(cards, random = Math.random) {
  const options = new Map();
  for (const card of cards) {
    const key = normalizeAnswer(card.back);
    if (key && !options.has(key)) options.set(key, card.back);
  }
  if (options.size < 2) return [];
  return shuffle(cards, random)
    .slice(0, 10)
    .map((card) => {
      const key = normalizeAnswer(card.back);
      const wrong = shuffle(
        [...options].filter(([answer]) => answer !== key),
        random,
      )
        .slice(0, 2)
        .map(([, answer]) => answer);
      const choices = shuffle([card.back, ...wrong], random);
      return {
        front: card.front,
        choices,
        correct: choices.indexOf(card.back),
      };
    });
}

export function canPlay(cards) {
  return (
    new Set(cards.map((card) => normalizeAnswer(card.back)).filter(Boolean))
      .size >= 2
  );
}

export function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );
}

const string = (value, max) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
const id = (value) => typeof value === "string" && /^[\w-]{1,80}$/.test(value);
function unique(records, cap, parse) {
  const result = [];
  const seen = new Set();
  for (const value of Array.isArray(records) ? records.slice(0, cap) : []) {
    const record = parse(value);
    if (record && !seen.has(record.id)) {
      seen.add(record.id);
      result.push(record);
    }
  }
  return result;
}

export function load(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw || raw.length > 5_000_000) return initialState();
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return initialState();
    const tasks = unique(data.tasks, MAX_TASKS, (task) =>
      id(task?.id) && string(task.title, 100) && validDate(task.date)
        ? {
            id: task.id,
            title: string(task.title, 100),
            notes: string(task.notes, 400),
            date: task.date,
            time: /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(task.time)
              ? task.time
              : "",
            done: task.done === true,
          }
        : null,
    );
    const decks = unique(data.decks, MAX_DECKS, (deck) =>
      id(deck?.id) && string(deck.name, 70)
        ? {
            id: deck.id,
            name: string(deck.name, 70),
            cards: unique(deck.cards, MAX_CARDS, (card) =>
              id(card?.id) && string(card.front, 220) && string(card.back, 300)
                ? {
                    id: card.id,
                    front: string(card.front, 220),
                    back: string(card.back, 300),
                  }
                : null,
            ),
          }
        : null,
    );
    const sessions = Array.isArray(data.sessions)
      ? data.sessions
          .slice(-4000)
          .filter((entry) => validDate(entry?.day) && duration(entry.minutes))
          .map(({ day, minutes }) => ({ day, minutes: Number(minutes) }))
      : [];
    const timer = data.timer;
    const validTimer =
      timer &&
      duration(timer.minutes) &&
      Number.isFinite(timer.left) &&
      timer.left > 0 &&
      timer.left <= Number(timer.minutes) * 60_000 &&
      (timer.end === null || (Number.isFinite(timer.end) && timer.end > 0));
    return {
      tasks,
      decks,
      sessions,
      wallpaper: WALLPAPERS.includes(data.wallpaper)
        ? data.wallpaper
        : "forest",
      minutes: duration(data.minutes) || 25,
      timer: validTimer
        ? {
            minutes: Number(timer.minutes),
            left: timer.left,
            end: timer.end,
            taskId: id(timer.taskId) ? timer.taskId : null,
          }
        : null,
    };
  } catch {
    return initialState();
  }
}
