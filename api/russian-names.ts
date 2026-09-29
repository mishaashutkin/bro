/**
 * Russian Sports Teams & Matches Name Normalizer and Translator
 * Ensures 100% of club, team, country, and match names are rendered in Russian.
 */

// 1. Direct dictionary of national teams and countries
const COUNTRIES_RU: Record<string, string> = {
  afghanistan: 'Афганистан',
  albania: 'Албания',
  algeria: 'Алжир',
  andorra: 'Андорра',
  angola: 'Ангола',
  argentina: 'Аргентина',
  armenia: 'Армения',
  australia: 'Австралия',
  austria: 'Австрия',
  azerbaijan: 'Азербайджан',
  bahrain: 'Бахрейн',
  bangladesh: 'Бангладеш',
  belarus: 'Беларусь',
  belgium: 'Бельгия',
  bolivia: 'Боливия',
  'bosnia and herzegovina': 'Босния и Герцеговина',
  bosnia: 'Босния и Герцеговина',
  brazil: 'Бразилия',
  bulgaria: 'Болгария',
  cameroon: 'Камерун',
  canada: 'Канада',
  chile: 'Чили',
  china: 'Китай',
  colombia: 'Колумбия',
  'costa rica': 'Коста-Рика',
  croatia: 'Хорватия',
  cyprus: 'Кипр',
  'czech republic': 'Чехия',
  czechia: 'Чехия',
  denmark: 'Дания',
  ecuador: 'Эквадор',
  egypt: 'Египет',
  england: 'Англия',
  estonia: 'Эстония',
  ethiopia: 'Эфиопия',
  'faroe islands': 'Фарерские острова',
  finland: 'Финляндия',
  france: 'Франция',
  georgia: 'Грузия',
  germany: 'Германия',
  ghana: 'Гана',
  gibraltar: 'Гибралтар',
  greece: 'Греция',
  guatemala: 'Гватемала',
  honduras: 'Гондурас',
  hungary: 'Венгрия',
  iceland: 'Исландия',
  india: 'Индия',
  indonesia: 'Индонезия',
  iran: 'Иран',
  iraq: 'Ирак',
  ireland: 'Ирландия',
  israel: 'Израиль',
  italy: 'Италия',
  'ivory coast': 'Кот-д’Ивуар',
  jamaica: 'Ямайка',
  japan: 'Япония',
  jordan: 'Иордания',
  kazakhstan: 'Казахстан',
  kenya: 'Кения',
  kosovo: 'Косово',
  kuwait: 'Кувейт',
  kyrgyzstan: 'Кыргызстан',
  latvia: 'Латвия',
  lebanon: 'Ливан',
  liechtenstein: 'Лихтенштейн',
  lithuania: 'Литва',
  luxembourg: 'Люксембург',
  malaysia: 'Малайзия',
  malta: 'Мальта',
  mexico: 'Мексика',
  moldova: 'Молдова',
  monaco: 'Монако',
  montenegro: 'Черногория',
  morocco: 'Марокко',
  netherlands: 'Нидерланды',
  holland: 'Нидерланды',
  'new zealand': 'Новая Зеландия',
  nigeria: 'Нигерия',
  'north macedonia': 'Северная Македония',
  'northern ireland': 'Северная Ирландия',
  norway: 'Норвегия',
  oman: 'Оман',
  pakistan: 'Пакистан',
  panama: 'Панама',
  paraguay: 'Парагвай',
  peru: 'Перу',
  philippines: 'Филиппины',
  poland: 'Польша',
  portugal: 'Португалия',
  qatar: 'Катар',
  romania: 'Румыния',
  russia: 'Россия',
  'san marino': 'Сан-Марино',
  'saudi arabia': 'Саудовская Аравия',
  scotland: 'Шотландия',
  senegal: 'Сенегал',
  serbia: 'Сербия',
  slovakia: 'Словакия',
  slovenia: 'Словения',
  'south africa': 'ЮАР',
  'south korea': 'Южная Корея',
  korea: 'Южная Корея',
  spain: 'Испания',
  sweden: 'Швеция',
  switzerland: 'Швейцария',
  syria: 'Сирия',
  tajikistan: 'Таджикистан',
  thailand: 'Таиланд',
  tunisia: 'Тунис',
  turkey: 'Турция',
  turkmenistan: 'Туркменистан',
  uae: 'ОАЭ',
  'united arab emirates': 'ОАЭ',
  uganda: 'Уганда',
  ukraine: 'Украина',
  uruguay: 'Уругвай',
  usa: 'США',
  'united states': 'США',
  uzbekistan: 'Узбекистан',
  venezuela: 'Венесуэла',
  vietnam: 'Вьетнам',
  wales: 'Уэльс',
};

