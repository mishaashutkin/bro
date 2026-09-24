import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { predictionCache } from './api/cache';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export interface MatchPrediction {
  event: string;
  probability: number;
  estimatedOdds: string;
  tag: string;
}

export interface MatchAnalysis {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  matchName: string;
  time: string;
  status: string;
  predictions: MatchPrediction[];
  reasoning: string;
  keyStats: string[];
  brotherVerdict: string;
}

export interface UnmatchedQuery {
  query: string;
  reason: string;
}

export interface BrotherResponse {
  brotherSummary: {
    greeting: string;
    matchesAnalyzedTotal: number;
    matchesQualified: number;
    averageConfidence: number;
    brotherTip: string;
    sportName: string;
    date: string;
    timeRange: string;
    userFilterQuery?: string;
  };
  matches: MatchAnalysis[];
  unmatchedQueries?: UnmatchedQuery[];
  noMatchesNotice?: string;
}

const app = express();
const port = 3000;

app.use(express.json());

// Pure Real AI Match Analysis Route using Gemini with Google Search Grounding (NO TEMPLATES)
function isMatchMatchingQuery(
  match: { homeTeam?: string; awayTeam?: string; matchName?: string; league?: string },
  query: string
): boolean {
  if (!query || !query.trim()) return true;

  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zа-я0-9\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const matchFullText = normalize(
    `${match.homeTeam || ''} ${match.awayTeam || ''} ${match.matchName || ''} ${match.league || ''}`
  );

  const subQueries = query
    .split(/[,;\n\+]|\s+(?:и|and)\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);

  if (subQueries.length === 0) return true;

  return subQueries.some((subQ) => {
    const teamTokens = subQ
      .split(/\s*(?:[-—–]|(?:\bvs\b)|(?:\bv\b)|(?:\bпротив\b))\s*/i)
      .map((t) => normalize(t))
      .filter((t) => t.length >= 2);

    if (teamTokens.length >= 2) {
      return teamTokens.some((token) => {
        if (!token) return false;
        if (matchFullText.includes(token)) return true;
        const words = token.split(' ').filter((w) => w.length >= 3);
        return words.length > 0 && words.some((w) => matchFullText.includes(w));
      });
    }

    const normSubQ = normalize(subQ);
    if (matchFullText.includes(normSubQ)) return true;

    const words = normSubQ.split(' ').filter((w) => w.length >= 3);
    if (words.length > 0) {
      return words.some((w) => matchFullText.includes(w));
    }

    return matchFullText.includes(normSubQ);
  });
}

