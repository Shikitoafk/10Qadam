// The existing UI copy is the source catalogue. Translate only text and labels,
// never HTML, user names, submitted answers or English spelling challenges.
import { STUDY_COPY } from "./study-copy.js";
import { LIBRARY_COPY } from "./library-copy.js";
import { ACCOUNT_COPY } from "./account-copy.js";
export const LANGUAGES = ["en", "kk", "ru"];
export const LOCALES = { en: "en-GB", kk: "kk-KZ", ru: "ru-RU" };
export const COPY = {
  ...STUDY_COPY,
  ...LIBRARY_COPY,
  ...ACCOUNT_COPY,
  Арена: ["Arena", "Арена"],
  Рейтинг: ["Leaderboard", "Рейтинг"],
  Словарь: ["Word bank", "Сөздік"],
  "Мой профиль": ["My profile", "Менің профилім"],
  Профиль: ["Profile", "Профиль"],
  Матч: ["Match", "Матч"],
  "Главная навигация": ["Main navigation", "Негізгі мәзір"],
  "10Qadam, главная": ["10Qadam, home", "10Qadam, басты бет"],
  "Логотип 10Qadam": ["10Qadam logo", "10Qadam логотипі"],
  Language: ["Language", "Тіл", "Язык"],
  "Маленькие шаги.": ["Small steps.", "Кішкентай қадамдар."],
  "Большой словарный запас.": ["A bigger vocabulary.", "Бай сөздік қор."],
  "Онлайн доступен": ["Online is ready", "Онлайн қолжетімді"],
  "Тренировка доступна": ["Practice is ready", "Жаттығу қолжетімді"],
  Войти: ["Sign in", "Кіру"],
  Игрок: ["Player", "Ойыншы"],
  Ты: ["You", "Сен"],
  ТЫ: ["YOU", "СЕН"],
  Дуэль: ["Duel", "Дуэль"],
  Баттл: ["Battle", "Баттл"],
  Соло: ["Solo", "Жеке жаттығу"],
  "Один на один": ["One on one", "Бірге-бір"],
  "Каждый за себя": ["Every player for themselves", "Әркім өзі үшін"],
  "В своём темпе": ["At your own pace", "Өз қарқыныңмен"],
  "Ты, соперник и десять слов. Пусть клавиатура скажет всё за тебя.": [
    "You, one opponent and ten words. Let your keyboard do the talking.",
    "Сен, қарсыласың және он сөз. Пернетақтаң бәрін айтсын.",
  ],
  "Четыре игрока. Одна арена. Забери первое место в общем зачёте.": [
    "Four players. One arena. Make the top spot yours.",
    "Төрт ойыншы. Бір арена. Бірінші орынды иелен.",
  ],
  "Разомни пальцы и прокачай spelling. Здесь соперник — твой прошлый результат.":
    [
      "Warm up and sharpen your spelling. Your last score is the one to beat.",
      "Қолыңды жаттықтырып, сөздерді дұрыс жазуды үйрен. Қарсыласың — өзіңнің өткен нәтижең.",
    ],
  "Слушай. Пиши. Становись лучше.": [
    "Listen. Spell. Get better.",
    "Тыңда. Жаз. Дамы.",
  ],
  "Как играть": ["How to play", "Қалай ойнауға болады"],
  "Английский на слух. Баттлы на скорость.": [
    "English by ear. Battles against the clock.",
    "Ағылшынды тыңдап үйрен. Жылдамдыққа жарыс.",
  ],
  "Десять слов, чтобы стать чуть лучше.": [
    "Ten words. One step forward.",
    "Он сөз — алға бір қадам.",
  ],
  "Соревнование по spelling": [
    "English spelling competition",
    "Ағылшын сөздерін дұрыс жазу жарысы",
  ],
  "ТВОЯ СЛЕДУЮЩАЯ ПОБЕДА": ["YOUR NEXT WIN", "КЕЛЕСІ ЖЕҢІСІҢ"],
  "Включай звук.": ["Turn up the sound.", "Дыбысты қос."],
  "Выключай сомнения.": ["Tune out the doubt.", "Күмәнді ұмыт."],
  "Слово прозвучало. Таймер пошёл.": [
    "The word plays. The clock starts.",
    "Сөз айтылды. Уақыт басталды.",
  ],
  "Кто напишет правильно первым?": [
    "Who will spell it right first?",
    "Кім бірінші дұрыс жазады?",
  ],
  "Выйти на арену": ["Enter the arena", "Аренаға шығу"],
  "10 СЛОВ": ["10 WORDS", "10 СӨЗ"],
  "12 СЕК / СЛОВО": ["12 SEC / WORD", "12 СЕК / СӨЗ"],
  "Как играем?": ["Pick your game.", "Қалай ойнаймыз?"],
  "Уровень английского": ["English level", "Ағылшын деңгейі"],
  "Уровень слов": ["Word level", "Сөз деңгейі"],
  ИГРОКА: ["PLAYERS", "ОЙЫНШЫ"],
  "Тренировка без регистрации": [
    "Practice without an account",
    "Тіркелмей жаттығу",
  ],
  "Соперники с близким рейтингом": [
    "Opponents near your rating",
    "Рейтингі жақын қарсыластар",
  ],
  "Проверь механику в демо с ботами": [
    "Try a clearly labelled bot demo",
    "Боттармен демоны байқап көр",
  ],
  "Начать тренировку": ["Start practice", "Жаттығуды бастау"],
  "Найти игру": ["Find a match", "Матч табу"],
  "Попробовать баттл": ["Try a battle", "Баттлды байқап көру"],
  "Три шага к победе": ["Three steps to a win", "Жеңіске үш қадам"],
  Правила: ["Rules", "Ережелер"],
  Слушай: ["Listen", "Тыңда"],
  Пиши: ["Spell", "Жаз"],
  "Забирай очки": ["Score", "Ұпай жина"],
  "Слово звучит на английском.": [
    "Hear the word in English.",
    "Ағылшынша сөзді тыңда.",
  ],
  "Можно послушать ещё раз.": [
    "Replay it if you need to.",
    "Қажет болса, қайта тыңда.",
  ],
  "Введи слово и нажми Enter.": [
    "Type the word and press Enter.",
    "Сөзді жазып, Enter пернесін бас.",
  ],
  "Точность важнее скорости.": [
    "Accuracy comes before speed.",
    "Дұрыстық жылдамдықтан маңызды.",
  ],
  "Правильный ответ — 100 очков.": [
    "A correct answer earns 100 points.",
    "Дұрыс жауапқа 100 ұпай беріледі.",
  ],
  "Скорость — до 50 сверху.": [
    "Speed adds up to 50 more.",
    "Жылдамдыққа тағы 50 ұпайға дейін.",
  ],
  очков: ["points", "ұпай"],
  "Первая тренировка — начало твоей истории. Сделаем первый шаг?": [
    "Your first practice starts your story. Ready for step one?",
    "Алғашқы жаттығу — жолыңның басы. Бірінші қадамды жасаймыз ба?",
  ],
  "В соло": ["Go solo", "Жеке жаттығу"],
  Таблица: ["The", "Үздіктер"],
  "лидеров.": ["leaderboard.", "тізімі."],
  "Правильные слова. Заслуженные победы.": [
    "Correct words. Well-earned wins.",
    "Дұрыс сөздер. Лайықты жеңістер.",
  ],
  МЕСТО: ["RANK", "ОРЫН"],
  ИГРОК: ["PLAYER", "ОЙЫНШЫ"],
  РЕЙТИНГ: ["RATING", "РЕЙТИНГ"],
  "Загружаем рейтинг…": ["Loading the leaderboard…", "Рейтинг жүктелуде…"],
  "Лидеры ещё не появились": [
    "The leaderboard is waiting",
    "Үздіктер әзірге жоқ",
  ],
  "Здесь будут настоящие игроки": [
    "Real players will appear here",
    "Мұнда нақты ойыншылар болады",
  ],
  "Заверши первый рейтинговый матч и займи своё место.": [
    "Finish your first ranked match and claim your place.",
    "Алғашқы рейтингтік матчты аяқтап, өз орныңды иелен.",
  ],
  "Таблица заработает после подключения Supabase. А пока можно поставить личный рекорд в соло.":
    [
      "Online rankings need Supabase. Set a solo personal best in the meantime.",
      "Онлайн рейтингке Supabase қажет. Әзірге жеке жаттығуда рекорд орнат.",
    ],
  "Играть соло": ["Play solo", "Жеке ойнау"],
  Твой: ["Your", "Сенің"],
  "словарь.": ["word bank.", "сөздігің."],
  "Послушай, запомни, попробуй в игре.": [
    "Listen, remember, put it into play.",
    "Тыңда, есте сақта, ойында қолдан.",
  ],
  "Найти слово или перевод…": [
    "Search a word or meaning…",
    "Сөзді не аударманы іздеу…",
  ],
  "Поиск слов": ["Search words", "Сөздерді іздеу"],
  "Уровни A1/A2 обозначают учебные подборки. Написание слов — британский английский.":
    [
      "A1/A2 are beginner practice collections. Words use British English spelling.",
      "A1/A2 — оқу сөздерінің жинақтары. Сөздер британдық ағылшын емлесімен жазылады.",
    ],
  "Такого слова пока нет в подборке.": [
    "No matching words in this collection.",
    "Бұл жинақта ондай сөз жоқ.",
  ],
  "Каждый шаг": ["Every step", "Әр қадам"],
  "считается.": ["counts.", "маңызды."],
  "Твои тренировки, результаты и рост.": [
    "Your practice, progress and personal bests.",
    "Жаттығуларың, нәтижелерің және дамуың.",
  ],
  "Гость арены": ["Arena guest", "Арена қонағы"],
  "Твой путь к новому уровню": [
    "Your path to the next level",
    "Жаңа деңгейге апарар жолың",
  ],
  "Соло доступно без аккаунта. Для рейтинга — войди.": [
    "Solo needs no account. Sign in to play ranked.",
    "Жеке жаттығуға аккаунт қажет емес. Рейтинг үшін кір.",
  ],
  Выйти: ["Sign out", "Шығу"],
  "Создать аккаунт": ["Create account", "Аккаунт ашу"],
  "Дуэли и баттлы": ["Duels and battles", "Дуэльдер мен баттлдар"],
  "ЛИЧНЫЙ РЕКОРД": ["PERSONAL BEST", "ЖЕКЕ РЕКОРД"],
  "Соло на этом устройстве": [
    "Solo on this device",
    "Осы құрылғыдағы жеке жаттығу",
  ],
  "Последние тренировки": ["Recent practice", "Соңғы жаттығулар"],
  "Ещё одну": ["One more", "Тағы біреу"],
  верно: ["correct", "дұрыс"],
  "Чистый лист — хороший старт": [
    "A fresh start looks good on you",
    "Жаңа бастау — жақсы мүмкіндік",
  ],
  "Заверши тренировку, и здесь появится первый результат.": [
    "Finish a practice session to see your first result here.",
    "Жаттығуды аяқтасаң, алғашқы нәтижең осында көрінеді.",
  ],
  Закрыть: ["Close", "Жабу"],
  "Слушай. Пиши.": ["Listen. Spell.", "Тыңда. Жаз."],
  "Побеждай.": ["Win.", "Жең."],
  "В матче 10 слов. На каждое — 12 секунд. В онлайне все участники получают одинаковую последовательность.":
    [
      "Ten words per match, 12 seconds per word. Online players hear the same sequence.",
      "Матчта 10 сөз бар. Әр сөзге 12 секунд беріледі. Онлайнда бәріне бірдей сөздер айтылады.",
    ],
  "Слушай слово, вводи ответ и нажимай Enter. Повторное прослушивание не останавливает таймер.":
    [
      "Listen, type your answer and press Enter. Replaying the audio does not pause the timer.",
      "Сөзді тыңда, жауапты жазып, Enter пернесін бас. Қайта тыңдау уақытты тоқтатпайды.",
    ],
  "Правильное слово даёт 100 очков. Чем быстрее ответ, тем больше бонус — до 50 очков.":
    [
      "A correct word earns 100 points. Faster answers add a bonus of up to 50 points.",
      "Дұрыс сөзге 100 ұпай беріледі. Жылдам жауапқа тағы 50 ұпайға дейін қосылады.",
    ],
  "Одна попытка на слово. Регистр букв не важен. Побеждает тот, у кого больше верных слов. При равной точности решают очки за скорость; полный равный результат — ничья.":
    [
      "One attempt per word; letter case does not matter. Most correct words wins, then speed points break ties. Equal results are a draw.",
      "Әр сөзге бір мүмкіндік. Бас не кіші әріп маңызды емес. Дұрыс сөзі көп ойыншы жеңеді; тең болса, жылдамдық ұпайы шешеді. Толық тең нәтиже — тең ойын.",
    ],
  "A1 и A2 имеют отдельный рейтинг. В соло и демо рейтинг не меняется.": [
    "A1 and A2 have separate ratings. Solo and demos never change your rating.",
    "A1 мен A2 рейтингі бөлек. Жеке жаттығу мен демода рейтинг өзгермейді.",
  ],
  "Понятно, погнали": ["Got it. Let's play", "Түсінікті, бастайық"],
  "Твой первый шаг.": ["Your first step.", "Алғашқы қадамың."],
  "Снова на арену.": ["Back to the arena.", "Аренаға қайта орал."],
  "Войди, чтобы соревноваться и сохранять рейтинг.": [
    "Sign in to compete and keep your rating.",
    "Жарысып, рейтингіңді сақтау үшін кір.",
  ],
  "Регистрация будет доступна после подключения Supabase. Соло и демо уже работают.":
    [
      "Registration needs Supabase. Solo and demos are ready to play.",
      "Тіркелу үшін Supabase қажет. Жеке жаттығу мен демо дайын.",
    ],
  "Продолжить с Google": ["Continue with Google", "Google арқылы жалғастыру"],
  "или через почту": ["or with email", "немесе email арқылы"],
  Никнейм: ["Username", "Лақап ат"],
  "Например, wordhunter": ["For example, wordhunter", "Мысалы, wordhunter"],
  Пароль: ["Password", "Құпиясөз"],
  "Не менее 8 символов": ["At least 8 characters", "Кемінде 8 таңба"],
  "Уже есть аккаунт?": ["Already have an account?", "Аккаунтың бар ма?"],
  "Первый раз здесь?": ["New here?", "Алғаш рет келдің бе?"],
  Зарегистрироваться: ["Sign up", "Тіркелу"],
  "Онлайн требует собственного проекта Supabase. Код регистрации, матчей и рейтинга уже подготовлен.":
    [
      "Online play needs a Supabase project. Registration, matchmaking and ratings are ready to connect.",
      "Онлайн ойнауға Supabase жобасы қажет. Тіркелу, матчтар және рейтинг дайын.",
    ],
  "Пока сыграть соло": ["Play solo for now", "Әзірге жеке ойнау"],
  Разминка: ["Warm up", "Дайындал"],
  "перед онлайном.": ["before going online.", "онлайн ойын алдында."],
  "Это демо. Соперники — боты, результат не влияет на рейтинг.": [
    "This is a demo with bots. Your rating will not change.",
    "Бұл — боттармен демо. Нәтиже рейтингке әсер етпейді.",
  ],
  "Играть с ботами": ["Play with bots", "Боттармен ойнау"],
  "Или тренироваться соло": ["Or practise solo", "Немесе жеке жаттығу"],
  "Проверь почту": ["Check your email", "Поштаңды тексер"],
  "Подтверди email по ссылке в письме, затем вернись и войди.": [
    "Confirm your email using the link in your inbox, then come back and sign in.",
    "Хаттағы сілтеме арқылы email-ді раста, содан кейін қайта келіп кір.",
  ],
  "Ты в игре. Добро пожаловать!": [
    "You're in. Welcome to 10Qadam!",
    "Ойынға қосылдың. Қош келдің!",
  ],
  "Браузер не поддерживает озвучку. Попробуй Chrome или Edge.": [
    "Audio is not supported in this browser. Try Chrome or Edge.",
    "Браузер дыбыстық оқуды қолдамайды. Chrome немесе Edge қолданып көр.",
  ],
  "Не удалось озвучить слово. Проверь звук и английский голос в браузере.": [
    "Could not play the word. Check your sound and browser's English voice.",
    "Сөзді дыбыстау мүмкін болмады. Дыбысты және ағылшын дауысын тексер.",
  ],
  "Установи английский голос в настройках устройства или попробуй другой браузер.":
    [
      "Install an English voice in your device settings, or try another browser.",
      "Құрылғы баптауынан ағылшын дауысын орнат немесе басқа браузерді байқап көр.",
    ],
  "Матч не найден.": ["Match not found.", "Матч табылмады."],
  "Покинуть матч": ["Leave match", "Матчтан шығу"],
  "ДЕМО С БОТАМИ": ["BOT DEMO", "БОТТАРМЕН ДЕМО"],
  ТРЕНИРОВКА: ["PRACTICE", "ЖАТТЫҒУ"],
  "РЕЙТИНГОВЫЙ МАТЧ": ["RANKED MATCH", "РЕЙТИНГТІК МАТЧ"],
  "Сейчас начнём": ["Starting soon", "Қазір бастаймыз"],
  "ПАЛЬЦЫ НА КЛАВИАТУРЕ": ["FINGERS ON THE KEYS", "ПЕРНЕТАҚТАҒА ДАЙЫНДАЛ"],
  "Включи звук. Первое слово уже близко.": [
    "Sound on. Your first word is on its way.",
    "Дыбысты қос. Алғашқы сөз жақында айтылады.",
  ],
  ОСТАЛОСЬ: ["TIME LEFT", "ҚАЛҒАН УАҚЫТ"],
  с: ["s", "с"],
  "Послушать слово ещё раз": ["Replay the word", "Сөзді қайта тыңдау"],
  "Послушать слово": ["Hear the word", "Сөзді тыңдау"],
  "Нажми для повторения": ["Tap to replay", "Қайта тыңдау үшін бас"],
  "ЧТО ТЫ УСЛЫШАЛ?": ["WHAT DID YOU HEAR?", "ҚАНДАЙ СӨЗ ЕСТІДІҢ?"],
  "Напиши слово…": ["Spell the word…", "Сөзді жаз…"],
  "Отправить ответ": ["Submit answer", "Жауапты жіберу"],
  "Ответ принят. Ждём следующее слово.": [
    "Answer received. Next word coming up.",
    "Жауап қабылданды. Келесі сөзді күтеміз.",
  ],
  "Enter — отправить ответ · Одна попытка": [
    "Enter to submit · One attempt",
    "Enter — жауапты жіберу · Бір мүмкіндік",
  ],
  "Английский · UK": ["English audio", "Ағылшынша дыбыс"],
  "Точность + скорость": ["Accuracy + speed", "Дұрыстық + жылдамдық"],
  "НА АРЕНЕ": ["IN THE ARENA", "АРЕНАДА"],
  "Твой результат": ["Your score", "Сенің нәтижең"],
  "Счёт матча": ["Match scores", "Матч ұпайлары"],
  "ДЕМО-БОТ": ["DEMO BOT", "ДЕМО-БОТ"],
  "ЭТО ТЫ": ["YOU", "БҰЛ СЕН"],
  "Каждая буква важна.": ["Every letter counts.", "Әр әріп маңызды."],
  "100 очков за верное слово.": [
    "100 points for a correct word.",
    "Дұрыс сөзге 100 ұпай.",
  ],
  "До 50 сверху за скорость.": [
    "Up to 50 extra for speed.",
    "Жылдамдыққа тағы 50 ұпайға дейін.",
  ],
  "Верных ответов": ["Correct answers", "Дұрыс жауаптар"],
  "Вводи слово вручную — это spelling!": [
    "Type it yourself — that's the spelling challenge!",
    "Сөзді өзің жаз — бұл дұрыс жазу жарысы!",
  ],
  "В этот раз не получилось. Следующее слово — новый шанс.": [
    "Not this time. The next word is a fresh chance.",
    "Бұл жолы болмады. Келесі сөз — жаңа мүмкіндік.",
  ],
  "Проверяем статус ответа…": [
    "Checking your answer status…",
    "Жауаптың күйін тексеріп жатырмыз…",
  ],
  "Ещё на шаг вперёд.": ["One more step forward.", "Алға тағы бір қадам."],
  "Твоё слово победило.": ["Your words won.", "Сенің сөздерің жеңді."],
  "Хороший матч. Ещё один?": [
    "Good game. One more?",
    "Жақсы ойын. Тағы біреу ме?",
  ],
  "Разбор слов": ["Word review", "Сөздерді талдау"],
  "нет ответа": ["no answer", "жауап жоқ"],
  "Твой ответ:": ["Your answer:", "Сенің жауабың:"],
  "10Qadam — English spelling arena": [
    "10Qadam — English spelling arena",
    "10Qadam — ағылшын сөздерінің аренасы",
    "10Qadam — арена английских слов",
  ],
  "Listen, spell and compete. English A1/A2 practice, duels and four-player battles.":
    [
      "Listen, spell and compete. English A1/A2 practice, duels and four-player battles.",
      "Тыңда, жаз және жарыс. A1/A2 ағылшын сөздері, жеке жаттығу, дуэль және төрт ойыншы баттлы.",
      "Слушай, пиши и соревнуйся. Английский A1/A2, тренировки, дуэли и баттлы на четверых.",
    ],
  "ДЕМО ЗАВЕРШЕНО": ["DEMO COMPLETE", "ДЕМО АЯҚТАЛДЫ"],
  "МАТЧ ЗАВЕРШЁН": ["MATCH COMPLETE", "МАТЧ АЯҚТАЛДЫ"],
  "Ошибки — это слова, которые ты скоро запомнишь.": [
    "Today's mistakes are tomorrow's familiar words.",
    "Бүгінгі қате сөздерді ертең есте сақтайсың.",
  ],
  "Боты не влияют на твой рейтинг": [
    "Bots don't affect your rating",
    "Боттар рейтингіңе әсер етпейді",
  ],
  "Рейтинг обновлён по результату матча": [
    "Your rating reflects this match",
    "Рейтингің матч нәтижесімен жаңарды",
  ],
  ОЧКИ: ["POINTS", "ҰПАЙ"],
  "ВЕРНЫЕ СЛОВА": ["CORRECT WORDS", "ДҰРЫС СӨЗДЕР"],
  ТОЧНОСТЬ: ["ACCURACY", "ДҰРЫСТЫҚ"],
  "Ещё один матч": ["Play again", "Тағы бір матч"],
  "На главную": ["Back to home", "Басты бетке"],
  "Выйти из матча?": ["Leave this match?", "Матчтан шығасың ба?"],
  "Текущая попытка не сохранится. Можно начать заново в любой момент.": [
    "This attempt won't be saved. You can start again any time.",
    "Бұл нәтиже сақталмайды. Кез келген уақытта қайта бастай аласың.",
  ],
  "Матч продолжится. Уже отправленные ответы сохранятся, а пропущенные слова не принесут очков.":
    [
      "The match continues. Submitted answers stay saved; missed words earn no points.",
      "Матч жалғасады. Жіберілген жауаптар сақталады, ал өткізіп алған сөздерге ұпай берілмейді.",
    ],
  "Продолжить играть": ["Keep playing", "Ойынды жалғастыру"],
  "Ищем твоего": ["Finding your", "Саған лайық"],
  "соперника.": ["opponent.", "қарсылас іздеудеміз."],
  "Подбираем игроков с близким рейтингом.": [
    "Matching players with similar ratings.",
    "Рейтингі жақын ойыншыларды іздейміз.",
  ],
  "Отменить поиск": ["Cancel search", "Іздеуді тоқтату"],
  "Поиск остановлен после потери связи. Нажми «Играть», чтобы начать снова.": [
    "Search stopped after losing connection. Start a new search when you're ready.",
    "Байланыс үзілгендіктен іздеу тоқтады. Дайын болсаң, іздеуді қайта баста.",
  ],
  "Сначала войдите в аккаунт": ["Sign in first", "Алдымен аккаунтқа кір"],
  "Имя должно быть от 2 до 24 символов": [
    "Your name must be 2–24 characters",
    "Атың 2–24 таңбадан тұруы керек",
  ],
  "Неизвестный режим или уровень": [
    "Unknown mode or level",
    "Белгісіз режим не деңгей",
  ],
  "Профиль не найден": ["Profile not found", "Профиль табылмады"],
  "Нет доступа к матчу": [
    "You don't have access to this match",
    "Бұл матчқа қолжетімділігің жоқ",
  ],
  "Время ответа истекло": [
    "Time for this answer has expired",
    "Жауап беру уақыты аяқталды",
  ],
  "Введите слово": ["Enter a word", "Сөзді жаз"],
  "Ответ уже отправлен": ["Answer already submitted", "Жауап жіберілген"],
  "Матч еще не завершен": [
    "The match is not finished yet",
    "Матч әлі аяқталған жоқ",
  ],
  "Invalid login credentials": [
    "Email or password is incorrect",
    "Email не құпиясөз қате",
    "Неверный email или пароль",
  ],
  "Email not confirmed": [
    "Confirm your email before signing in",
    "Кіру алдында email-ді раста",
    "Подтверди почту перед входом",
  ],
  "User already registered": [
    "An account with this email already exists",
    "Бұл email-мен аккаунт тіркелген",
    "Аккаунт с этой почтой уже существует",
  ],
  "Email rate limit exceeded": [
    "Too many email requests. Please try again later.",
    "Хат сұраулары тым көп. Кейінірек қайталап көр.",
    "Слишком много запросов писем. Попробуй позже.",
  ],
  "Failed to fetch": [
    "Connection failed. Check your internet and retry.",
    "Байланыс үзілді. Интернетті тексеріп, қайталап көр.",
    "Нет связи. Проверь интернет и попробуй снова.",
  ],
  "THE SPELLING ARENA": [
    "THE SPELLING ARENA",
    "СӨЗ АРЕНАСЫ",
    "АРЕНА АНГЛИЙСКИХ СЛОВ",
  ],
  PLAYGROUND: ["PLAYGROUND", "ОЙЫН АЛАҢЫ", "ИГРОВАЯ ПЛОЩАДКА"],
  "MADE FOR YOUR NEXT LEVEL ↗": [
    "MADE FOR YOUR NEXT LEVEL ↗",
    "КЕЛЕСІ ДЕҢГЕЙІҢ ҮШІН ↗",
    "ШАГ К НОВОМУ УРОВНЮ ↗",
  ],
  LISTEN: ["LISTEN", "ТЫҢДА", "СЛУШАЙ"],
  TYPE: ["TYPE", "ЖАЗ", "ПИШИ"],
  WIN: ["WIN", "ЖЕҢ", "ПОБЕЖДАЙ"],
  "EVERY LETTER COUNTS": [
    "EVERY LETTER COUNTS",
    "ӘР ӘРІП МАҢЫЗДЫ",
    "КАЖДАЯ БУКВА ВАЖНА",
  ],
  "THAT'S CORRECT.": ["THAT'S CORRECT.", "ДҰРЫС!", "ВЕРНО!"],
  "+100 accuracy   +42 speed": [
    "+100 accuracy · +42 speed",
    "+100 дұрыстық · +42 жылдамдық",
    "+100 точность · +42 скорость",
  ],
  "PICK YOUR BATTLE": ["PICK YOUR BATTLE", "ОЙЫНДЫ ТАҢДА", "ВЫБЕРИ СВОЙ РЕЖИМ"],
  "1 VS 1": ["1 VS 1", "1 ДЕ 1", "1 НА 1"],
  "FREE FOR ALL": ["FREE FOR ALL", "ӘРКІМ ӨЗІ ҮШІН", "КАЖДЫЙ ЗА СЕБЯ"],
  PRACTICE: ["PRACTICE", "ЖАТТЫҒУ", "ТРЕНИРОВКА"],
  "YOUR PERSONAL BEST": [
    "YOUR PERSONAL BEST",
    "СЕНІҢ ЖЕКЕ РЕКОРДЫҢ",
    "ТВОЙ ЛИЧНЫЙ РЕКОРД",
  ],
  "THE SPELLING CLUB": [
    "THE SPELLING CLUB",
    "СӨЗ ШЕБЕРЛЕРІ",
    "КЛУБ ЗНАТОКОВ СЛОВ",
  ],
  "ONE WORD AT A TIME": [
    "ONE WORD AT A TIME",
    "БІРТІНДЕП ҮЙРЕН",
    "СЛОВО ЗА СЛОВОМ",
  ],
  "YOUR NEXT LEVEL": [
    "YOUR NEXT LEVEL",
    "СЕНІҢ КЕЛЕСІ ДЕҢГЕЙІҢ",
    "ТВОЙ НОВЫЙ УРОВЕНЬ",
  ],
  "THE RULES ARE SIMPLE": [
    "THE RULES ARE SIMPLE",
    "ЕРЕЖЕЛЕР ОҢАЙ",
    "ПРАВИЛА ПРОСТЫ",
  ],
  "WELCOME TO THE CLUB": [
    "WELCOME TO THE CLUB",
    "ҚОШ КЕЛДІҢ",
    "ДОБРО ПОЖАЛОВАТЬ",
  ],
  "TRY THE ARENA": ["TRY THE ARENA", "АРЕНАНЫ БАЙҚАП КӨР", "ПОПРОБУЙ АРЕНУ"],
  "TAKE A BREATH": ["TAKE A BREATH", "ДЕМАЛЫП АЛ", "ПЕРЕДОХНИ"],
  "FINDING YOUR MATCH": ["FINDING YOUR MATCH", "МАТЧ ІЗДЕУ", "ПОИСК МАТЧА"],
};

