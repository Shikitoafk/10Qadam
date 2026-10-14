import { WORDS } from "./game.js";
import { wordMeaning } from "./vocabulary.js";

export const STUDY_LEVELS = ["A1", "A2", "B1", "B2", "C1"];
export const DICTATION_SECONDS = 35;
export const DICTATION_ROUNDS = 5;

// Original, short listening prompts. Translations are revealed after an answer.
export const SENTENCES = {
  A1: [
    {
      id: "a1-01",
      text: "My sister likes yellow flowers.",
      kk: "Менің әпкем сары гүлдерді ұнатады.",
      ru: "Моя сестра любит жёлтые цветы.",
    },
    {
      id: "a1-02",
      text: "There is a rabbit in the garden.",
      kk: "Бақта қоян бар.",
      ru: "В саду есть кролик.",
    },
    {
      id: "a1-03",
      text: "We have breakfast at seven.",
      kk: "Біз сағат жетіде таңғы ас ішеміз.",
      ru: "Мы завтракаем в семь.",
    },
    {
      id: "a1-04",
      text: "Please open the small window.",
      kk: "Кішкентай терезені ашыңызшы.",
      ru: "Пожалуйста, откройте маленькое окно.",
    },
    {
      id: "a1-05",
      text: "My father is a teacher.",
      kk: "Менің әкем — мұғалім.",
      ru: "Мой папа — учитель.",
    },
    {
      id: "a1-06",
      text: "The water is on the table.",
      kk: "Су үстелдің үстінде тұр.",
      ru: "Вода стоит на столе.",
    },
    {
      id: "a1-07",
      text: "I play football with my brother.",
      kk: "Мен ініммен футбол ойнаймын.",
      ru: "Я играю в футбол с братом.",
    },
    {
      id: "a1-08",
      text: "Our house has a blue door.",
      kk: "Біздің үйдің есігі көк.",
      ru: "У нашего дома синяя дверь.",
    },
    {
      id: "a1-09",
      text: "She drinks milk every morning.",
      kk: "Ол күн сайын таңертең сүт ішеді.",
      ru: "Она пьёт молоко каждое утро.",
    },
    {
      id: "a1-10",
      text: "Today is my friend's birthday.",
      kk: "Бүгін менің досымның туған күні.",
      ru: "Сегодня день рождения моего друга.",
    },
    {
      id: "a1-11",
      text: "The children are happy at school.",
      kk: "Балалар мектепте қуанышты.",
      ru: "Дети рады быть в школе.",
    },
    {
      id: "a1-12",
      text: "I can't find my orange bag.",
      kk: "Мен қызғылт сары сөмкемді таба алмай жүрмін.",
      ru: "Я не могу найти свою оранжевую сумку.",
    },
  ],
  A2: [
    {
      id: "a2-01",
      text: "We usually walk to the supermarket together.",
      kk: "Біз әдетте супермаркетке бірге жаяу барамыз.",
      ru: "Мы обычно ходим в супермаркет вместе.",
    },
    {
      id: "a2-02",
      text: "The weather was wonderful during our holiday.",
      kk: "Демалыс кезінде ауа райы тамаша болды.",
      ru: "Во время нашего отпуска была чудесная погода.",
    },
    {
      id: "a2-03",
      text: "Could you explain the question again?",
      kk: "Сұрақты тағы бір рет түсіндіріп бере аласыз ба?",
      ru: "Не могли бы вы ещё раз объяснить вопрос?",
    },
    {
      id: "a2-04",
      text: "My neighbour invited us to dinner yesterday.",
      kk: "Көршім кеше бізді кешкі асқа шақырды.",
      ru: "Вчера мой сосед пригласил нас на ужин.",
    },
    {
      id: "a2-05",
      text: "This restaurant is cheaper than the other one.",
      kk: "Бұл мейрамхана екіншісіне қарағанда арзанырақ.",
      ru: "Этот ресторан дешевле другого.",
    },
    {
      id: "a2-06",
      text: "Don't forget to bring a bottle of water.",
      kk: "Бір бөтелке су алып келуді ұмытпа.",
      ru: "Не забудь принести бутылку воды.",
    },
    {
      id: "a2-07",
      text: "She has already finished her homework.",
      kk: "Ол үй тапсырмасын орындап қойды.",
      ru: "Она уже закончила домашнюю работу.",
    },
    {
      id: "a2-08",
      text: "We decided to visit the village next weekend.",
      kk: "Біз келесі демалыста ауылға баруды шештік.",
      ru: "Мы решили поехать в деревню в следующие выходные.",
    },
    {
      id: "a2-09",
      text: "Learning a language takes time and practice.",
      kk: "Тіл үйрену үшін уақыт пен жаттығу қажет.",
      ru: "Изучение языка требует времени и практики.",
    },
    {
      id: "a2-10",
      text: "Please send me a message when you arrive.",
      kk: "Келген кезде маған хабарлама жіберші.",
      ru: "Пожалуйста, отправь мне сообщение, когда приедешь.",
    },
    {
      id: "a2-11",
      text: "The journey was long but very interesting.",
      kk: "Сапар ұзақ, бірақ өте қызықты болды.",
      ru: "Путешествие было долгим, но очень интересным.",
    },
    {
      id: "a2-12",
      text: "I borrowed an interesting book from my friend.",
      kk: "Мен досымнан қызықты кітап алдым.",
      ru: "Я взял у друга интересную книгу.",
    },
  ],
};

