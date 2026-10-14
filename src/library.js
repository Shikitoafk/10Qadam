export const LIBRARY_PAGE_SIZE = 40;

// Search every available meaning, not just the language currently on screen.
export function libraryPage(
  words,
  query = "",
  page = 1,
  pageSize = LIBRARY_PAGE_SIZE,
) {
  const terms = String(query ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
  const filtered = terms.length
    ? words.filter((entry) => {
        const text = [entry.word, entry.en, entry.kk, entry.ru]
          .filter(Boolean)
          .join(" ")
          .normalize("NFKC")
          .toLocaleLowerCase();
        return terms.every((term) => text.includes(term));
      })
    : words;
  const size =
    Number.isFinite(pageSize) && pageSize > 0
      ? Math.floor(pageSize) || LIBRARY_PAGE_SIZE
      : LIBRARY_PAGE_SIZE;
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const current = Number.isFinite(page)
    ? Math.max(1, Math.min(pages, Math.floor(page)))
    : 1;
  const offset = (current - 1) * size;
  return {
    items: filtered.slice(offset, offset + size),
    total: words.length,
    filtered: filtered.length,
    page: current,
    pages,
    start: filtered.length ? offset + 1 : 0,
    end: Math.min(offset + size, filtered.length),
  };
}

export function libraryMeaning(entry, language = "en") {
  const local =
    typeof entry[language] === "string" ? entry[language].trim() : "";
  const english = typeof entry.en === "string" ? entry.en.trim() : "";
  return {
    text: local || english || entry.word,
    fallback: language !== "en" && !local && Boolean(english),
  };
}
