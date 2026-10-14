import { createClient } from "@supabase/supabase-js";
import { validateLearningLevel } from "./account-level.js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
export const isOnlineConfigured = Boolean(supabaseUrl && supabaseKey);
export const isGoogleConfigured =
  isOnlineConfigured && import.meta.env.VITE_AUTH_GOOGLE === "true";
const client = isOnlineConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

function requireClient() {
  if (!client)
    throw new Error("Онлайн пока не подключён. Добавьте настройки Supabase.");
  return client;
}

async function unwrap(promise) {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return data;
}

export async function getSession() {
  if (!client) return null;
  const data = await unwrap(client.auth.getSession());
  return data.session;
}

export async function getAccessToken() {
  const session = await getSession();
  return session?.access_token || null;
}

export function onAuthStateChange(callback) {
  if (!client) return () => {};
  const { data } = client.auth.onAuthStateChange((_event, session) =>
    callback(session),
  );
  return () => data.subscription.unsubscribe();
}

export function signUp(email, password, username, level = "A1") {
  const learningLevel = validateLearningLevel(level);
  return unwrap(
    requireClient().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          username: username.trim(),
          learning_level: learningLevel,
        },
        emailRedirectTo: window.location.origin,
      },
    }),
  );
}

export function updateLearningLevel(level) {
  const learningLevel = validateLearningLevel(level);
  // Supabase merges data into user_metadata; do not resend stale metadata or
  // replace account fields such as username when changing this preference.
  return unwrap(
    requireClient().auth.updateUser({
      data: { learning_level: learningLevel },
    }),
  );
}

export function signIn(email, password) {
  return unwrap(
    requireClient().auth.signInWithPassword({ email: email.trim(), password }),
  );
}

export function signInWithGoogle() {
  return unwrap(
    requireClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    }),
  );
}

export async function signOut() {
  if (!client) return;
  await cancelQueue().catch(() => {});
  await unwrap(client.auth.signOut());
}

export async function getProfile() {
  const session = await getSession();
  if (!session) return null;
  return unwrap(
    requireClient()
      .from("profiles")
      .select(
        "id,username,rating_a1,rating_a2,rating_b1,rating_b2,rating_c1,rating_sentence_a1,rating_sentence_a2,rating_sentence_b1,rating_sentence_b2,rating_sentence_c1,games,wins,games_sentence,wins_sentence,created_at",
      )
      .eq("id", session.user.id)
      .single(),
  );
}

export function updateProfile(username) {
  return unwrap(
    requireClient().rpc("update_player_name", { p_username: username }),
  );
}

export function getLeaderboard(level = "A1", format = "words", limit = 10) {
  validateLearningLevel(level);
  if (!["words", "sentences"].includes(format))
    throw new Error("Invalid battle format");
  return unwrap(
    requireClient()
      .from("profiles")
      .select(
        "id,username,rating_a1,rating_a2,rating_b1,rating_b2,rating_c1,rating_sentence_a1,rating_sentence_a2,rating_sentence_b1,rating_sentence_b2,rating_sentence_c1,games,wins,games_sentence,wins_sentence",
      )
      .gt(format === "sentences" ? "games_sentence" : "games", 0)
      .order(
        `rating_${format === "sentences" ? "sentence_" : ""}${level.toLowerCase()}`,
        { ascending: false },
      )
      .order("username", { ascending: true })
      .limit(Math.max(1, Math.min(100, limit))),
  );
}

export function joinQueue(mode = "duel", level = "A1", format = "words") {
  validateLearningLevel(level);
  if (!["words", "sentences"].includes(format))
    throw new Error("Invalid battle format");
  return unwrap(
    requireClient().rpc("join_matchmaking", {
      p_mode: mode,
      p_level: level,
      p_format: format,
    }),
  );
}

export function cancelQueue() {
  return unwrap(requireClient().rpc("cancel_matchmaking"));
}

export function pollQueue() {
  return unwrap(requireClient().rpc("poll_matchmaking"));
}

export function getMatchState(matchId) {
  return unwrap(
    requireClient().rpc("get_match_state", { p_match_id: matchId }),
  );
}

export function submitAnswer(matchId, roundIndex, answer) {
  return unwrap(
    requireClient().rpc("submit_match_answer", {
      p_match_id: matchId,
      p_round_index: roundIndex,
      p_answer: answer,
    }),
  );
}

export function finishMatch(matchId) {
  return unwrap(requireClient().rpc("finish_match", { p_match_id: matchId }));
}