// Longer prompts introduce clauses and more abstract vocabulary progressively.
SENTENCES.B1 = [
  [
    "Although it was raining, we continued our walk through the park.",
    "Жаңбыр жауып тұрса да, біз саябақта серуендеуді жалғастырдық.",
    "Хотя шёл дождь, мы продолжили прогулку по парку.",
  ],
  [
    "She has been learning English since she moved to the city.",
    "Ол қалаға көшкеннен бері ағылшын тілін үйреніп жүр.",
    "Она учит английский с тех пор, как переехала в город.",
  ],
  [
    "If you practise regularly, your confidence will gradually improve.",
    "Үнемі жаттықсаң, өзіңе деген сенімің біртіндеп артады.",
    "Если регулярно заниматься, уверенность в себе постепенно вырастет.",
  ],
  [
    "The teacher suggested a different way to solve the problem.",
    "Мұғалім мәселені шешудің басқа жолын ұсынды.",
    "Учитель предложил другой способ решить проблему.",
  ],
  [
    "I would rather travel by train than spend hours at the airport.",
    "Әуежайда сағаттап отырғанша, пойызбен саяхаттағанды жөн көремін.",
    "Я предпочёл бы ехать поездом, а не проводить часы в аэропорту.",
  ],
  [
    "We were surprised by how friendly everyone was in the village.",
    "Ауылдағы адамдардың бәрінің сондай мейірімді болғанына таңғалдық.",
    "Нас удивило, насколько дружелюбными были все в деревне.",
  ],
  [
    "Before making a choice, think about what matters most to you.",
    "Таңдау жасамас бұрын, өзің үшін ең маңыздысы не екенін ойлан.",
    "Прежде чем сделать выбор, подумай, что для тебя важнее всего.",
  ],
  [
    "The book that you recommended helped me understand the subject.",
    "Сен ұсынған кітап маған тақырыпты түсінуге көмектесті.",
    "Книга, которую ты посоветовал, помогла мне понять тему.",
  ],
  [
    "He missed the bus because he had forgotten to set his alarm.",
    "Ол оятқышын қоюды ұмытқандықтан, автобусқа үлгермеді.",
    "Он опоздал на автобус, потому что забыл поставить будильник.",
  ],
  [
    "Taking short breaks can help you concentrate for longer.",
    "Қысқа үзілістер жасау зейінді ұзағырақ сақтауға көмектеседі.",
    "Короткие перерывы помогают дольше сохранять концентрацию.",
  ],
  [
    "We need to find a solution that works for the whole team.",
    "Бүкіл командаға қолайлы шешім табуымыз керек.",
    "Нам нужно найти решение, которое подойдёт всей команде.",
  ],
  [
    "This opportunity has given me a chance to develop new skills.",
    "Бұл мүмкіндік маған жаңа дағдыларды дамытуға жол ашты.",
    "Эта возможность позволила мне развить новые навыки.",
  ],
].map(([text, kk, ru], index) => ({
  id: `b1-${String(index + 1).padStart(2, "0")}`,
  text,
  kk,
  ru,
}));

