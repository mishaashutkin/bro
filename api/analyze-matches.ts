interface VercelRequest {
  method?: string;
  body?: any;
  query?: Record<string, string | string[]>;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
}

import { GoogleGenAI } from '@google/genai';

// Maximum execution duration for Vercel Serverless Function (Hobby up to 60s)
export const maxDuration = 60;

// Self-contained in-memory cache to prevent missing module resolution errors on Vercel
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlSeconds: number = 600): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }
}

const localCache = new MemoryCache();

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const {
    sport = 'football',
    date,
    startTime = '00:00',
    endTime = '23:59',
    customQuery = '',
  } = req.body || {};

  const targetDate = date || new Date().toISOString().split('T')[0];
  const cleanStartTime = startTime || '00:00';
  const cleanEndTime = endTime || '23:59';
  const cleanCustomQuery = typeof customQuery === 'string' ? customQuery.trim() : '';

  const cacheKey = `${sport}_${targetDate}_${cleanStartTime}_${cleanEndTime}_${cleanCustomQuery}`;

  const cached = localCache.get<BrotherResponse>(cacheKey);
  if (cached) {
    return res.status(200).json(cached);
  }

  const sportNamesMap: Record<string, string> = {
    football: 'Футбол (РПЛ, АПЛ, ЛЧ, Лига Европы, Ла Лига, Серия А, Бундеслига и др.)',
    hockey: 'Хоккей (КХЛ, НХЛ, ВХЛ)',
    basketball: 'Баскетбол (НБА, Евролига, Единая лига ВТБ)',
    tennis: 'Теннис (ATP, WTA турниры)',
    esports: 'Киберспорт (CS2, Dota 2)',
  };

  const sportName = sportNamesMap[sport] || 'Спорт';
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();

  if (!apiKey) {
    return res.status(500).json({
      error: 'Ключ GEMINI_API_KEY не обнаружен на Vercel. Добавьте его в Project Settings → Environment Variables и обязательно сделайте Redeploy.',
    });
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const todayRealYear = new Date().getFullYear();

  const customFilterInstruction = cleanCustomQuery
    ? `
ВНИМАНИЕ — ПОЛЬЗОВАТЕЛЬ ЗАПРОСИЛ КОНКРЕТНЫЕ МАТЧИ/КОМАНДЫ:
"${cleanCustomQuery}"

Обязательные требования к поиску пользователя:
1. Загугли и проверь расписание именно для этих команд/матчей: "${cleanCustomQuery}" на дату ${targetDate} (год ${todayRealYear}).
2. Если указанный матч не запланирован на ${targetDate} или не попадает в диапазон времени с ${cleanStartTime} до ${cleanEndTime}, ОБЯЗАТЕЛЬНО добавь его в массив "unmatchedQueries" с подробным объяснением причины: "Матч не играет в указанный диапазон времени с ${cleanStartTime} до ${cleanEndTime}" или "Такое событие не найдено в расписании на ${targetDate}".
3. Если матч действительно играет в интервале с ${cleanStartTime} до ${cleanEndTime}, проведи его глубокий анализ и включи в "matches" только те исходы, вероятность которых >= 80%.
`
    : `
Пользователь не указал конкретных матчей. Найди ВСЕ доступные официальные матчи по виду спорта "${sportName}" на дату ${targetDate} (год ${todayRealYear}), начинающиеся строго между ${cleanStartTime} и ${cleanEndTime}.
`;

  const prompt = `
Ты — опытный спортивный аналитик «Брат», обладающий математическим чутьем и глубоким пониманием xG, составов, формы команд и движения коэффициентов.
Твоя задача: найти РЕАЛЬНЫЕ текущие матчи через Google Search на дату ${targetDate} и отобрать ТОЛЬКО исходы с математической вероятностью 80% и выше (железобетонные ставки).

СПОРТ: ${sportName}
ДАТА МАТЧЕЙ: ${targetDate} (Текущий год: ${todayRealYear})
ДИАПАЗОН ВРЕМЕНИ НАЧАЛА: с ${cleanStartTime} до ${cleanEndTime} (по московскому времени/местному времени турнира)
${customFilterInstruction}

КРИТЕРИИ ОТБОРА МАТЧЕЙ:
1. Ищи ТОЛЬКО РЕАЛЬНЫЕ матчи, которые действительно запланированы на ${targetDate}. Используй инструмент googleSearch.
2. Проверяй время начала каждого матча. Включай в анализ ТОЛЬКО события, начинающиеся строго между ${cleanStartTime} и ${cleanEndTime}.
3. Для каждого подходящего матча анализируй реальную форму команд, очные встречи, статистику голов/шайб/очков, потери составов.
4. Отбирай ТОЛЬКО исходы с расчетной вероятностью 80% и выше (например, ТБ 1.5 в футболе, Фора (+1.5) на фаворита, Индивидуальный тотал, Победа фаворита с нулевой форой, 1X и т.д.).
5. В таблицу должны попасть ТОЛЬКО исходы с probability >= 80. Если в матче нет исходов с вероятностью >= 80%, НЕ включай этот исход.
6. Если ни одного матча в этот интервал времени нет или нет исходов с вероятностью >= 80%, верни пустой массив "matches" и заполни поле "noMatchesNotice" вежливым братским объяснением.
7. Если пользователь вписал конкретный матч, но он играет в другое время или не играет сегодня, ОБЯЗАТЕЛЬНО добавь его в "unmatchedQueries" с точной причиной.

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
    "userFilterQuery": ${cleanCustomQuery ? `"${cleanCustomQuery}"` : 'null'}
  },
  "unmatchedQueries": [
    {
      "query": "Название команды или матча из запроса пользователя",
      "reason": "Матч играет в 22:45, что позже указанного окончания 21:00 (или: Матч не запланирован на ${targetDate})"
    }
  ],
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
          break; // successfully got response
        }
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || String(err);
        console.warn(`Model ${modelName} failed:`, msg);

        const isRateLimit = msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429') || msg.includes('quota');
        if (isRateLimit && i < candidateModels.length - 1) {
          // Wait 2.5 seconds before attempting fallback model
          await new Promise((resolve) => setTimeout(resolve, 2500));
          continue;
        }

        // If it's an authorization/key error, break early
        if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid') || msg.includes('401')) {
          throw err;
        }
      }
    }

    if (!responseText && lastError) {
      throw lastError;
    }

    let parsed: BrotherResponse | null = null;

    // 1. Try markdown code block extraction
    let cleanText = responseText.trim();
    if (cleanText.includes('```json')) {
      cleanText = cleanText.split('```json')[1].split('```')[0].trim();
    } else if (cleanText.includes('```')) {
      cleanText = cleanText.split('```')[1].split('```')[0].trim();
    }

    try {
      parsed = JSON.parse(cleanText) as BrotherResponse;
    } catch {
      // 2. Regex fallback
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]) as BrotherResponse;
        } catch (parseErr) {
          console.warn('Regex JSON parsing failed:', parseErr);
        }
      }
    }

    if (parsed) {
      if (Array.isArray(parsed.matches)) {
        parsed.matches.forEach((m) => {
          m.predictions = (m.predictions || []).filter((p) => p.probability >= 80);
        });
        parsed.matches = parsed.matches.filter((m) => m.predictions.length > 0);
      } else {
        parsed.matches = [];
      }

      if (parsed.matches.length === 0 && !parsed.noMatchesNotice) {
        parsed.noMatchesNotice = cleanCustomQuery
          ? `События по запросу «${cleanCustomQuery}» в интервал времени с ${cleanStartTime} до ${cleanEndTime} не найдены либо вероятность исхода ниже 80%.`
          : `В диапазоне с ${cleanStartTime} до ${cleanEndTime} на ${targetDate} событий с вероятностью от 80% не обнаружено.`;
      }

      localCache.set(cacheKey, parsed, 600);
      return res.status(200).json(parsed);
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
}