// 2. Direct dictionary of popular football, hockey, and basketball clubs
const CLUBS_RU: Record<string, string> = {
  // England
  arsenal: 'Арсенал',
  'aston villa': 'Астон Вилла',
  bournemouth: 'Борнмут',
  brentford: 'Брентфорд',
  brighton: 'Брайтон',
  'brighton & hove albion': 'Брайтон',
  chelsea: 'Челси',
  'crystal palace': 'Кристал Пэлас',
  everton: 'Эвертон',
  fulham: 'Фулхэм',
  ipswich: 'Ипсвич',
  'ipswich town': 'Ипсвич',
  leicester: 'Лестер',
  'leicester city': 'Лестер',
  liverpool: 'Ливерпуль',
  'manchester city': 'Манчестер Сити',
  'man city': 'Манчестер Сити',
  'manchester united': 'Манчестер Юнайтед',
  'man united': 'Манчестер Юнайтед',
  'man utd': 'Манчестер Юнайтед',
  newcastle: 'Ньюкасл',
  'newcastle united': 'Ньюкасл',
  'nottingham forest': 'Ноттингем Форест',
  southampton: 'Саутгемптон',
  tottenham: 'Тоттенхэм',
  'tottenham hotspur': 'Тоттенхэм',
  'west ham': 'Вест Хэм',
  'west ham united': 'Вест Хэм',
  wolverhampton: 'Вулверхэмптон',
  'wolverhampton wanderers': 'Вулверхэмптон',
  wolves: 'Вулверхэмптон',
  leeds: 'Лидс',
  'leeds united': 'Лидс',
  burnley: 'Бёрнли',
  'sheffield united': 'Шеффилд Юнайтед',
  'sheffield wednesday': 'Шеффилд Уэнсдей',
  sunderland: 'Сандерленд',
  middlesbrough: 'Мидлсбро',
  'west bromwich albion': 'Вест Бромвич',
  'west brom': 'Вест Бромвич',
  norwich: 'Норвич',
  'norwich city': 'Норвич',
  watford: 'Уотфорд',
  stoke: 'Сток Сити',
  'stoke city': 'Сток Сити',
  'derby county': 'Дерби Каунти',
  portsmouth: 'Портсмут',
  'queens park rangers': 'КПР',
  qpr: 'КПР',
  'bristol city': 'Бристоль Сити',
  'preston north end': 'Престон',
  swansea: 'Суонси',
  'swansea city': 'Суонси',
  hull: 'Халл Сити',
  'hull city': 'Халл Сити',
  luton: 'Лутон Таун',
  'luton town': 'Лутон Таун',
  millwall: 'Миллуолл',
  coventry: 'Ковентри Сити',
  'coventry city': 'Ковентри Сити',
  blackburn: 'Блэкберн',
  'blackburn rovers': 'Блэкберн',

  // Spain
  'real madrid': 'Реал Мадрид',
  barcelona: 'Барселона',
  'atletico madrid': 'Атлетико Мадрид',
  'athletic bilbao': 'Атлетик Бильбао',
  'athletic club': 'Атлетик Бильбао',
  'real sociedad': 'Реал Сосьедад',
  'real betis': 'Реал Бетис',
  betis: 'Реал Бетис',
  sevilla: 'Севилья',
  villarreal: 'Вильярреал',
  valencia: 'Валенсия',
  osasuna: 'Осасуна',
  'celta vigo': 'Сельта',
  celta: 'Сельта',
  getafe: 'Хетафе',
  girona: 'Жирона',
  espanyol: 'Эспаньол',
  mallorca: 'Мальорка',
  'rayo vallecano': 'Райо Вальекано',
  alaves: 'Алавес',
  'deportivo alaves': 'Алавес',
  'las palmas': 'Лас-Пальмас',
  leganes: 'Леганес',
  'real valladolid': 'Реал Вальядолид',
  valladolid: 'Реал Вальядолид',
  levante: 'Леванте',
  zaragoza: 'Сарагоса',
  'real zaragoza': 'Сарагоса',
  elche: 'Эльче',
  cadiz: 'Кадис',
  granada: 'Гранада',
  'sporting gijon': 'Спортинг Хихон',
  'racing santander': 'Расинг Сантандер',
  almeria: 'Альмерия',
  oviedo: 'Овьедо',
  'real oviedo': 'Реал Овьедо',
  deportivo: 'Депортиво',
  'deportivo la coruna': 'Депортиво',
  cordoba: 'Кордова',
  burgos: 'Бургос',
  castellon: 'Кастельон',
  cartagena: 'Картахена',
  huesca: 'Уэска',
  mirandes: 'Мирандес',
  eldense: 'Эльденсе',

  // Italy
  inter: 'Интер',
  'inter milan': 'Интер',
  milan: 'Милан',
  'ac milan': 'Милан',
  juventus: 'Ювентус',
  napoli: 'Наполи',
  roma: 'Рома',
  lazio: 'Лацио',
  atalanta: 'Аталанта',
  fiorentina: 'Фиорентина',
  bologna: 'Болонья',
  torino: 'Торино',
  monza: 'Монца',
  genoa: 'Дженоа',
  udinese: 'Удинезе',
  cagliari: 'Кальяри',
  parma: 'Парма',
  'hellas verona': 'Верона',
  verona: 'Верона',
  empoli: 'Эмполи',
  lecce: 'Лечче',
  venezia: 'Венеция',
  como: 'Комо',
  sassuolo: 'Сассуоло',
  sampdoria: 'Сампдория',
  palermo: 'Палермо',
  frosinone: 'Фрозиноне',
  salernitana: 'Салернитана',
  spezia: 'Специя',
  cremonese: 'Кремонезе',
  bari: 'Бари',
  cesena: 'Чезена',
  brescia: 'Брешиа',
  pisa: 'Пиза',
  reggiana: 'Реджана',
  modena: 'Модена',
  catanzaro: 'Катандзаро',
  sudtirol: 'Зюдтироль',
  carrarese: 'Каррарезе',
  mantova: 'Мантова',
  juve: 'Ювентус',

  // Germany
  'bayern munich': 'Бавария',
  'fc bayern': 'Бавария',
  'bayern munchen': 'Бавария',
  bayern: 'Бавария',
  'bayer leverkusen': 'Байер',
  leverkusen: 'Байер',
  'borussia dortmund': 'Боруссия Д',
  dortmund: 'Боруссия Д',
  'bvb dortmund': 'Боруссия Д',
  'rb leipzig': 'РБ Лейпциг',
  leipzig: 'РБ Лейпциг',
  'eintracht frankfurt': 'Айнтрахт Ф',
  frankfurt: 'Айнтрахт Ф',
  stuttgart: 'Штутгарт',
  'vfb stuttgart': 'Штутгарт',
  wolfsburg: 'Вольфсбург',
  'vfl wolfsburg': 'Вольфсбург',
  'borussia monchengladbach': 'Боруссия М',
  monchengladbach: 'Боруссия М',
  'm’gladbach': 'Боруссия М',
  hoffenheim: 'Хоффенхайм',
  freiburg: 'Фрайбург',
  'werder bremen': 'Вердер',
  bremen: 'Вердер',
  'union berlin': 'Унион Берлин',
  augsburg: 'Аугсбург',
  mainz: 'Майнц',
  'mainz 05': 'Майнц',
  heidenheim: 'Хайденхайм',
  'st. pauli': 'Санкт-Паули',
  'st pauli': 'Санкт-Паули',
  'holstein kiel': 'Хольштайн Киль',
  bochum: 'Бохум',
  'vfl bochum': 'Бохум',
  schalke: 'Шальке 04',
  'schalke 04': 'Шальке 04',
  hamburg: 'Гамбург',
  'hamburger sv': 'Гамбург',
  'hertha berlin': 'Герта',
  hertha: 'Герта',
  koln: 'Кёльн',
  'fc koln': 'Кёльн',
  '1. fc koln': 'Кёльн',
  hannover: 'Ганновер',
  'hannover 96': 'Ганновер',
  'fortuna dusseldorf': 'Фортуна Д',
  dusseldorf: 'Фортуна Д',
  nuremberg: 'Нюрнберг',
  kaiserslautern: 'Кайзерслаутерн',
  paderborn: 'Падерборн',
  karlsruher: 'Карлсруэ',
  magdeburg: 'Магдебург',
  darmstadt: 'Дармштадт',

  // France
  'paris saint-germain': 'ПСЖ',
  'paris saint germain': 'ПСЖ',
  psg: 'ПСЖ',
  monaco: 'Монако',
  'as monaco': 'Монако',
  marseille: 'Марсель',
  'olympique marseille': 'Марсель',
  lyon: 'Лион',
  'olympique lyon': 'Лион',
  lille: 'Лилль',
  'lille osc': 'Лилль',
  rennes: 'Ренн',
  'stade rennais': 'Ренн',
  lens: 'Ланс',
  nice: 'Ницца',
  'ogc nice': 'Ницца',
  brest: 'Брест',
  'stade brestois': 'Брест',
  reims: 'Реймс',
  strasbourg: 'Страсбур',
  nantes: 'Нант',
  montpellier: 'Монпелье',
  toulouse: 'Тулуза',
  auxerre: 'Осер',
  'saint-etienne': 'Сент-Этьен',
  'le havre': 'Гавр',
  angers: 'Анже',
  bordeaux: 'Бордо',
  metz: 'Мец',
  lorient: 'Лорьян',
  troyes: 'Труа',
  bastia: 'Бастия',
  guingamp: 'Генгам',
  'paris fc': 'Париж ФК',
  clermont: 'Клермон',

  // Portugal
  benfica: 'Бенфика',
  'sporting cp': 'Спортинг',
  'sporting lisbon': 'Спортинг',
  sporting: 'Спортинг',
  porto: 'Порту',
  'fc porto': 'Порту',
  braga: 'Брага',
  'sporting braga': 'Брага',
  'vitoria guimaraes': 'Витория Гимарайнш',
  guimaraes: 'Витория Гимарайнш',
  boavista: 'Боавишта',
  famalicao: 'Фамаликан',
  'gil vicente': 'Жил Висенте',
  'rio ave': 'Риу Аве',
  estoril: 'Эшторил',
  arouca: 'Арока',
  'santa clara': 'Санта-Клара',
  farense: 'Фаренсе',
  'casa pia': 'Каза Пия',
  nacional: 'Насьонал',
  moreirense: 'Морейренсе',
  avs: 'АВС',
  estrela: 'Эштрела Амадора',

  // Netherlands
  ajax: 'Аякс',
  feyenoord: 'Фейеноорд',
  psv: 'ПСВ',
  'psv eindhoven': 'ПСВ',
  'az alkmaar': 'АЗ Алкмар',
  az: 'АЗ Алкмар',
  twente: 'Твенте',
  utrecht: 'Утрехт',
  heerenveen: 'Херенвен',
  vitesse: 'Витесс',
  groningen: 'Гронинген',
  'sparta rotterdam': 'Спарта Р',
  'go ahead eagles': 'Гоу Эхед Иглз',
  'nec nijmegen': 'НЕК Неймеген',
  'fortuna sittard': 'Фортуна Ситтард',
  'pec zwolle': 'ПЕК Зволле',
  'rkc waalwijk': 'Валвейк',
  heracles: 'Хераклес',
  'almere city': 'Алмере Сити',
  'willem ii': 'Виллем II',
  'nac breda': 'НАК Бреда',

  // Russia & CIS
  zenit: 'Зенит',
  'zenit st. petersburg': 'Зенит',
  spartak: 'Спартак',
  'spartak moscow': 'Спартак',
  cska: 'ЦСКА',
  'cska moscow': 'ЦСКА',
  lokomotiv: 'Локомотив',
  'lokomotiv moscow': 'Локомотив',
  krasnodar: 'Краснодар',
  dynamo: 'Динамо',
  'dynamo moscow': 'Динамо Москва',
  'dinamo moscow': 'Динамо Москва',
  'rubin kazan': 'Рубин',
  rubin: 'Рубин',
  rostov: 'Ростов',
  'krylia sovetov': 'Крылья Советов',
  akhmat: 'Ахмат',
  'akhmat grozny': 'Ахмат',
  orenburg: 'Оренбург',
  'pari nn': 'Пари НН',
  'nizhny novgorod': 'Пари НН',
  fakel: 'Факел',
  khimki: 'Химки',
  'dynamo makhachkala': 'Динамо Махачкала',
  akron: 'Акрон',
  'akron tolyatti': 'Акрон',
  baltika: 'Балтика',
  ural: 'Урал',
  sochi: 'Сочи',
  torpedo: 'Торпедо',
  'torpedo moscow': 'Торпедо',
  'arsenal tula': 'Арсенал Тула',
  alania: 'Алания',
  rodina: 'Родина',
  yenisey: 'Енисей',
  shinnik: 'Шинник',
  rotor: 'Ротор',
  tyumen: 'Тюмень',
  neftekhimik: 'Нефтехимик',
  chernomorets: 'Черноморец',
  kamaz: 'КАМАЗ',
  'ska-khabarovsk': 'СКА-Хабаровск',
  ufa: 'Уфа',
  barys: 'Барыс',
  kunlun: 'Куньлунь Ред Стар',
  'kunlun red star': 'Куньлунь',
  'dinamo minsk': 'Динамо Минск',
  shakhtyor: 'Шахтер',
  'shakhtar donetsk': 'Шахтер Донецк',
  'dynamo kyiv': 'Динамо Киев',
  astana: 'Астана',
  kairat: 'Кайрат',
  aktobe: 'Актобе',
  tobol: 'Тобол',
  qarabag: 'Карабах',
  neftchi: 'Нефтчи',
  sheriff: 'Шериф',
  'sheriff tiraspol': 'Шериф',
  pyunik: 'Пюник',
  noah: 'Ноа',
  ararat: 'Арарат',
  pakhtakor: 'Пахтакор',
  navbahor: 'Навбахор',
  nasaf: 'Насаф',

  // Other Top European
  galatasaray: 'Галатасарай',
  fenerbahce: 'Фенербахче',
  besiktas: 'Бешикташ',
  trabzonspor: 'Трабзонспор',
  'istanbul basaksehir': 'Истанбул Башакшехир',
  celtic: 'Селтик',
  rangers: 'Рейнджерс',
  aberdeen: 'Абердин',
  olympiacos: 'Олимпиакос',
  panathinaikos: 'Панатинаикос',
  'aek athens': 'АЕК Афины',
  aek: 'АЕК',
  paok: 'ПАОК',
  aris: 'Арис',
  'red star belgrade': 'Црвена Звезда',
  'crvena zvezda': 'Црвена Звезда',
  partizan: 'Партизан',
  'dinamo zagreb': 'Динамо Загреб',
  'hajduk split': 'Хайдук',
  'slavia prague': 'Славия Прага',
  'sparta prague': 'Спарта Прага',
  'viktoria plzen': 'Виктория Пльзень',
  'young boys': 'Янг Бойз',
  basel: 'Базель',
  servette: 'Серветт',
  zurich: 'Цюрих',
  lugano: 'Лугано',
  salzburg: 'Ред Булл Зальцбург',
  'red bull salzburg': 'Ред Булл Зальцбург',
  'sturm graz': 'Штурм',
  lask: 'ЛАСК',
  'rapid wien': 'Рапид Вена',
  'austria wien': 'Австрия Вена',
  'club brugge': 'Брюгге',
  brugge: 'Брюгге',
  anderlecht: 'Андерлехт',
  genk: 'Генк',
  gent: 'Гент',
  'union saint-gilloise': 'Юнион Сент-Жиллуаз',
  antwerp: 'Антверпен',
  'standard liege': 'Стандард',
  malmo: 'Мальмё',
  aik: 'АИК',
  djurgarden: 'Юргорден',
  'bodo/glimt': 'Будё-Глимт',
  molde: 'Мольде',
  rosenborg: 'Русенборг',
  copenhagen: 'Копенгаген',
  brondby: 'Брондбю',
  midtjylland: 'Мидтьюлланд',

  // NHL
  'tampa bay lightning': 'Тампа-Бэй Лайтнинг',
  'tampa bay': 'Тампа-Бэй',
  'florida panthers': 'Флорида Пантерз',
  'edmonton oilers': 'Эдмонтон Ойлерз',
  'colorado avalanche': 'Колорадо Эвеланш',
  'dallas stars': 'Даллас Старз',
  'carolina hurricanes': 'Каролина Харрикейнз',
  'new york rangers': 'Нью-Йорк Рейнджерс',
  'ny rangers': 'Нью-Йорк Рейнджерс',
  'boston bruins': 'Бостон Брюинз',
  'toronto maple leafs': 'Торонто Мейпл Лифс',
  'vegas golden knights': 'Вегас Голден Найтс',
  'vancouver canucks': 'Ванкувер Кэнакс',
  'winnipeg jets': 'Виннипег Джетс',
  'new jersey devils': 'Нью-Джерси Девилз',
  'washington capitals': 'Вашингтон Кэпиталз',
  'pittsburgh penguins': 'Питтсбург Пингвинз',
  'detroit red wings': 'Детройт Ред Уингз',
  'chicago blackhawks': 'Чикаго Блэкхокс',
  'montreal canadiens': 'Монреаль Канадиенс',
  'ottawa senators': 'Оттава Сенаторз',
  'buffalo sabres': 'Баффало Сейбрз',
  'philadelphia flyers': 'Филадельфия Флайерз',
  'new york islanders': 'Нью-Йорк Айлендерс',
  'ny islanders': 'Нью-Йорк Айлендерс',
  'columbus blue jackets': 'Коламбус Блю Джекетс',
  'minnesota wild': 'Миннесота Уайлд',
  'st. louis blues': 'Сент-Луис Блюз',
  'st louis blues': 'Сент-Луис Блюз',
  'nashville predators': 'Нэшвилл Предаторз',
  'los angeles kings': 'Лос-Анджелес Кингз',
  'la kings': 'Лос-Анджелес Кингз',
  'anaheim ducks': 'Анахайм Дакс',
  'san jose sharks': 'Сан-Хосе Шаркс',
  'calgary flames': 'Калгари Флэймз',
  'seattle kraken': 'Сиэтл Кракен',
  'utah hockey club': 'Юта ХК',

  // NBA
  'boston celtics': 'Бостон Селтикс',
  'los angeles lakers': 'Лос-Анджелес Лейкерс',
  'la lakers': 'Лос-Анджелес Лейкерс',
  'golden state warriors': 'Голден Стэйт Уорриорз',
  'golden state': 'Голден Стэйт',
  'denver nuggets': 'Денвер Наггетс',
  'milwaukee bucks': 'Милуоки Бакс',
  'philadelphia 76ers': 'Филадельфия 76ерс',
  'miami heat': 'Майами Хит',
  'phoenix suns': 'Финикс Санз',
  'dallas mavericks': 'Даллас Маверикс',
  'minnesota timberwolves': 'Миннесота Тимбервулвз',
  'oklahoma city thunder': 'Оклахома-Сити Тандер',
  'oklahoma city': 'Оклахома-Сити',
  'new york knicks': 'Нью-Йорк Никс',
  'ny knicks': 'Нью-Йорк Никс',
  'cleveland cavaliers': 'Кливленд Кавальерс',
  'indiana pacers': 'Индиана Пэйсерс',
  'orlando magic': 'Орландо Мэджик',
  'sacramento kings': 'Сакраменто Кингз',
  'new orleans pelicans': 'Нью-Орлеан Пеликанс',
  'los angeles clippers': 'Лос-Анджелес Клипперс',
  'la clippers': 'Лос-Анджелес Клипперс',
  'houston rockets': 'Хьюстон Рокетс',
  'chicago bulls': 'Чикаго Буллз',
  'atlanta hawks': 'Атланта Хокс',
  'brooklyn nets': 'Бруклин Нетс',
  'toronto raptors': 'Торонто Рэпторс',
  'memphis grizzlies': 'Мемфис Гриззлис',
  'utah jazz': 'Юта Джаз',
  'san antonio spurs': 'Сан-Антонио Спёрс',
  'charlotte hornets': 'Шарлотт Хорнетс',
  'portland trail blazers': 'Портленд Трэйл Блэйзерс',
  'washington wizards': 'Вашингтон Уизардс',
  'detroit pistons': 'Детройт Пистонс',
};