SENTENCES.B2 = [
  [
    "Despite the initial difficulties, the project turned out to be a success.",
    "Бастапқы қиындықтарға қарамастан, жоба сәтті аяқталды.",
    "Несмотря на первоначальные трудности, проект оказался успешным.",
  ],
  [
    "The decision was based on evidence rather than personal assumptions.",
    "Шешім жеке болжамдарға емес, дәлелдерге негізделді.",
    "Решение основывалось на доказательствах, а не на личных предположениях.",
  ],
  [
    "Had we left a little earlier, we would have avoided the traffic.",
    "Сәл ертерек шыққанымызда, кептеліске тап болмас едік.",
    "Если бы мы выехали немного раньше, то избежали бы пробок.",
  ],
  [
    "It is essential to consider the consequences before introducing major changes.",
    "Елеулі өзгерістер енгізбес бұрын, олардың салдарын ескеру қажет.",
    "Перед серьёзными изменениями крайне важно учесть их последствия.",
  ],
  [
    "She managed to maintain a positive attitude throughout the competition.",
    "Ол жарыс бойы оң көзқарасын сақтай алды.",
    "Ей удалось сохранить позитивный настрой на протяжении всего соревнования.",
  ],
  [
    "The proposal sounds promising, but we should examine it more carefully.",
    "Ұсыныс үміт күттіреді, бірақ оны мұқият қарастыруымыз керек.",
    "Предложение звучит многообещающе, но нам следует изучить его внимательнее.",
  ],
  [
    "Working with people from different backgrounds can broaden your perspective.",
    "Түрлі ортадан шыққан адамдармен жұмыс істеу дүниетанымыңды кеңейте алады.",
    "Работа с людьми из разных сред может расширить твой кругозор.",
  ],
  [
    "Even though resources were limited, the team delivered an efficient solution.",
    "Ресурстар шектеулі болса да, команда тиімді шешім ұсынды.",
    "Хотя ресурсы были ограничены, команда предложила эффективное решение.",
  ],
  [
    "The report emphasises the importance of sustainable development in growing cities.",
    "Есепте өсіп келе жатқан қалалар үшін тұрақты дамудың маңызы атап көрсетілген.",
    "В отчёте подчёркивается важность устойчивого развития растущих городов.",
  ],
  [
    "You are unlikely to make progress unless you are willing to accept feedback.",
    "Кері байланысты қабылдауға дайын болмасаң, ілгерілеуің екіталай.",
    "Ты вряд ли добьёшься прогресса, если не готов принимать обратную связь.",
  ],
  [
    "What impressed me most was their ability to adapt to unexpected circumstances.",
    "Мені ең қатты таңғалдырғаны — олардың күтпеген жағдайларға бейімделу қабілеті.",
    "Больше всего меня впечатлила их способность приспосабливаться к неожиданным обстоятельствам.",
  ],
  [
    "The task was challenging; nevertheless, everyone agreed it was worth the effort.",
    "Тапсырма күрделі болды, дегенмен бәрі оның жұмсалған күшке тұратынымен келісті.",
    "Задание было сложным; тем не менее все согласились, что оно стоило усилий.",
  ],
].map(([text, kk, ru], index) => ({
  id: `b2-${String(index + 1).padStart(2, "0")}`,
  text,
  kk,
  ru,
}));

