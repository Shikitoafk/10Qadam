export const ROUND_COUNT = 10;
export const ROUND_SECONDS = 12;
export const WORDS = {
  A1: [
    ["apple", "яблоко"],
    ["house", "дом"],
    ["water", "вода"],
    ["friend", "друг"],
    ["school", "школа"],
    ["family", "семья"],
    ["mother", "мама"],
    ["father", "папа"],
    ["sister", "сестра"],
    ["brother", "брат"],
    ["garden", "сад"],
    ["window", "окно"],
    ["yellow", "жёлтый"],
    ["orange", "апельсин"],
    ["purple", "фиолетовый"],
    ["happy", "счастливый"],
    ["small", "маленький"],
    ["table", "стол"],
    ["chair", "стул"],
    ["bread", "хлеб"],
    ["milk", "молоко"],
    ["coffee", "кофе"],
    ["morning", "утро"],
    ["evening", "вечер"],
    ["summer", "лето"],
    ["winter", "зима"],
    ["flower", "цветок"],
    ["animal", "животное"],
    ["rabbit", "кролик"],
    ["people", "люди"],
    ["picture", "картинка"],
    ["teacher", "учитель"],
    ["student", "ученик"],
    ["music", "музыка"],
    ["hello", "привет"],
    ["please", "пожалуйста"],
    ["sorry", "извини"],
    ["beautiful", "красивый"],
    ["birthday", "день рождения"],
    ["kitchen", "кухня"],
    ["bedroom", "спальня"],
    ["football", "футбол"],
    ["doctor", "врач"],
    ["sunday", "воскресенье"],
    ["today", "сегодня"],
    ["tomorrow", "завтра"],
    ["breakfast", "завтрак"],
    ["dinner", "ужин"],
    ["chicken", "курица"],
    ["country", "страна"],
  ],
  A2: [
    ["journey", "путешествие"],
    ["weather", "погода"],
    ["neighbour", "сосед"],
    ["different", "другой"],
    ["important", "важный"],
    ["interesting", "интересный"],
    ["comfortable", "удобный"],
    ["expensive", "дорогой"],
    ["wonderful", "замечательный"],
    ["together", "вместе"],
    ["remember", "помнить"],
    ["believe", "верить"],
    ["describe", "описывать"],
    ["improve", "улучшать"],
    ["decide", "решать"],
    ["explain", "объяснять"],
    ["practice", "практика"],
    ["language", "язык"],
    ["message", "сообщение"],
    ["question", "вопрос"],
    ["answer", "ответ"],
    ["mistake", "ошибка"],
    ["hospital", "больница"],
    ["restaurant", "ресторан"],
    ["supermarket", "супермаркет"],
    ["airport", "аэропорт"],
    ["village", "деревня"],
    ["mountain", "гора"],
    ["island", "остров"],
    ["holiday", "каникулы"],
    ["dangerous", "опасный"],
    ["careful", "осторожный"],
    ["friendly", "дружелюбный"],
    ["healthy", "здоровый"],
    ["hungry", "голодный"],
    ["thirsty", "испытывающий жажду"],
    ["surprised", "удивлённый"],
    ["excited", "взволнованный"],
    ["borrow", "брать взаймы"],
    ["invite", "приглашать"],
    ["arrive", "прибывать"],
    ["forget", "забывать"],
    ["perhaps", "возможно"],
    ["usually", "обычно"],
    ["already", "уже"],
    ["especially", "особенно"],
    ["experience", "опыт"],
    ["information", "информация"],
    ["education", "образование"],
    ["environment", "окружающая среда"],
  ],
};
export function normalizeAnswer(value) {
  return String(value).trim().toLowerCase();
}
export function scoreAnswer(answer, target, elapsedMs) {
  const correct = normalizeAnswer(answer) === normalizeAnswer(target);
  const elapsed = Math.max(0, Number(elapsedMs) || 0);
  return {
    correct,
    points:
      correct && elapsed <= ROUND_SECONDS * 1000
        ? 100 +
          Math.max(0, Math.floor(50 * (1 - elapsed / (ROUND_SECONDS * 1000))))
        : 0,
  };
}
export function makeDeck(level, random = Math.random) {
  const items = [...(WORDS[level] || WORDS.A1)];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items
    .slice(0, ROUND_COUNT)
    .map(([word, translation]) => ({ word, translation }));
}
export function comparePlayers(a, b) {
  return (b.correct || 0) - (a.correct || 0) || (b.score || 0) - (a.score || 0);
}
export function playerPlace(player, players) {
  return 1 + players.filter((p) => comparePlayers(p, player) < 0).length;
}
export function loadPractice() {
  try {
    const data = JSON.parse(
      localStorage.getItem("spell-arena-practice") || "[]",
    );
    return Array.isArray(data)
      ? data.filter((x) => x && typeof x.score === "number").slice(0, 30)
      : [];
  } catch {
    return [];
  }
}
export function savePractice(result) {
  try {
    localStorage.setItem(
      "spell-arena-practice",
      JSON.stringify(
        [
          { ...result, date: new Date().toISOString() },
          ...loadPractice(),
        ].slice(0, 30),
      ),
    );
  } catch {
    /* Storage is optional. */
  }
}
