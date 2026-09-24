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
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || '';
    let parsed: BrotherResponse | null = null;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]) as BrotherResponse;
      } catch (parseErr) {
        console.warn('Direct regex JSON parse failed:', parseErr);
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

      predictionCache.set(cacheKey, parsed, 600);
      return res.json(parsed);
    }

    return res.status(502).json({
      error: 'Нейросеть сформировала нестандартный ответ. Попробуйте нажать кнопку «ПРОГНОЗ» еще раз.',
    });
  } catch (error: any) {
    console.error('Error generating predictions from Gemini API:', error);
    return res.status(500).json({
      error: `Ошибка Gemini API: ${error?.message || 'Не удалось выполнить поиск реальных матчей'}`,
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