SENTENCES.C1 = [
  [
    "The ambiguity of the original statement gave rise to several conflicting interpretations.",
    "Бастапқы тұжырымның екіұштылығы бір-біріне қайшы бірнеше түсіндірмеге себеп болды.",
    "Неоднозначность первоначального высказывания породила несколько противоречащих друг другу толкований.",
  ],
  [
    "Only after scrutinising the data did the researchers identify a substantial discrepancy.",
    "Деректерді мұқият тексергеннен кейін ғана зерттеушілер елеулі сәйкессіздікті анықтады.",
    "Лишь тщательно изучив данные, исследователи обнаружили существенное расхождение.",
  ],
  [
    "Her meticulous preparation enabled her to respond convincingly to even the most challenging questions.",
    "Оның ұқыпты дайындығы тіпті ең күрделі сұрақтарға да нанымды жауап беруіне мүмкіндік берді.",
    "Её тщательная подготовка позволила убедительно ответить даже на самые сложные вопросы.",
  ],
  [
    "While the proposal is theoretically feasible, its practical implications remain uncertain.",
    "Ұсыныс теориялық тұрғыдан іске асатын болса да, оның іс жүзіндегі салдары әлі белгісіз.",
    "Хотя предложение теоретически осуществимо, его практические последствия остаются неясными.",
  ],
  [
    "The committee acknowledged the inherent limitations of relying solely on preliminary findings.",
    "Комитет тек алдын ала қорытындыларға сүйенудің өзіне тән шектеулері бар екенін мойындады.",
    "Комитет признал ограничения, неизбежные при опоре исключительно на предварительные выводы.",
  ],
  [
    "A comprehensive understanding of the issue requires attention to its less obvious nuances.",
    "Мәселені жан-жақты түсіну үшін оның бірден байқалмайтын қырларына назар аудару қажет.",
    "Всестороннее понимание вопроса требует внимания к его менее очевидным нюансам.",
  ],
  [
    "Notwithstanding their differences, both approaches rest on the same implicit assumption.",
    "Айырмашылықтарына қарамастан, екі тәсіл де бір жасырын болжамға сүйенеді.",
    "Несмотря на различия, оба подхода опираются на одно и то же неявное предположение.",
  ],
  [
    "What initially appeared to be an isolated incident revealed a far more pervasive problem.",
    "Алғашында жеке оқиға болып көрінген жағдай әлдеқайда кең таралған мәселені ашып көрсетті.",
    "То, что сначала казалось единичным случаем, выявило гораздо более распространённую проблему.",
  ],
  [
    "The organisation remained resilient despite facing an unprecedented series of setbacks.",
    "Бұрын-соңды болмаған бірқатар сәтсіздікке қарамастан, ұйым төзімділігін сақтады.",
    "Организация сохранила устойчивость, несмотря на беспрецедентную череду неудач.",
  ],
  [
    "Rather than dismissing the criticism, she incorporated it into a more coherent argument.",
    "Сынды жоққа шығарудың орнына, ол оны анағұрлым қисынды дәлелге біріктірді.",
    "Вместо того чтобы отвергнуть критику, она включила её в более последовательную аргументацию.",
  ],
  [
    "Any tentative conclusion should be treated with caution until independent evidence becomes available.",
    "Тәуелсіз дәлелдер пайда болғанша, кез келген алдын ала қорытындыға сақтықпен қарау керек.",
    "К любому предварительному выводу следует относиться осторожно, пока не появятся независимые доказательства.",
  ],
  [
    "The compelling account challenged our assumptions without oversimplifying the complexity of the situation.",
    "Нанымды баяндау жағдайдың күрделілігін шамадан тыс жеңілдетпей, біздің болжамдарымызға күмән келтірді.",
    "Убедительное изложение поставило под сомнение наши предположения, не упрощая чрезмерно сложность ситуации.",
  ],
].map(([text, kk, ru], index) => ({
  id: `c1-${String(index + 1).padStart(2, "0")}`,
  text,
  kk,
  ru,
}));