const dynamicCopy = [
  [/^Рейтинг (A[12])$/, (m, l) => `${t("Рейтинг", l)} ${m[1]}`],
  [/^РЕЙТИНГ (A[12])$/, (m, l) => `${t("РЕЙТИНГ", l)} ${m[1]}`],
  [
    /^(\d+) слов · (A[12])$/,
    (m, l) => `${m[1]} ${l === "en" ? "words" : "сөз"} · ${m[2]}`,
  ],
  [
    /^Ты уже завершил (\d+) тренировок\. Следующий рекорд рядом\.$/,
    (m, l) =>
      l === "en"
        ? `${m[1]} practice ${m[1] === "1" ? "session" : "sessions"} complete. Your next best is waiting.`
        : `${m[1]} жаттығу аяқталды. Келесі рекорд жақын.`,
  ],
  [
    /^Слово (\d+) \/ 10$/,
    (m, l) => `${l === "en" ? "Word" : "Сөз"} ${m[1]} / 10`,
  ],
  [/^ИГРОК (\d+)$/, (m, l) => `${t("ИГРОК", l)} ${m[1]}`],
  [
    /^Послушать (.+)$/,
    (m, l) => `${l === "en" ? "Listen to" : "Тыңдау:"} ${m[1]}`,
  ],
  [
    /^Верно! \+(\d+) очков$/,
    (m, l) =>
      l === "en" ? `Correct! +${m[1]} points` : `Дұрыс! +${m[1]} ұпай`,
  ],
  [
    /^(Правильно:|Время вышло:) (.+)$/,
    (m, l) =>
      `${l === "en" ? (m[1] === "Правильно:" ? "Correct spelling:" : "Time's up:") : m[1] === "Правильно:" ? "Дұрыс жазылуы:" : "Уақыт аяқталды:"} ${m[2]}`,
  ],
  [
    /^(\d+) для повторения$/,
    (m, l) => `${m[1]} ${l === "en" ? "to practise" : "сөзді қайталау керек"}`,
  ],
  [/^Соло · (A[12])$/, (m, l) => `${t("Соло", l)} · ${m[1]}`],
  [/^(Дуэль|Баттл|Соло) · (A[12])$/, (m, l) => `${t(m[1], l)} · ${m[2]}`],
  [
    /^(ДЕМО С БОТАМИ|ТРЕНИРОВКА|РЕЙТИНГОВЫЙ МАТЧ|ДЕМО ЗАВЕРШЕНО|МАТЧ ЗАВЕРШЁН) ·?$/,
    (m, l) => `${t(m[1], l)}${m[0].endsWith("·") ? " ·" : ""}`,
  ],
  [
    /^(ДЕМО ЗАВЕРШЕНО|МАТЧ ЗАВЕРШЁН) · (A[12])$/,
    (m, l) => `${t(m[1], l)} · ${m[2]}`,
  ],
  [
    /^(\d+) место · (.+)$/,
    (m, l) =>
      `${l === "en" ? `Place ${m[1]}` : `${m[1]}-орын`} · ${t(m[2], l)}`,
  ],
  [
    /^верно · (\d+) очков( · [+-]?\d+ рейтинга)?$/,
    (m, l) =>
      `${t("верно", l)} · ${m[1]} ${t("очков", l)}${m[2] ? ` · ${m[2].match(/[+-]?\d+/)[0]} ${l === "en" ? "rating" : "рейтинг"}` : ""}`,
  ],
  [
    /^· Твой ответ: (.+)$/,
    (m, l) =>
      `· ${l === "en" ? "Your answer:" : "Сенің жауабың:"} ${t(m[1], l)}`,
  ],
  [
    /^(Не удалось подключиться:|Связь с матчем:) (.+)$/,
    (m, l) => `${l === "en" ? "Connection:" : "Байланыс:"} ${t(m[2], l)}`,
  ],
  [
    /^Настоящие соперники появятся после подключения Supabase\. Сейчас можно попробовать (баттл на четверых|дуэль) с ботами\.$/,
    (m, l) =>
      l === "en"
        ? `Real opponents need Supabase. Try a ${m[1] === "дуэль" ? "duel" : "four-player battle"} with bots for now.`
        : `Нақты қарсыластарға Supabase қажет. Әзірге боттармен ${m[1] === "дуэль" ? "дуэльді" : "төрт ойыншы баттлын"} байқап көр.`,
  ],
];

