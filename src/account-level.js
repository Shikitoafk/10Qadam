const LEARNING_LEVELS = new Set(["A1", "A2", "B1", "B2", "C1"]);

// This is a user's learning preference, not a verified CEFR or ranked rating.
export function validateLearningLevel(level) {
  if (!LEARNING_LEVELS.has(level)) {
    throw new Error("Choose a learning level from A1 to C1.");
  }
  return level;
}

export function accountLearningLevel(user) {
  const level = user?.user_metadata?.learning_level;
  return LEARNING_LEVELS.has(level) ? level : null;
}