const advancedWords = {
  B1: [
    [
      "achieve",
      "To succeed in doing something through effort.",
      "қол жеткізу",
      "достигать",
    ],
    [
      "although",
      "Despite the fact that something is true.",
      "дегенмен; ... болса да",
      "хотя",
    ],
    [
      "behaviour",
      "The way someone acts in a situation.",
      "мінез-құлық",
      "поведение",
    ],
    [
      "challenge",
      "Something difficult that tests your ability.",
      "қиын міндет",
      "сложная задача",
    ],
    ["choice", "An act of selecting between possibilities.", "таңдау", "выбор"],
    [
      "confidence",
      "A belief in your own ability.",
      "өзіне деген сенім",
      "уверенность в себе",
    ],
    [
      "develop",
      "To grow or become more advanced.",
      "даму; дамыту",
      "развивать; развиваться",
    ],
    ["effort", "The energy you use to do something.", "күш-жігер", "усилие"],
    [
      "progress",
      "Movement towards a better or more advanced state.",
      "ілгерілеу",
      "прогресс",
    ],
    [
      "opportunity",
      "A situation that makes something possible.",
      "мүмкіндік",
      "возможность",
    ],
    ["purpose", "The reason why something is done.", "мақсат", "цель"],
    [
      "reliable",
      "Able to be trusted to do what is expected.",
      "сенімді",
      "надёжный",
    ],
    [
      "require",
      "To need something or make it necessary.",
      "қажет ету",
      "требовать",
    ],
    [
      "responsible",
      "Having a duty to take care of something.",
      "жауапты",
      "ответственный",
    ],
    [
      "result",
      "Something that happens because of an action.",
      "нәтиже",
      "результат",
    ],
    [
      "support",
      "To help someone or something succeed.",
      "қолдау",
      "поддерживать",
    ],
    [
      "successful",
      "Having achieved the result you wanted.",
      "табысты",
      "успешный",
    ],
    [
      "suggest",
      "To offer an idea for someone to consider.",
      "ұсыну",
      "предлагать",
    ],
    ["solution", "A way to solve a problem.", "шешім", "решение"],
    [
      "advantage",
      "Something that makes a situation more favourable.",
      "артықшылық",
      "преимущество",
    ],
  ],
  B2: [
    [
      "consequence",
      "A result of a particular action or situation.",
      "салдар",
      "последствие",
    ],
    [
      "nevertheless",
      "Despite something that has just been mentioned.",
      "соған қарамастан",
      "тем не менее",
    ],
    [
      "assumption",
      "Something accepted as true without proof.",
      "болжам",
      "предположение",
    ],
    ["approach", "A way of dealing with a task or problem.", "тәсіл", "подход"],
    [
      "awareness",
      "Knowledge that something exists or is happening.",
      "хабардарлық",
      "осведомлённость",
    ],
    [
      "beneficial",
      "Having a helpful or positive effect.",
      "пайдалы",
      "благотворный; полезный",
    ],
    [
      "circumstance",
      "A fact or condition affecting a situation.",
      "жағдай",
      "обстоятельство",
    ],
    [
      "considerable",
      "Large enough to be important or noticeable.",
      "едәуір",
      "значительный",
    ],
    [
      "contribute",
      "To give something that helps a shared purpose.",
      "үлес қосу",
      "вносить вклад",
    ],
    [
      "crucial",
      "Extremely important to the outcome of something.",
      "шешуші",
      "решающий",
    ],
    [
      "demonstrate",
      "To show clearly how something works or is true.",
      "көрсету; дәлелдеу",
      "демонстрировать",
    ],
    [
      "efficient",
      "Working well without wasting time or resources.",
      "тиімді",
      "эффективный",
    ],
    [
      "emphasise",
      "To give special importance to something.",
      "баса айту",
      "подчёркивать",
    ],
    [
      "evidence",
      "Facts or information that support a belief.",
      "дәлел",
      "доказательства",
    ],
    [
      "maintain",
      "To keep something in the same condition.",
      "сақтау",
      "поддерживать; сохранять",
    ],
    [
      "perspective",
      "A particular way of thinking about something.",
      "көзқарас",
      "точка зрения",
    ],
    [
      "priority",
      "Something considered more important than other things.",
      "басымдық",
      "приоритет",
    ],
    [
      "reluctant",
      "Not willing or eager to do something.",
      "құлықсыз",
      "неохотный; не желающий",
    ],
    [
      "sustainable",
      "Able to continue without exhausting resources.",
      "тұрақты; орнықты",
      "устойчивый",
    ],
    [
      "undertake",
      "To accept responsibility for doing a task.",
      "қолға алу",
      "предпринимать; браться за",
    ],
  ],
  C1: [
    [
      "ambiguity",
      "The possibility of more than one interpretation.",
      "екіұштылық",
      "неоднозначность",
    ],
    [
      "meticulous",
      "Showing great care for every small detail.",
      "өте ұқыпты",
      "скрупулёзный",
    ],
    [
      "substantial",
      "Large or important in amount or degree.",
      "елеулі",
      "существенный",
    ],
    [
      "coherent",
      "Logical and clearly connected throughout.",
      "қисынды; бірізді",
      "связный; последовательный",
    ],
    [
      "compelling",
      "Very convincing or able to hold your attention.",
      "нанымды; тартымды",
      "убедительный; захватывающий",
    ],
    [
      "comprehensive",
      "Including all or nearly all relevant details.",
      "жан-жақты",
      "всесторонний",
    ],
    [
      "conscientious",
      "Careful to do your duties well and responsibly.",
      "адал; жауапкершілігі жоғары",
      "добросовестный",
    ],
    [
      "discrepancy",
      "A difference between things expected to agree.",
      "сәйкессіздік",
      "расхождение",
    ],
    [
      "elaborate",
      "Containing many carefully arranged details.",
      "егжей-тегжейлі",
      "детально разработанный",
    ],
    [
      "feasible",
      "Possible and practical to carry out.",
      "іске асатын",
      "осуществимый",
    ],
    [
      "implicit",
      "Suggested or understood without being stated directly.",
      "жасырын; тұспалды",
      "неявный",
    ],
    [
      "inherent",
      "Existing as a natural part of something.",
      "өзіне тән",
      "присущий",
    ],
    [
      "nuance",
      "A small but meaningful difference in expression or meaning.",
      "нәзік айырмашылық",
      "нюанс",
    ],
    [
      "plausible",
      "Seeming reasonable and likely to be true.",
      "қисынға келетін",
      "правдоподобный",
    ],
    [
      "preliminary",
      "Happening before the main or final stage.",
      "алдын ала",
      "предварительный",
    ],
    [
      "resilient",
      "Able to recover after difficulty or change.",
      "төзімді; тез қалпына келетін",
      "устойчивый; способный восстанавливаться",
    ],
    [
      "scrutinise",
      "To examine something closely and critically.",
      "мұқият тексеру",
      "тщательно изучать",
    ],
    [
      "tentative",
      "Not certain or final and open to change.",
      "әзірше түпкілікті емес",
      "предварительный; пробный",
    ],
    [
      "unprecedented",
      "Never having happened or been known before.",
      "бұрын-соңды болмаған",
      "беспрецедентный",
    ],
    [
      "versatile",
      "Able to adapt to many different uses or activities.",
      "әмбебап; жан-жақты",
      "универсальный; разносторонний",
    ],
  ],
};