// 3. Word-level replacements for general sports club names
const WORD_REPLACEMENTS: Record<string, string> = {
  fc: 'ФК',
  cf: 'КФ',
  fk: 'ФК',
  sk: 'СК',
  sc: 'СК',
  bc: 'БК',
  hc: 'ХК',
  ac: 'АК',
  united: 'Юнайтед',
  city: 'Сити',
  town: 'Таун',
  rovers: 'Роверс',
  wanderers: 'Уондерерс',
  athletic: 'Атлетик',
  atletico: 'Атлетико',
  sporting: 'Спортинг',
  real: 'Реал',
  inter: 'Интер',
  dynamo: 'Динамо',
  dinamo: 'Динамо',
  spartak: 'Спартак',
  lokomotiv: 'Локомотив',
  olympic: 'Олимпик',
  olympique: 'Олимпик',
  racing: 'Расинг',
  deportivo: 'Депортиво',
  union: 'Унион',
  national: 'Насьональ',
  internacional: 'Интернасьонал',
  red: 'Ред',
  white: 'Уайт',
  black: 'Блэк',
  blue: 'Блю',
  star: 'Стар',
  stars: 'Старз',
  hotspur: 'Хотспур',
  albion: 'Альбион',
  county: 'Каунти',
  forest: 'Форест',
  palace: 'Пэлас',
  villa: 'Вилла',
  rangers: 'Рейнджерс',
  knights: 'Найтс',
  kings: 'Кингз',
  queens: 'Квинс',
  bulls: 'Буллз',
  heat: 'Хит',
  magic: 'Мэджик',
  thunder: 'Тандер',
  grizzlies: 'Гриззлис',
  hawks: 'Хокс',
  nets: 'Нетс',
  raptors: 'Рэпторс',
  bucks: 'Бакс',
  celtics: 'Селтикс',
  lakers: 'Лейкерс',
  warriors: 'Уорриорз',
  clippers: 'Клипперс',
  nuggets: 'Наггетс',
  timberwolves: 'Тимбервулвз',
  pelicans: 'Пеликанс',
  spurs: 'Спёрс',
  blazers: 'Блэйзерс',
  wizards: 'Уизардс',
  pistons: 'Пистонс',
  pacers: 'Пэйсерс',
  cavaliers: 'Кавальерс',
  hornets: 'Хорнетс',
  lightning: 'Лайтнинг',
  panthers: 'Пантерз',
  oilers: 'Ойлерз',
  avalanche: 'Эвеланш',
  hurricanes: 'Харрикейнз',
  bruins: 'Брюинз',
  canucks: 'Кэнакс',
  jets: 'Джетс',
  devils: 'Девилз',
  capitals: 'Кэпиталз',
  penguins: 'Пингвинз',
  blackhawks: 'Блэкхокс',
  canadiens: 'Канадиенс',
  senators: 'Сенаторз',
  sabres: 'Сейбрз',
  flyers: 'Флайерз',
  islanders: 'Айлендерс',
  predators: 'Предаторз',
  ducks: 'Дакс',
  sharks: 'Шаркс',
  flames: 'Флэймз',
  kraken: 'Кракен',
  wild: 'Уайлд',
  blues: 'Блюз',
  women: '(жен)',
  u21: '(до 21)',
  u19: '(до 19)',
  u17: '(до 17)',
  reserves: '(резерв)',
  youth: '(молодёжь)',
};

