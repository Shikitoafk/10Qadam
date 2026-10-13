import { WORDS } from "./game.js";

// Meanings follow the sense used by the existing A1/A2 word bank.
const meanings = {
  apple: ["A round fruit with red or green skin.", "алма"],
  house: ["A building where people live.", "үй"],
  water: ["The clear liquid we drink.", "су"],
  friend: ["Someone you like and know well.", "дос"],
  school: ["A place where children learn.", "мектеп"],
  family: ["People related to one another.", "отбасы"],
  mother: ["A female parent.", "ана"],
  father: ["A male parent.", "әке"],
  sister: [
    "A girl or woman with the same parents as you.",
    "әпке немесе қарындас",
  ],
  brother: ["A boy or man with the same parents as you.", "аға немесе іні"],
  garden: ["A place where flowers or plants grow.", "бақ"],
  window: ["Glass in a wall that lets light in.", "терезе"],
  yellow: ["The colour of a lemon.", "сары"],
  orange: ["A round fruit with thick orange skin.", "апельсин"],
  purple: ["A colour made by mixing red and blue.", "күлгін"],
  happy: ["Feeling pleased or full of joy.", "бақытты"],
  small: ["Not big in size.", "кішкентай"],
  table: ["Furniture with a flat top for eating or working.", "үстел"],
  chair: ["A seat for one person.", "орындық"],
  bread: ["Food made from flour and baked.", "нан"],
  milk: ["A white drink that comes from cows.", "сүт"],
  coffee: ["A drink made from roasted beans.", "кофе"],
  morning: ["The early part of the day before noon.", "таң"],
  evening: ["The part of the day after afternoon.", "кеш"],
  summer: ["The warmest season of the year.", "жаз"],
  winter: ["The coldest season of the year.", "қыс"],
  flower: ["The colourful part of a plant.", "гүл"],
  animal: ["A living creature such as a cat or dog.", "жануар"],
  rabbit: ["A small animal with long ears.", "үй қояны"],
  people: ["More than one person.", "адамдар"],
  picture: ["A drawing, painting or photograph.", "сурет"],
  teacher: ["Someone who helps others learn.", "мұғалім"],
  student: ["Someone who studies at a school or college.", "оқушы"],
  music: ["Sounds arranged into a tune or song.", "музыка"],
  hello: ["A word used to greet someone.", "сәлем"],
  please: ["A polite word used when asking for something.", "өтінемін"],
  sorry: ["A word used to apologise.", "кешір"],
  beautiful: ["Very nice to look at.", "әдемі"],
  birthday: ["The yearly date when you were born.", "туған күн"],
  kitchen: ["A room where food is cooked.", "асүй"],
  bedroom: ["A room where you sleep.", "жатын бөлме"],
  football: ["A team sport played by kicking a ball.", "футбол"],
  doctor: ["Someone who treats people who are ill.", "дәрігер"],
  sunday: ["The day after Saturday and before Monday.", "жексенбі"],
  today: ["The day we are in now.", "бүгін"],
  tomorrow: ["The day after today.", "ертең"],
  breakfast: ["The first meal of the day.", "таңғы ас"],
  dinner: ["A main meal, often eaten in the evening.", "кешкі ас"],
  chicken: ["A farm bird kept for meat and eggs.", "тауық"],
  country: ["A nation with its own land and government.", "ел"],
  journey: ["A trip from one place to another.", "сапар"],
  weather: ["Conditions outside, such as rain or sunshine.", "ауа райы"],
  neighbour: ["Someone who lives near you.", "көрші"],
  different: ["Not the same as something else.", "өзгеше"],
  important: ["Having great value or meaning.", "маңызды"],
  interesting: ["Making you want to learn or know more.", "қызықты"],
  comfortable: ["Making you feel relaxed and at ease.", "жайлы"],
  expensive: ["Costing a lot of money.", "қымбат"],
  wonderful: ["Extremely good or enjoyable.", "керемет"],
  together: ["With each other or in the same place.", "бірге"],
  remember: ["To keep something in your mind.", "есте сақтау"],
  believe: ["To think that something is true.", "сену"],
  describe: ["To say what someone or something is like.", "сипаттау"],
  improve: ["To make something better.", "жақсарту"],
  decide: ["To choose what to do.", "шешім қабылдау"],
  explain: ["To make something clear or easy to understand.", "түсіндіру"],
  practice: ["Repeated activity to get better at something.", "жаттығу"],
  language: ["Words and rules people use to communicate.", "тіл"],
  message: ["Information sent to someone.", "хабарлама"],
  question: ["Something you ask to get information.", "сұрақ"],
  answer: ["A reply to a question.", "жауап"],
  mistake: ["Something done or said incorrectly.", "қате"],
  hospital: ["A place where sick people receive treatment.", "аурухана"],
  restaurant: ["A place where you pay to eat a meal.", "мейрамхана"],
  supermarket: [
    "A large shop selling food and everyday things.",
    "супермаркет",
  ],
  airport: ["A place where planes arrive and leave.", "әуежай"],
  village: ["A small community of homes in the countryside.", "ауыл"],
  mountain: ["A very high area of land.", "тау"],
  island: ["Land with water all around it.", "арал"],
  holiday: ["A break from school or work.", "демалыс"],
  dangerous: ["Able to hurt someone or cause harm.", "қауіпті"],
  careful: ["Taking care to avoid mistakes or danger.", "сақ"],
  friendly: ["Kind and pleasant towards other people.", "ақжарқын"],
  healthy: ["Well and not ill.", "дені сау"],
  hungry: ["Wanting or needing to eat.", "қарны аш"],
  thirsty: ["Wanting or needing to drink.", "шөлдеген"],
  surprised: ["Feeling that something unexpected has happened.", "таңғалған"],
  excited: [
    "Feeling happy and full of energy about something.",
    "қуаныштан толқыған",
  ],
  borrow: ["To use something and return it later.", "қарызға алу"],
  invite: ["To ask someone to come to a place or event.", "шақыру"],
  arrive: ["To reach a place.", "келіп жету"],
  forget: ["To stop remembering something.", "ұмыту"],
  perhaps: ["Possibly, but not certainly.", "мүмкін"],
  usually: ["Most of the time.", "әдетте"],
  already: ["Before now or before an expected time.", "әлдеқашан"],
  especially: ["More than usual or more than other things.", "әсіресе"],
  experience: ["Knowledge gained by doing or seeing things.", "тәжірибе"],
  information: ["Facts or details about something.", "ақпарат"],
  education: ["Learning through teaching or study.", "білім беру"],
  environment: [
    "The natural world and surroundings we live in.",
    "қоршаған орта",
  ],
};

const russianMeanings = Object.fromEntries(Object.values(WORDS).flat());

export function wordMeaning(word, language = "en") {
  const key = String(word ?? "")
    .trim()
    .toLowerCase();
  const entry = meanings[key];
  if (!entry) return "";
  if (language === "ru") return russianMeanings[key] || "";
  return entry[language === "kk" ? 1 : 0];
}

export function matchesWord(word, query) {
  const search = String(query ?? "")
    .trim()
    .toLowerCase();
  return [
    word,
    ...["en", "kk", "ru"].map((language) => wordMeaning(word, language)),
  ].some((text) =>
    String(text ?? "")
      .toLowerCase()
      .includes(search),
  );
}