export function studyWords(level) {
  if (advancedWords[level]) {
    return advancedWords[level].map(([word, en, kk, ru]) => ({
      word,
      en,
      kk,
      ru,
    }));
  }
  return (WORDS[level] || WORDS.A1).map(([word, ru]) => ({
    word,
    en: wordMeaning(word, "en"),
    kk: wordMeaning(word, "kk"),
    ru,
  }));
}

export function normalizeDictation(input) {
  return String(input ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\p{P}/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

export function compareDictation(answer, target) {
  const actual = normalizeDictation(answer);
  const expected = normalizeDictation(target);
  const a = [...actual];
  const e = [...expected];
  const rows = Array.from(
    { length: e.length + 1 },
    () => new Uint32Array(a.length + 1),
  );
  for (let i = 0; i <= e.length; i++) rows[i][0] = i;
  for (let j = 0; j <= a.length; j++) rows[0][j] = j;
  for (let i = 1; i <= e.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (e[i - 1] === a[j - 1] ? 0 : 1),
      );
    }
  }

  const diff = [];
  let i = e.length;
  let j = a.length;
  while (i || j) {
    if (i && j && e[i - 1] === a[j - 1] && rows[i][j] === rows[i - 1][j - 1]) {
      diff.push({ type: "same", expected: e[--i], actual: a[--j] });
    } else if (i && j && rows[i][j] === rows[i - 1][j - 1] + 1) {
      diff.push({ type: "replace", expected: e[--i], actual: a[--j] });
    } else if (i && rows[i][j] === rows[i - 1][j] + 1) {
      diff.push({ type: "missing", expected: e[--i], actual: "" });
    } else {
      diff.push({ type: "extra", expected: "", actual: a[--j] });
    }
  }
  diff.reverse();
  const distance = rows[e.length][a.length];
  const length = Math.max(e.length, a.length);
  return {
    accuracy: length
      ? Math.round(Math.max(0, 1 - distance / length) * 100)
      : 100,
    correct: distance === 0,
    distance,
    expected,
    actual,
    diff,
  };
}

