export const PLAN_LEVELS = ["A1", "A2", "B1", "B2", "C1"];
export const PLAN_KINDS = ["words", "dictation", "review"];

const boundedText = (value, max) =>
  typeof value === "string" && value.trim().length > 0 && value.length <= max;

export function validatePlanRequest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const { level, language, minutes, goal, preferences, consent } = input;
  if (
    !PLAN_LEVELS.includes(level) ||
    !["en", "kk", "ru"].includes(language) ||
    !Number.isInteger(minutes) ||
    minutes < 10 ||
    minutes > 90 ||
    !boundedText(goal, 1000) ||
    typeof preferences !== "string" ||
    preferences.length > 1000 ||
    consent !== true
  )
    return null;
  return {
    level,
    language,
    minutes,
    goal: goal.trim(),
    preferences: preferences.trim(),
    consent: true,
  };
}

// Revalidate both model responses and untrusted browser-local storage. Return a
// fresh allow-listed object: no markup, links, commands or extra fields execute.
export function validatePlan(input, expectedLevel, dailyMinutes = 90) {
  if (
    !input ||
    typeof input !== "object" ||
    !boundedText(input.title, 160) ||
    !boundedText(input.summary, 700) ||
    !PLAN_LEVELS.includes(input.level) ||
    (expectedLevel && input.level !== expectedLevel) ||
    !Array.isArray(input.days) ||
    input.days.length !== 7
  )
    return null;
  const days = [];
  for (let index = 0; index < 7; index++) {
    const day = input.days[index];
    if (
      !day ||
      day.day !== index + 1 ||
      !boundedText(day.title, 160) ||
      !Array.isArray(day.activities) ||
      day.activities.length < 1 ||
      day.activities.length > 3
    )
      return null;
    const activities = [];
    for (const activity of day.activities) {
      if (
        !activity ||
        !PLAN_KINDS.includes(activity.kind) ||
        !Number.isInteger(activity.minutes) ||
        activity.minutes < 1 ||
        activity.minutes > 90 ||
        !boundedText(activity.description, 600)
      )
        return null;
      activities.push({
        kind: activity.kind,
        minutes: activity.minutes,
        description: activity.description.trim(),
      });
    }
    if (activities.reduce((sum, item) => sum + item.minutes, 0) > dailyMinutes)
      return null;
    days.push({ day: day.day, title: day.title.trim(), activities });
  }
  return {
    title: input.title.trim(),
    summary: input.summary.trim(),
    level: input.level,
    days,
  };
}

export const PLAN_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    level: { type: "string", enum: PLAN_LEVELS },
    days: {
      type: "array",
      minItems: 7,
      maxItems: 7,
      items: {
        type: "object",
        properties: {
          day: { type: "integer", minimum: 1, maximum: 7 },
          title: { type: "string" },
          activities: {
            type: "array",
            minItems: 1,
            maxItems: 3,
            items: {
              type: "object",
              properties: {
                kind: { type: "string", enum: PLAN_KINDS },
                minutes: { type: "integer", minimum: 1, maximum: 90 },
                description: { type: "string" },
              },
              required: ["kind", "minutes", "description"],
              additionalProperties: false,
            },
          },
        },
        required: ["day", "title", "activities"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "summary", "level", "days"],
  additionalProperties: false,
};