/**
 * Phonetic transliteration mapping from Latin to Cyrillic
 */
function transliterateLatinToCyrillic(str: string): string {
  // Common multi-letter sounds
  let res = str
    .replace(/sch/gi, 'ш')
    .replace(/shch/gi, 'щ')
    .replace(/sh/gi, 'ш')
    .replace(/ch/gi, 'ч')
    .replace(/th/gi, 'т')
    .replace(/ph/gi, 'ф')
    .replace(/kh/gi, 'х')
    .replace(/zh/gi, 'ж')
    .replace(/ts/gi, 'ц')
    .replace(/ck/gi, 'к')
    .replace(/qu/gi, 'кв')
    .replace(/ya/gi, 'я')
    .replace(/ye/gi, 'е')
    .replace(/yu/gi, 'ю')
    .replace(/yo/gi, 'ё')
    .replace(/ea/gi, 'и')
    .replace(/ee/gi, 'и')
    .replace(/oo/gi, 'у')
    .replace(/ou/gi, 'у')
    .replace(/ei/gi, 'ей')
    .replace(/ey/gi, 'ей')
    .replace(/ay/gi, 'ей')
    .replace(/ai/gi, 'ай')
    .replace(/oi/gi, 'ой')
    .replace(/oy/gi, 'ой');

  const singleCharMap: Record<string, string> = {
    a: 'а',
    b: 'б',
    c: 'к',
    d: 'д',
    e: 'е',
    f: 'ф',
    g: 'г',
    h: 'х',
    i: 'и',
    j: 'дж',
    k: 'к',
    l: 'л',
    m: 'м',
    n: 'н',
    o: 'о',
    p: 'п',
    q: 'к',
    r: 'р',
    s: 'с',
    t: 'т',
    u: 'у',
    v: 'в',
    w: 'в',
    x: 'кс',
    y: 'и',
    z: 'з',
    A: 'А',
    B: 'Б',
    C: 'К',
    D: 'Д',
    E: 'Е',
    F: 'Ф',
    G: 'Г',
    H: 'Х',
    I: 'И',
    J: 'Дж',
    K: 'К',
    L: 'Л',
    M: 'М',
    N: 'Н',
    O: 'О',
    P: 'П',
    Q: 'К',
    R: 'Р',
    S: 'С',
    T: 'Т',
    U: 'У',
    V: 'В',
    W: 'В',
    X: 'Кс',
    Y: 'И',
    Z: 'З',
  };

  let out = '';
  for (let i = 0; i < res.length; i++) {
    const ch = res[i];
    out += singleCharMap[ch] !== undefined ? singleCharMap[ch] : ch;
  }
  return out;
}

