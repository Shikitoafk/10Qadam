import { sentenceDeck, compareDictation } from "./study.js";

export const BATTLE_FORMATS = ["words", "sentences"];
export function battleRules(format = "words") {
  return format === "sentences"
    ? { format, roundCount: 5, roundSeconds: 35, answerLength: 500 }
    : { format: "words", roundCount: 10, roundSeconds: 12, answerLength: 64 };
}
export function matchRules(match) {
  const base = battleRules(match?.format);
  return {
    ...base,
    roundCount:
      Number.isInteger(match?.roundCount) && match.roundCount > 0
        ? match.roundCount
        : base.roundCount,
    roundSeconds:
      Number.isFinite(match?.roundSeconds) && match.roundSeconds > 0
        ? match.roundSeconds
        : base.roundSeconds,
  };
}
export function ratingColumn(level, format = "words") {
  return `rating_${format === "sentences" ? "sentence_" : ""}${level.toLowerCase()}`;
}
export function makeSentenceBattleDeck(level, random = Math.random) {
  return sentenceDeck(level, random, 5).map((entry) => ({
    ...entry,
    word: entry.text,
  }));
}
export function scoreSentenceBattle(
  answer,
  target,
  elapsedMs,
  roundSeconds = 35,
) {
  const result = compareDictation(String(answer ?? "").slice(0, 500), target);
  const expired =
    !Number.isFinite(elapsedMs) || elapsedMs >= roundSeconds * 1000;
  const accuracy =
    expired || !String(answer ?? "").trim() ? 0 : result.accuracy;
  return { ...result, accuracy, correct: accuracy === 100, points: accuracy };
}
export function battleAccuracy(player, match) {
  const rules = matchRules(match);
  return rules.format === "sentences"
    ? Math.round((Number(player?.score || 0) / rules.roundCount) * 10) / 10
    : Math.round((Number(player?.correct || 0) / rules.roundCount) * 100);
}
export function sentenceCompare(a, b) {
  return Number(b.score || 0) - Number(a.score || 0);
}
export function sentencePlace(player, players) {
  return (
    1 +
    players.filter((p) => Number(p.score || 0) > Number(player.score || 0))
      .length
  );
}

export function battleRemaining(match, now) {
  if (!match || match.finished || match.index < 0) return 0;
  const deadline = match.local
    ? match.deadline
    : match.starts + (match.index + 1) * matchRules(match).roundSeconds * 1000;
  return Math.max(0, deadline - now);
}