export function sentenceDeck(
  level,
  random = Math.random,
  count = DICTATION_ROUNDS,
) {
  const items = (SENTENCES[level] || SENTENCES.A1).map((item) => ({ ...item }));
  for (let i = items.length - 1; i > 0; i--) {
    const value = Number(random());
    const j = Number.isFinite(value)
      ? Math.max(0, Math.min(i, Math.floor(value * (i + 1))))
      : 0;
    [items[i], items[j]] = [items[j], items[i]];
  }
  const size = Number.isFinite(count)
    ? Math.max(0, Math.floor(count))
    : DICTATION_ROUNDS;
  return items.slice(0, size);
}

const STUDY_KEY = "10qadam-study";
const wordBank = new Set(
  STUDY_LEVELS.flatMap((level) => studyWords(level).map(({ word }) => word)),
);

function cleanStudy(data) {
  const known = Array.isArray(data?.known)
    ? [
        ...new Set(
          data.known
            .filter((word) => typeof word === "string")
            .map((word) => word.trim().toLowerCase())
            .filter((word) => wordBank.has(word)),
        ),
      ].slice(0, 300)
    : [];
  const result = { known };
  const last = data?.lastSession;
  if (
    last &&
    STUDY_LEVELS.includes(last.level) &&
    typeof last.accuracy === "number" &&
    Number.isFinite(last.accuracy) &&
    last.accuracy >= 0 &&
    last.accuracy <= 100 &&
    Number.isInteger(last.rounds) &&
    last.rounds > 0 &&
    last.rounds <= 12 &&
    typeof last.date === "string" &&
    Number.isFinite(Date.parse(last.date))
  ) {
    result.lastSession = {
      level: last.level,
      accuracy: last.accuracy,
      rounds: last.rounds,
      date: new Date(last.date).toISOString(),
    };
  }
  return result;
}

export function loadStudy(storage) {
  try {
    return cleanStudy(
      JSON.parse(
        (storage ?? globalThis.localStorage)?.getItem(STUDY_KEY) || "null",
      ),
    );
  } catch {
    return { known: [] };
  }
}

export function saveStudy(data, storage) {
  const result = cleanStudy(data);
  try {
    (storage ?? globalThis.localStorage)?.setItem(
      STUDY_KEY,
      JSON.stringify(result),
    );
  } catch {
    // Private browsing and full storage must not interrupt learning.
  }
  return result;
}