app.post('/api/analyze-matches', async (req: Request, res: Response) => {
  const {
    sport = 'football',
    date,
    startTime = '00:00',
    endTime = '23:59',
    customQuery = '',
  } = req.body;

  const targetDate = date || new Date().toISOString().split('T')[0];
  const cleanStartTime = startTime || '00:00';
  const cleanEndTime = endTime || '23:59';
  const cleanCustomQuery = typeof customQuery === 'string' ? customQuery.trim() : '';

  const cacheKey = `${sport}_${targetDate}_${cleanStartTime}_${cleanEndTime}_${cleanCustomQuery}`;

  const cached = predictionCache.get<BrotherResponse>(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const sportNamesMap: Record<string, string> = {
    football: 'Футбол (РПЛ, АПЛ, ЛЧ, Лига Европы, Ла Лига, Серия А, Бундеслига и др.)',
    hockey: 'Хоккей (КХЛ, НХЛ, ВХЛ)',
    basketball: 'Баскетбол (НБА, Евролига, Единая лига ВТБ)',
    tennis: 'Теннис (ATP, WTA турниры)',
    esports: 'Киберспорт (CS2, Dota 2)',
  };

  const sportName = sportNamesMap[sport] || 'Спорт';
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'Ключ GEMINI_API_KEY не обнаружен. Для проведения реального ИИ-анализа добавьте ключ в переменные окружения.',
    });
  }

  const todayRealYear = new Date().getFullYear();

  const isCustomMode = Boolean(cleanCustomQuery);

  const prompt = isCustomMode
    ? `
Ты — опытный спортивный аналитик «Брат», обладающий математическим чутьем и глубоким пониманием xG, составов, формы команд и движения коэффициентов.

СТРОЖАЙШЕЕ ПРАВИЛО:
ПОЛЬЗОВАТЕЛЬ ЗАПРОСИЛ АНАЛИЗ ИСКЛЮЧИТЕЛЬНО КОНКРЕТНЫХ МАТЧЕЙ:
«${cleanCustomQuery}»

В ОТВЕТЕ В МАССИВЕ "matches" ДОЛЖНЫ БЫТЬ ТОЛЬКО И ИСКЛЮЧИТЕЛЬНО ВПИСАННЫЕ МАТЧИ/КОМАНДЫ («${cleanCustomQuery}»)!
КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО:
- Включать любые сторонние матчи дня (из АПЛ, Ла Лиги, РПЛ, КХЛ или других лиг), которые пользователь НЕ вписывал.
- Добавлять матчи "для количества" или "чтобы заполнить список".
- Подменять запрошенный матч другими играми.

ЕСЛИ ПОЛЬЗОВАТЕЛЬ ВПИСАЛ ОДИН МАТЧ — В МАССИВЕ "matches" МОЖЕТ БЫТЬ МАКСИМУМ 1 ЭТОТ МАТЧ (или 0, если нет исходов с вероятностью >= 80%).

СПОРТ: ${sportName}
ДАТА: ${targetDate} (Год: ${todayRealYear})
ДИАПАЗОН ВРЕМЕНИ: с ${cleanStartTime} до ${cleanEndTime}

ПРАВИЛА ОБРАБОТКИ:
1. Используй инструмент googleSearch, чтобы найти точную информацию, время начала, статус, составы, статистику xG и коэффициенты ИМЕННО ДЛЯ ЗАПРОШЕННОГО МАТЧА: «${cleanCustomQuery}».
2. Если матч запланирован на дату ${targetDate}:
   - Проанализируй реальную форму команд, xG, личные встречи, потери в составе и мотивацию.
   - Отбери исходы с вероятностью 80% и выше (например, ТБ 1.5, Фора (+1.5) на фаворита, 1X, Индивидуальный тотал и т.д.).
   - Включи В МАССИВ matches ТОЛЬКО ЭТОТ МАТЧ (ни одного постороннего матча быть не должно!).
   - Если в этом матче нет исходов с вероятностью от 80%, НЕ добавляй никаких сторонних матчей! Оставь массив matches пустым [] и в поле "noMatchesNotice" подробно объясни, почему в матче «${cleanCustomQuery}» нет исходов от 80% (высокая непредсказуемость или риски).
3. Если запрошенный матч не играет ${targetDate} или не найден:
   - Добавь его в массив "unmatchedQueries" с указанием точной причины (например: "Матч состоится в другую дату: ...").
   - Оставь "matches" пустым ([]).

ОТВЕТ ДОЛЖЕН БЫТЬ СТРОГО В ФОРМАТЕ JSON (без разметки markdown, чистый валидный JSON):
{
  "brotherSummary": {
    "greeting": "Братский разбор матча «${cleanCustomQuery}»",
    "matchesAnalyzedTotal": 1,
    "matchesQualified": 1,
    "averageConfidence": 85,
    "brotherTip": "Конкретный полезный совет по матчу «${cleanCustomQuery}»",
    "sportName": "${sportName}",
    "date": "${targetDate}",
    "timeRange": "с ${cleanStartTime} до ${cleanEndTime}",
    "userFilterQuery": "${cleanCustomQuery}"
  },
  "unmatchedQueries": [],
  "noMatchesNotice": null,
  "matches": [
    {
      "id": "match-custom-1",
      "league": "Название турнира",
      "homeTeam": "Хозяева из запроса",
      "awayTeam": "Гости из запроса",
      "matchName": "Хозяева — Гости",
      "time": "Время начала",
      "status": "upcoming",
      "predictions": [
        {
          "event": "Исход с вероятностью >= 80%",
          "probability": 86,
          "estimatedOdds": "1.45",
          "tag": "Железобетон"
        }
      ],
      "reasoning": "Подробное обоснование на основе xG, формы и составов",
      "keyStats": [
        "Стат факт 1",
        "Стат факт 2"
      ],
      "brotherVerdict": "Короткий братский вердикт"
    }
  ]
}
`
    : `
Ты — опытный спортивный аналитик «Брат», обладающий математическим чутьем и глубоким пониманием xG, составов, формы команд и движения коэффициентов.
Твоя задача: найти РЕАЛЬНЫЕ текущие матчи через Google Search на дату ${targetDate} и отобрать ТОЛЬКО исходы с математической вероятностью 80% и выше (железобетонные ставки).

СПОРТ: ${sportName}
ДАТА МАТЧЕЙ: ${targetDate} (Текущий год: ${todayRealYear})
ДИАПАЗОН ВРЕМЕНИ НАЧАЛА: с ${cleanStartTime} до ${cleanEndTime} (по московскому времени/местному времени турнира)
Пользователь не указал конкретных матчей. Найди доступные официальные матчи по виду спорта "${sportName}" на дату ${targetDate} (год ${todayRealYear}), начинающиеся строго между ${cleanStartTime} и ${cleanEndTime}.

КРИТЕРИИ ОТБОРА МАТЧЕЙ:
1. Ищи ТОЛЬКО РЕАЛЬНЫЕ матчи, которые действительно запланированы на ${targetDate}. Используй инструмент googleSearch.
2. Проверяй время начала каждого матча. Включай в анализ ТОЛЬКО события, начинающиеся строго между ${cleanStartTime} и ${cleanEndTime}.
3. Для каждого подходящего матча анализируй реальную форму команд, очные встречи, статистику голов/шайб/очков, потери составов.
4. Отбирай ТОЛЬКО исходы с расчетной вероятностью 80% и выше (например, ТБ 1.5 в футболе, Фора (+1.5) на фаворита, Индивидуальный тотал, Победа фаворита с нулевой форой, 1X и т.д.).
5. В таблицу должны попасть ТОЛЬКО исходы с probability >= 80. Если в матче нет исходов с вероятностью >= 80%, НЕ включай этот исход.
6. Если ни одного матча в этот интервал времени нет или нет исходов с вероятностью >= 80%, верни пустой массив "matches" и заполни поле "noMatchesNotice" вежливым братским объяснением.

ОТВЕТ ДОЛЖЕН БЫТЬ СТРОГО В ФОРМАТЕ JSON (без разметки markdown, чистый валидный JSON):
{
  "brotherSummary": {
    "greeting": "Приветствие Брата с оценкой сегодняшней линии на выбранное время",
    "matchesAnalyzedTotal": 15,
    "matchesQualified": 3,
    "averageConfidence": 86,
    "brotherTip": "Конкретный полезный совет по банкролл-менеджменту или специфике сегодняшней линии",
    "sportName": "${sportName}",
    "date": "${targetDate}",
    "timeRange": "с ${cleanStartTime} до ${cleanEndTime}",
    "userFilterQuery": null
  },
  "unmatchedQueries": [],
  "noMatchesNotice": "Заполняется только если в итоге matches пуст: понятное объяснение, почему нет подходящих матчей в это время",
  "matches": [
    {
      "id": "match-1",
      "league": "Название лиги/турнира (например: АПЛ • Англия, РПЛ • Россия, КХЛ)",
      "homeTeam": "Хозяева",
      "awayTeam": "Гости",
      "matchName": "Хозяева — Гости",
      "time": "19:30",
      "status": "upcoming",
      "predictions": [
        {
          "event": "Конкретный исход (например: Тотал больше (1.5) или Фора 1 (0))",
          "probability": 88,
          "estimatedOdds": "1.45",
          "tag": "Железобетон"
        }
      ],
      "reasoning": "Подробное, аргументированное обоснование почему именно этот исход имеет вероятность от 80%: статистика xG, травмы лидеров, мотивация, форма последних 5 игр.",
      "keyStats": [
        "Статистический факт 1 с реальными цифрами",
        "Статистический факт 2 с реальными цифрами",
        "Статистический факт 3"
      ],
      "brotherVerdict": "Короткий братский вердикт простыми словами"
    }
  ]
}
`;

  try {
    const candidateModels = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash'];
    let lastError: any = null;
    let responseText = '';

    for (let i = 0; i < candidateModels.length; i++) {
      const modelName = candidateModels[i];
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });
        responseText = response.text || '';
        if (responseText) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || String(err);
        console.warn(`Model ${modelName} failed:`, msg);

        const isRateLimit = msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429') || msg.includes('quota');
        if (isRateLimit && i < candidateModels.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2500));
          continue;
        }

        if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid') || msg.includes('401')) {
          throw err;
        }
      }
    }

    if (!responseText && lastError) {
      throw lastError;
    }

    let parsed: BrotherResponse | null = null;
    let cleanText = responseText.trim();
    if (cleanText.includes('```json')) {
      cleanText = cleanText.split('```json')[1].split('```')[0].trim();
    } else if (cleanText.includes('```')) {
      cleanText = cleanText.split('```')[1].split('```')[0].trim();
    }

    try {
      parsed = JSON.parse(cleanText) as BrotherResponse;
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]) as BrotherResponse;
        } catch (parseErr) {
          console.warn('Direct regex JSON parse failed:', parseErr);
        }
      }
    }

    if (parsed) {
      if (Array.isArray(parsed.matches)) {
        parsed.matches.forEach((m) => {
          m.predictions = (m.predictions || []).filter((p) => p.probability >= 80);
        });
        parsed.matches = parsed.matches.filter((m) => m.predictions.length > 0);

        // Strict post-filtering: if the user specified custom matches, keep ONLY matches matching user query!
        if (cleanCustomQuery) {
          parsed.matches = parsed.matches.filter((m) => isMatchMatchingQuery(m, cleanCustomQuery));
          if (parsed.brotherSummary) {
            parsed.brotherSummary.matchesAnalyzedTotal = Math.max(parsed.matches.length, 1);
            parsed.brotherSummary.matchesQualified = parsed.matches.length;
          }
        }
      } else {
        parsed.matches = [];
      }

      if (parsed.matches.length === 0 && !parsed.noMatchesNotice) {
        parsed.noMatchesNotice = cleanCustomQuery
          ? `По запросу «${cleanCustomQuery}» не найдено исходов с вероятностью от 80% на ${targetDate} (матч слишком непредсказуемый либо не запланирован на выбранную дату).`
          : `В диапазоне с ${cleanStartTime} до ${cleanEndTime} на ${targetDate} событий с вероятностью от 80% не обнаружено.`;
      }

      predictionCache.set(cacheKey, parsed, 600);
      return res.json(parsed);
    }

    return res.status(502).json({
      error: 'Нейросеть сформировала нестандартный ответ. Попробуйте нажать кнопку «ПРОГНОЗ» еще раз.',
    });
  } catch (error: any) {
    console.error('Error generating predictions from Gemini API:', error);
    const rawMsg = error?.message || String(error);

    let userFriendlyError = `Ошибка Gemini API: ${rawMsg}`;
    if (rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('API key not valid') || rawMsg.includes('401')) {
      userFriendlyError = 'Неверный API ключ Gemini (API_KEY_INVALID). Проверьте ключ в Vercel: Project Settings → Environment Variables.';
    } else if (rawMsg.includes('User location is not supported') || rawMsg.includes('location')) {
      userFriendlyError = 'Региональное ограничение Google (User location is not supported). В настройках Vercel Function Region выберите регион США (us-east-1) или Франкфурт (fra1).';
    } else if (rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('429')) {
      userFriendlyError = 'Превышен минутный лимит запросов к бесплатному Gemini API (Rate Limit 429). Google ограничивает частоту бесплатных запросов в минуту. Подождите 30–60 секунд и повторите попытку.';
    } else if (rawMsg.includes('FUNCTION_INVOCATION_TIMEOUT') || rawMsg.includes('timeout') || rawMsg.includes('504')) {
      userFriendlyError = 'Таймаут ответа. Поиск по актуальным событиям занял больше времени, чем ожидалось. Попробуйте снова.';
    }

    return res.status(500).json({
      error: userFriendlyError,
    });
  }
});

// Setup Vite or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Brother Sports AI server running on port ${port}`);
  });
}

startServer();