export function t(source, language = "en") {
  const lang = LANGUAGES.includes(language) ? language : "en";
  const value = String(source ?? "");
  const key = value.trim();
  const entry = COPY[key];
  let translation = entry
    ? (entry[lang === "en" ? 0 : lang === "kk" ? 1 : 2] ?? key)
    : key;
  if (!entry && lang !== "ru") {
    for (const [pattern, format] of dynamicCopy) {
      const match = key.match(pattern);
      if (match) {
        translation = format(match, lang);
        break;
      }
    }
  }
  return value.replace(key, translation);
}

export function loadLanguage(storage = globalThis.localStorage) {
  try {
    const saved = storage?.getItem("10qadam-language");
    return LANGUAGES.includes(saved) ? saved : "en";
  } catch {
    return "en";
  }
}
export function saveLanguage(language, storage = globalThis.localStorage) {
  if (!LANGUAGES.includes(language)) return;
  try {
    storage?.setItem("10qadam-language", language);
  } catch {
    /* Optional storage. */
  }
}

export function localize(root, language) {
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, 4);
  let node;
  while ((node = walker.nextNode())) {
    if (!node.parentElement?.closest("[data-no-i18n],svg,script,style"))
      node.textContent = t(node.textContent, language);
  }
  for (const element of [root, ...root.querySelectorAll("*")]) {
    if (element.closest?.("[data-no-i18n]")) continue;
    for (const attribute of ["aria-label", "placeholder", "title"]) {
      if (element.hasAttribute?.(attribute))
        element.setAttribute(
          attribute,
          t(element.getAttribute(attribute), language),
        );
    }
  }
}

export function slogan(language = "en") {
  return language === "kk"
    ? ["Äripten sözge,", "sözden jeñiske!"]
    : ["Spell Your Way,", "Step by Step."];
}