/**
 * Checks if a string contains Latin characters
 */
export function hasLatin(str: string): boolean {
  return /[a-zA-Z]/.test(str);
}

/**
 * Translates/Normalizes a team name into Russian
 */
export function translateTeamNameToRussian(rawName: string): string {
  if (!rawName || !rawName.trim()) return '';

  const clean = rawName.trim();
  // If already pure Russian/Cyrillic (no Latin letters), return directly
  if (!hasLatin(clean)) {
    return clean;
  }

  const lower = clean.toLowerCase();

  // 1. Direct match with countries / national teams
  if (COUNTRIES_RU[lower]) {
    return COUNTRIES_RU[lower];
  }

  // 2. Direct match with clubs
  if (CLUBS_RU[lower]) {
    return CLUBS_RU[lower];
  }

  // Check without common prefixes/suffixes like "FC ", "CF ", "FK ", "AC ", "SC "
  const strippedPrefix = lower.replace(/^(fc|cf|fk|sk|sc|bc|hc|ac)\s+/i, '').trim();
  if (COUNTRIES_RU[strippedPrefix]) {
    return COUNTRIES_RU[strippedPrefix];
  }
  if (CLUBS_RU[strippedPrefix]) {
    return CLUBS_RU[strippedPrefix];
  }

  const strippedSuffix = lower.replace(/\s+(fc|cf|fk|sk|sc|bc|hc|ac)$/i, '').trim();
  if (CLUBS_RU[strippedSuffix]) {
    return CLUBS_RU[strippedSuffix];
  }

  // 3. Sub-token matching for composite names (e.g. "Paris Saint-Germain (Women)" or "Arsenal U21")
  for (const [enKey, ruVal] of Object.entries(CLUBS_RU)) {
    if (lower.startsWith(enKey + ' ') || lower.endsWith(' ' + enKey)) {
      const rest = lower.replace(enKey, '').trim();
      const translatedRest = rest
        .split(/\s+/)
        .map((w) => WORD_REPLACEMENTS[w] || w)
        .join(' ');
      return `${ruVal} ${translatedRest}`.trim();
    }
  }

  for (const [enKey, ruVal] of Object.entries(COUNTRIES_RU)) {
    if (lower.startsWith(enKey + ' ') || lower.endsWith(' ' + enKey)) {
      const rest = lower.replace(enKey, '').trim();
      const translatedRest = rest
        .split(/\s+/)
        .map((w) => WORD_REPLACEMENTS[w] || w)
        .join(' ');
      return `${ruVal} ${translatedRest}`.trim();
    }
  }

  // 4. Token-by-token dictionary replacement
  const tokens = clean.split(/(\s+|[-—–/])/);
  let translatedAny = false;
  const processedTokens = tokens.map((token) => {
    const tLower = token.toLowerCase();
    if (WORD_REPLACEMENTS[tLower]) {
      translatedAny = true;
      return WORD_REPLACEMENTS[tLower];
    }
    if (COUNTRIES_RU[tLower]) {
      translatedAny = true;
      return COUNTRIES_RU[tLower];
    }
    if (CLUBS_RU[tLower]) {
      translatedAny = true;
      return CLUBS_RU[tLower];
    }
    return token;
  });

  const reconstructed = processedTokens.join('');

  // 5. If it still contains Latin letters, apply phonetic transliteration
  if (hasLatin(reconstructed)) {
    const transliterated = transliterateLatinToCyrillic(reconstructed);
    // Capitalize first letter of words
    return transliterated.replace(/(^|\s|[-—–/])([а-яё])/g, (_, p1, p2) => p1 + p2.toUpperCase());
  }

  return reconstructed;
}

/**
 * Translates/Normalizes a match title into Russian
 * e.g. "Arsenal vs Chelsea" -> "Арсенал — Челси"
 */
export function translateMatchNameToRussian(
  rawMatchName: string,
  rawHome?: string,
  rawAway?: string
): string {
  if (rawHome && rawAway) {
    const ruHome = translateTeamNameToRussian(rawHome);
    const ruAway = translateTeamNameToRussian(rawAway);
    return `${ruHome} — ${ruAway}`;
  }

  if (!rawMatchName || !rawMatchName.trim()) return '';

  const clean = rawMatchName.trim();
  // Only split on hyphens with surrounding spaces (e.g. "Команда 1 - Команда 2" or " — "), not inside hyphenated names like "Paris Saint-Germain" or "Тампа-Бэй"
  const vsMatch = clean.split(/\s+[-—–]\s+|\s+(?:vs|v|против)\s+/i);
  if (vsMatch.length === 2 && vsMatch[0] && vsMatch[1]) {
    const ruHome = translateTeamNameToRussian(vsMatch[0]);
    const ruAway = translateTeamNameToRussian(vsMatch[1]);
    return `${ruHome} — ${ruAway}`;
  }

  return translateTeamNameToRussian(clean);
}
