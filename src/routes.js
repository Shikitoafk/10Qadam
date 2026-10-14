export const LEARNING_LEVELS = ["A1", "A2", "B1", "B2", "C1"];
const pages = {
  "/": "welcome",
  "/arena": "arena",
  "/learn": "study",
  "/words": "words",
  "/leaderboard": "leaders",
  "/profile": "profile",
  "/plan": "plan",
};

export function readRoute(pathname = "/") {
  const path = pathname.replace(/\/+$/, "") || "/";
  const learning = /^\/learn\/(a1|a2|b1|b2|c1)$/i.exec(path);
  if (learning) return { page: "study", level: learning[1].toUpperCase() };
  return { page: pages[path] || "welcome", level: null };
}

export function pagePath(page, level) {
  if (page === "study")
    return LEARNING_LEVELS.includes(level) ? `/learn/${level}` : "/learn";
  return Object.keys(pages).find((path) => pages[path] === page) || "/";
}
