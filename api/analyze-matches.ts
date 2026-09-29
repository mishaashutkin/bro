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
import { translateTeamNameToRussian, translateMatchNameToRussian } from './russian-names';

// Maximum execution duration for Vercel Serverless Function (Hobby up to 60s)
export const maxDuration = 60;

/**
 * Self-contained Bookmaker Line Fetcher (embedded to prevent ERR_MODULE_NOT_FOUND on Vercel)
 */
export interface RealMatchItem {
  id: string;
  matchName: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  time: string; // HH:MM
  sport: string;
  source: string;
  tier?: number;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function timeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function isTimeInRange(matchTime: string, startTimeStr?: string, endTimeStr?: string): boolean {
  if (!startTimeStr && !endTimeStr) return true;
  const matchMin = timeToMinutes(matchTime);
  if (matchMin === null) return true;

  const startMin = startTimeStr ? timeToMinutes(startTimeStr) : 0;
  const endMin = endTimeStr ? timeToMinutes(endTimeStr) : 1439;

  if (startMin !== null && endMin !== null) {
    if (startMin <= endMin) {
      return matchMin >= startMin && matchMin <= endMin;
    } else {
      return matchMin >= startMin || matchMin <= endMin;
    }
  }
  return true;
}

function getLeagueTier(league: string): number {
  const l = league.toLowerCase();
  if (
    l.includes('champions league') ||
    l.includes('лига чемпионов') ||
    l.includes('nations league') ||
    l.includes('лига наций') ||
    l.includes('premier league') ||
    l.includes('апл') ||
    l.includes('англия') ||
    l.includes('la liga') ||
    l.includes('испания') ||
    l.includes('serie a') ||
    l.includes('италия') ||
    l.includes('bundesliga') ||
    l.includes('германия') ||
    l.includes('ligue 1') ||
    l.includes('франция') ||
    l.includes('рпл') ||
    l.includes('rpl') ||
    l.includes('россия') ||
    l.includes('khl') ||
    l.includes('кхл') ||
    l.includes('nhl') ||
    l.includes('нхл') ||
    l.includes('euroleague') ||
    l.includes('евролига') ||
    l.includes('nba') ||
    l.includes('нба')
  ) {
    return 1;
  }
  if (
    l.includes('europa') ||
    l.includes('conference') ||
    l.includes('championship') ||
    l.includes('eredivisie') ||
    l.includes('primeira') ||
    l.includes('vhl') ||
    l.includes('вхл') ||
    l.includes('vtb') ||
    l.includes('acb') ||
    l.includes('atp') ||
    l.includes('wta')
  ) {
    return 2;
  }
  return 3;
}

const ruMonthsMap: Record<string, number> = {
  янв: 1,
  фев: 2,
  мар: 3,
  апр: 4,
  май: 5,
  июн: 6,
  июл: 7,
  авг: 8,
  сен: 9,
  окт: 10,
  ноя: 11,
  дек: 12,
};

async function fetchFromMarathon(sportKey: string, targetDateStr: string): Promise<RealMatchItem[]> {
  const sportMap: Record<string, { id: string; name: string }> = {
    football: { id: '11', name: 'Футбол' },
    hockey: { id: '537', name: 'Хоккей' },
    basketball: { id: '43658', name: 'Баскетбол' },
    tennis: { id: '2373', name: 'Теннис' },
  };

  const sportsToFetch =
    sportKey === 'all'
      ? Object.values(sportMap)
      : [sportMap[sportKey] || sportMap.football];

  const allMatches: RealMatchItem[] = [];

  const [tYear, tMonth, tDay] = targetDateStr.split('-').map(Number);
  const nowMsk = new Date();
  const mskDateStr = nowMsk.toLocaleDateString('en-CA', { timeZone: 'Europe/Moscow' });
  const isTargetToday = targetDateStr === mskDateStr;

  for (const cfg of sportsToFetch) {
    try {
      const url = `https://www.marathonbet.ru/su/popular/${encodeURIComponent(cfg.name)}+-+${cfg.id}?period=TODAY`;
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(4500),
      });

      if (!res.ok) continue;
      const html = await res.text();

      const regex =
        /data-event-name="([^"]+)"[\s\S]*?data-event-path="([^"]+)"([\s\S]*?)(?=data-event-name="|$)/g;

      for (const m of html.matchAll(regex)) {
        const rawName = m[1]?.trim();
        if (!rawName) continue;

        const path = decodeURIComponent((m[2] || '').replace(/\+/g, ' '));
        const chunk = m[3] || '';

        const timeMatch = chunk.match(/class="date-wrapper">([^<]+)<\/div>/);
        const rawTime = timeMatch ? timeMatch[1].trim() : '';

        const dateMatch = rawTime.match(/(\d{1,2})\s+([а-яё]{3})/i);
        const cleanTimeMatch = rawTime.match(/(\d{1,2}:\d{2})/);
        const cleanTime = cleanTimeMatch ? cleanTimeMatch[1] : '';

        if (dateMatch) {
          const day = parseInt(dateMatch[1], 10);
          const monthName = dateMatch[2].toLowerCase();
          const month = ruMonthsMap[monthName];
          if (!month || day !== tDay || month !== tMonth) {
            continue;
          }
        } else if (cleanTime) {
          if (!isTargetToday) {
            continue;
          }
        } else {
          continue;
        }

        let teamNames: string[] = [];
        const jsonMatch = chunk.match(/data-json="([^"]+)"/);
        if (jsonMatch) {
          try {
            const decoded = jsonMatch[1]
              .replace(/&quot;/g, '"')
              .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
            const parsed = JSON.parse(decoded);
            if (Array.isArray(parsed.teamNames)) {
              teamNames = parsed.teamNames;
            }
          } catch {}
        }

        const parts = rawName.split(/\s*-\s*|\s+vs\.?\s+/i);
        const rawHome = (teamNames[0] || parts[0] || '').trim();
        const rawAway = (teamNames[1] || parts[1] || '').trim();
        if (!rawHome || !rawAway) continue;

        const homeTeam = translateTeamNameToRussian(rawHome);
        const awayTeam = translateTeamNameToRussian(rawAway);

        const pathSegments = path.split('/');
        let league = pathSegments.slice(2, -1).join(' • ') || pathSegments[1] || cfg.name;
        league = league.replace(/\+/g, ' ').trim();

        allMatches.push({
          id: `bk-${allMatches.length + 1}-${homeTeam.slice(0, 3)}`,
          matchName: `${homeTeam} — ${awayTeam}`,
          homeTeam,
          awayTeam,
          league,
          time: cleanTime || '19:00',
          sport: cfg.name,
          source: 'Линия БК Марафон / Фонбет',
          tier: getLeagueTier(league),
        });
      }
    } catch (err: any) {
      console.warn(`Marathon fetch failed for ${cfg.name}:`, err?.message || err);
    }
  }

  return allMatches;
}

async function fetchFromLiveScore(sportKey: string, dateStr: string): Promise<RealMatchItem[]> {
  const sportSlugs: Record<string, string> = {
    football: 'soccer',
    hockey: 'hockey',
    basketball: 'basketball',
    tennis: 'tennis',
  };

  const slugsToFetch =
    sportKey === 'all'
      ? ['soccer', 'hockey', 'basketball', 'tennis']
      : [sportSlugs[sportKey] || 'soccer'];

  const formattedDate = dateStr.replace(/-/g, '');
  const allMatches: RealMatchItem[] = [];

  const promises = slugsToFetch.map(async (slug) => {
    try {
      const url = `https://prod-public-api.livescore.com/v1/api/app/date/${slug}/${formattedDate}/3`;
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) return [];
      const data = await res.json();
      const list: RealMatchItem[] = [];

      for (const stage of data.Stages || []) {
        const league = `${stage.Cnm || ''} • ${stage.Snm || ''}`.trim().replace(/^•\s*|\s*•$/g, '');
        for (const ev of stage.Events || []) {
          const rawHome = ev.T1?.[0]?.Nm?.trim();
          const rawAway = ev.T2?.[0]?.Nm?.trim();
          if (!rawHome || !rawAway) continue;

          if (!ev.Esd || String(ev.Esd).length < 12) continue;
          const esdStr = String(ev.Esd);
          const eventDate = esdStr.slice(0, 8);
          if (eventDate !== formattedDate) {
            continue;
          }

          const time = `${esdStr.slice(8, 10)}:${esdStr.slice(10, 12)}`;
          const homeTeam = translateTeamNameToRussian(rawHome);
          const awayTeam = translateTeamNameToRussian(rawAway);

          list.push({
            id: `ls-${ev.Eid || list.length + 1}`,
            matchName: `${homeTeam} — ${awayTeam}`,
            homeTeam,
            awayTeam,
            league: league || 'Международный турнир',
            time: time,
            sport: slug === 'soccer' ? 'football' : slug,
            source: 'LiveScore Global Feed',
            tier: getLeagueTier(league),
          });
        }
      }
      return list;
    } catch (err: any) {
      console.warn(`LiveScore fetch failed for ${slug}:`, err?.message || err);
      return [];
    }
  });

  const settled = await Promise.all(promises);
  for (const group of settled) {
    allMatches.push(...group);
  }

  return allMatches;
}

async function getRealMatchesForDay(
  sportKey: string,
  dateStr: string,
  startTime?: string,
  endTime?: string,
  customQuery?: string,
  matchDepth: 'max' | 'standard' | 'compact' = 'max'
): Promise<RealMatchItem[]> {
  let results: RealMatchItem[] = [];
  const seenMatches = new Set<string>();

  const addMatch = (m: RealMatchItem) => {
    const key = `${m.homeTeam.toLowerCase().replace(/[\s\-_]/g, '')}_vs_${m.awayTeam.toLowerCase().replace(/[\s\-_]/g, '')}`;
    if (!seenMatches.has(key)) {
      seenMatches.add(key);
      results.push(m);
    }
  };

  try {
    const marathonMatches = await fetchFromMarathon(sportKey, dateStr);
    for (const m of marathonMatches) {
      addMatch(m);
    }
  } catch (err: any) {
    console.warn('Marathon line fetch error:', err?.message || err);
  }

  try {
    const liveScoreMatches = await fetchFromLiveScore(sportKey, dateStr);
    for (const m of liveScoreMatches) {
      addMatch(m);
    }
  } catch (err: any) {
    console.warn('LiveScore fetch error:', err?.message || err);
  }

  if (customQuery && customQuery.trim()) {
    const qLower = customQuery.toLowerCase().trim();
    const queryParts = qLower.split(/[\s\-–—vs.]+/).filter((w) => w.length >= 3);

    const matchedCustom = results.filter((m) => {
      const matchText = `${m.homeTeam} ${m.awayTeam} ${m.matchName} ${m.league}`.toLowerCase();
      if (matchText.includes(qLower)) return true;
      if (queryParts.length > 0 && queryParts.some((part) => matchText.includes(part))) return true;
      return false;
    });

    if (matchedCustom.length > 0) {
      if (startTime || endTime) {
        const inTime = matchedCustom.filter((m) => isTimeInRange(m.time, startTime, endTime));
        if (inTime.length > 0) return inTime;
      }
      return matchedCustom;
    }
  }

  if (startTime || endTime) {
    results = results.filter((m) => isTimeInRange(m.time, startTime, endTime));
  }

  // Filter and prioritize based on depth option:
  // Максимальный = все матчи (по максимуму)
  // Стандартный = только известные матчи (по максимуму)
  // Компактный = малопопулярные матчи (по максимуму)
  if (matchDepth === 'standard') {
    const known = results.filter((m) => (m.tier || 3) <= 2);
    if (known.length > 0) {
      results = known;
    }
    results.sort((a, b) => (a.tier || 3) - (b.tier || 3));
  } else if (matchDepth === 'compact') {
    const niche = results.filter((m) => (m.tier || 3) >= 3);
    if (niche.length > 0) {
      results = niche;
    }
  } else {
    // max: all matches
    results.sort((a, b) => (a.tier || 3) - (b.tier || 3));
  }

  return results.slice(0, 1000);
}

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
  isCombo?: boolean;
  comboItems?: string[];
}

export interface MatchAnalysis {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  matchName: string;
  time: string;
  status: string;
  source?: string;
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
    lineSource?: string;
  };
  matches: MatchAnalysis[];
  unmatchedQueries?: UnmatchedQuery[];
  noMatchesNotice?: string;
}

// Cache search tool exhaustion state to avoid wasting time on repeated failing search calls
let searchQuotaExhaustedUntil = 0;

function parseRobustBrotherResponse(responseText: string): BrotherResponse | null {
  if (!responseText || !responseText.trim()) return null;
  let text = responseText.trim();

  if (text.includes('```json')) {
    text = text.split('```json')[1].split('```')[0].trim();
  } else if (text.includes('```')) {
    text = text.split('```')[1].split('```')[0].trim();
  }

  // 1. Direct parse attempt
  try {
    const res = JSON.parse(text);
    if (res && (Array.isArray(res.matches) || res.brotherSummary)) return res as BrotherResponse;
  } catch {}

  // 2. Extract outermost JSON object candidate
  const firstBrace = text.indexOf('{');
  if (firstBrace !== -1) {
    const candidate = text.slice(firstBrace);
    try {
      const res = JSON.parse(candidate);
      if (res && (Array.isArray(res.matches) || res.brotherSummary)) return res as BrotherResponse;
    } catch {}

    // 3. Repair JSON cut off at max token limit
    const lastBrace = candidate.lastIndexOf('}');
    if (lastBrace !== -1) {
      const trimmedCandidate = candidate.slice(0, lastBrace + 1);
      const closeAttempts = [']}', ']}', '] }', '}', '}}', '"}]}', '"]}}'];
      for (const close of closeAttempts) {
        try {
          const res = JSON.parse(trimmedCandidate + close);
          if (res && (Array.isArray(res.matches) || res.brotherSummary)) return res as BrotherResponse;
        } catch {}
      }
    }
  }

  return null;
}

// Resilient generation cascade across healthy models with automatic backoff on 503/429
async function generatePredictionWithCascade(prompt: string, aiInstance: GoogleGenAI): Promise<string> {
  const models = [
    'gemini-3.1-flash-lite-preview',
    'gemini-3-flash-preview',
    'gemini-3.6-flash',
    'gemini-3.8-flash',
    'gemini-3.5-flash-lite',
  ];

  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await aiInstance.models.generateContent({
          model,
          contents: prompt,
          config: {
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
          },
        });
        const text = response.text || '';
        if (text.trim()) {
          console.log(`Successfully generated prediction using ${model} (attempt ${attempt + 1})`);
          return text;
        }
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || String(err);
        const status = err?.status || (err?.code ? Number(err.code) : null);
        console.warn(`Model ${model} attempt ${attempt + 1} failed:`, msg.slice(0, 90));

        if (
          msg.includes('API_KEY_INVALID') ||
          msg.includes('API key not valid') ||
          msg.includes('401') ||
          msg.includes('PERMISSION_DENIED') ||
          msg.includes('leaked') ||
          msg.includes('403')
        ) {
          throw err;
        }

        const isRetryable =
          status === 503 ||
          msg.includes('503') ||
          status === 429 ||
          msg.includes('429') ||
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('UNAVAILABLE');

        if (attempt === 0 && isRetryable) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        break;
      }
    }
  }

  if (lastError) throw lastError;
  throw new Error('Не удалось сгенерировать прогноз. Попробуйте еще раз.');
}

export function isMatchMatchingQuery(
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const {
    sport = 'football',
    date,
    startTime = '00:00',
    endTime = '12:00',
    customQuery = '',
    matchDepth = 'max',
  } = req.body || {};

  const targetDate = date || new Date().toISOString().split('T')[0];
  const cleanStartTime = startTime || '00:00';
  const cleanEndTime = endTime || '12:00';
  const cleanCustomQuery = typeof customQuery === 'string' ? customQuery.trim() : '';
  const cleanMatchDepth = ['max', 'standard', 'compact'].includes(matchDepth) ? matchDepth : 'max';

  const cacheKey = `v5_${sport}_${targetDate}_${cleanStartTime}_${cleanEndTime}_${cleanCustomQuery}_${cleanMatchDepth}`;

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
  });

  const todayRealYear = new Date().getFullYear();

  const isCustomMode = Boolean(cleanCustomQuery);

  // Fetch real matches directly from Bookmaker line (BC Marathon / Fonbet / LiveScore)
  let realBookmakerMatches: RealMatchItem[] = [];
  try {
    realBookmakerMatches = await getRealMatchesForDay(
      sport,
      targetDate,
      cleanStartTime,
      cleanEndTime,
      cleanCustomQuery,
      cleanMatchDepth
    );
  } catch (err) {
    console.warn('Could not pre-fetch bookmaker matches in Vercel function:', err);
  }

  // All 3 modes study events to the maximum extent:
  // Максимальный = все матчи
  // Стандартный = только известные матчи
  // Компактный = малопопулярные матчи
  const contextLimit = 300;
  const targetMin = 35;
  const targetMax = 75;
  const targetRecommend = '40-70';
  const baselineAnalyzed = 480;

  const modeInstructionText =
    cleanMatchDepth === 'standard'
      ? 'РЕЖИМ: СТАНДАРТНЫЙ (ТОЛЬКО ИЗВЕСТНЫЕ МАТЧИ ПО МАКСИМУМУ). Изучить ПО МАКСИМУМУ исключительно известные, рейтинговые и топовые матчи тура (РПЛ, АПЛ, Ла Лига, Серия А, Бундеслига, Лига Чемпионов, Лига Европы, КХЛ, НХЛ, НБА и др.). Отобрать максимум качественных исходов от 80%+ надежности!'
      : cleanMatchDepth === 'compact'
      ? 'РЕЖИМ: КОМПАКТНЫЙ (МАЛОПОПУЛЯРНЫЕ МАТЧИ ПО МАКСИМУМУ). Изучить ПО МАКСИМУМУ исключительно малопопулярные, немедийные события (низшие лиги, смоллмаркеты, вторые/третьи дивизионы, региональные чемпионаты). Отобрать максимум качественных исходов от 80%+ надежности среди малопопулярных матчей!'
      : 'РЕЖИМ: МАКСИМАЛЬНЫЙ (ВСЕ МАТЧИ ДНЯ ПО МАКСИМУМУ). Провести максимальный аудит абсолютно всей доступной линии БК (и топ-лиги, и средние лиги, и смоллмаркеты). Отобрать максимум надежных исходов с вероятностью от 80%!';

  const realMatchesContext =
    realBookmakerMatches.length > 0
      ? realBookmakerMatches
          .slice(0, contextLimit)
          .map((m, i) => `${i + 1}. [${m.league}] ${m.matchName} | Время: ${m.time} | Источник: ${m.source}`)
          .join('\n')
      : '';

  const prompt = isCustomMode
    ? `
Ты — опытный спортивный аналитик «Брат», обладающий математическим чутьем и глубоким пониманием xG, составов, формы команд и движения коэффициентов.

ПОЛЬЗОВАТЕЛЬ ЗАПРОСИЛ АНАЛИЗ ИСКЛЮЧИТЕЛЬНО КОНКРЕТНОГО МАТЧА / КОМАНД:
«${cleanCustomQuery}»

${
  realMatchesContext
    ? `РЕАЛЬНЫЙ МАТЧ, НАЙДЕННЫЙ В СЕГОДНЯШНЕЙ ЛИНИИ БУКМЕКЕРСКОЙ КОНТОРЫ:
${realMatchesContext}`
    : ''
}

ТВОЯ ГЛАВНАЯ ЗАДАЧА:
Провести глубокий детальный анализ и математический расчет исходов ИМЕННО ДЛЯ МАТЧА «${cleanCustomQuery}»!
КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО:
- Заявлять, что матч якобы «не запланирован», «не найден» или «состоится в другую дату». Пользователь ввел этот матч — значит он играет и требует твоего экспертного разбора!
- Оставлять массив "matches" пустым ([]).
- Добавлять в массив "unmatchedQueries" запрошенный матч. Поле "unmatchedQueries" ДОЛЖНО БЫТЬ ПУСТЫМ ([]).
- Включать любые посторонние матчи (в массиве "matches" должен быть ровно 1 запрошенный матч «${cleanCustomQuery}»).

СПОРТ: ${sportName}
ДАТА: ${targetDate} (Год: ${todayRealYear})
ДИАПАЗОН ВРЕМЕНИ: с ${cleanStartTime} до ${cleanEndTime}

ПРАВИЛА АНАЛИЗА:
1. Проанализируй реальную форму команд, профиль xG (созданные и допущенные моменты), очные встречи, мотивацию, травмы и тактический рисунок соперников.
2. Отбери железобетонные исходы с математической вероятностью 80% и выше (например: ТБ 1.5, Фора (+1.5) на аутсайдера или Фора (0) на фаворита, 1X / X2, Индивидуальный тотал больше 1.0, Победа фаворита и т.д.).
3. В массив "matches" включи ровно этот матч:
   - "id": "match-custom-1"
   - "league": название лиги/турнира (например, РПЛ, АПЛ, Ла Лига, Серия А, КХЛ, ЛЧ)
   - "homeTeam": название первой команды
   - "awayTeam": название второй команды
   - "matchName": "Команда 1 — Команда 2"
   - "time": ориентировочное время начала (например: 19:30, 20:45 или 21:00)
   - "status": "upcoming"
   - "predictions": от 1 до 3 исходов с probability >= 80, estimatedOdds, tag: "Железобетон"
   - "reasoning": подробное профессиональное обоснование с xG, анализом формы и ключевыми факторами
   - "keyStats": 2-3 ключевых статистических факта
   - "brotherVerdict": емкий братский вердикт простыми словами.

ОТВЕТ ДОЛЖЕН БЫТЬ СТРОГО В ФОРМАТЕ JSON (без markdown, чистый валидный JSON):
{
  "brotherSummary": {
    "greeting": "Братский разбор матча «${cleanCustomQuery}»",
    "matchesAnalyzedTotal": 1,
    "matchesQualified": 1,
    "averageConfidence": 86,
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
      "homeTeam": "Хозяева",
      "awayTeam": "Гости",
      "matchName": "Хозяева — Гости",
      "time": "20:00",
      "status": "upcoming",
      "predictions": [
        {
          "event": "Исход с вероятностью >= 80%",
          "probability": 86,
          "estimatedOdds": "1.42",
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
${modeInstructionText}
Твоя задача: детально проанализировать массив РЕАЛЬНЫХ МАТЧЕЙ ИЗ ОФИЦИАЛЬНОЙ ЛИНИИ БУКМЕКЕРСКОЙ КОНТОРЫ на дату ${targetDate} и отобрать от ${targetMin} до ${targetMax} матчей (рекомендуемый объем: ${targetRecommend} матчей) с максимальной математической вероятностью от 80% до 98% (железобетон).

${
  realMatchesContext
    ? `ОФИЦИАЛЬНЫЙ СПИСОК РЕАЛЬНЫХ МАТЧЕЙ ИЗ ЛИНИИ БК (ФОНБЕТ / БК МАРАФОН / LIVESCORE) НА СЕГОДНЯ (${targetDate}) В ДИАПАЗОНЕ С ${cleanStartTime} ДО ${cleanEndTime} (ВСЕГО ${realBookmakerMatches.length} РЕАЛЬНЫХ СОБЫТИЙ В ЛИНИИ):
${realMatchesContext}

СТРОЖАЙШЕЕ ПРАВИЛО:
Ты ОБЯЗАН провести аудит ВСЕХ этих событий и отобрать в массив "matches" МАКСИМАЛЬНО РАСШИРЕННЫЙ СПИСОК: от ${targetMin} до ${targetMax} РЕАЛЬНЫХ МАТЧЕЙ (если в списке передано меньше ${targetMin} матчей, возьми все доступные события)!
КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО ограничиваться 3-5 или 10 матчами! Пользователю нужна большая развернутая таблица от ${targetMin} до ${targetMax} матчей с высочайшей математической надежностью!
Все матчи должны быть СТРОГО И ИСКЛЮЧИТЕЛЬНО ИЗ СПИСКА РЕАЛЬНЫХ МАТЧЕЙ ВЫШЕ!
Категорически запрещено выдумывать матчи, которых нет в этом списке!
Сохраняй реальные названия команд, лигу и точное время начала из списка!`
    : `СПОРТ: ${sportName}
ДАТА МАТЧЕЙ: ${targetDate} (Год: ${todayRealYear})
ДИАПАЗОН ВРЕМЕНИ НАЧАЛА: с ${cleanStartTime} до ${cleanEndTime}
Пользователь не указал конкретных команд. Выбери от ${targetMin} до ${targetMax} наиболее рейтинговых, интересных и ликвидных матчей тура в топовых лигах (для футбола: РПЛ, АПЛ, Ла Лига, Серия А, Бундеслига, Лига Чемпионов; для хоккея: КХЛ, НХЛ; для баскетбола: Единая лига ВТБ, Евролига, НБА), начинающихся в диапазоне с ${cleanStartTime} до ${cleanEndTime}. Выдай от ${targetMin} до ${targetMax} матчей!`
}

КРИТЕРИИ ОТБОРА ИСХОДОВ:
1. Для каждого выбранного матча проведи глубокий расчет xG, формы команд в последних 5 встречах и очных поединков.
2. Отбери ТОЛЬКО исходы с математической вероятностью 80% и выше (например, ТБ 1.5, Фора (+1.5) на фаворита или андердога, 1X / X2, Индивидуальный тотал больше 1.0, Победа с форой 0).
3. СТРОЖАЙШЕЕ ТРЕБОВАНИЕ К РУССКОМУ ЯЗЫКУ:
   ВСЕ НАЗВАНИЯ МАТЧЕЙ, КОМАНД, ЛИГ И ПРОГНОЗОВ ОБЯЗАНЫ БЫТЬ СТРОГО НА РУССКОМ ЯЗЫКЕ!
   Категорически запрещено оставлять названия команд на английском языке или латинице!
   Если в списке название команды на английском (например, Arsenal, Real Madrid, Bayern Munich, Inter, Chelsea, Manchester City, Juventus, Barcelona, PSG, Serbia, Netherlands и т.д.), ты ОБЯЗАН написать его общепринятое название на русском языке (Арсенал, Реал Мадрид, Бавария, Интер, Челси, Манчестер Сити, Ювентус, Барселона, ПСЖ, Сербия, Нидерланды)!
   Поля "homeTeam", "awayTeam", "matchName" ("Хозяева — Гости"), "league" и "event" должны быть исключительно на русском языке!
4. В массив "matches" включи от ${targetMin} до ${targetMax} качественных матчей (большой развернутый список от ${targetMin} до ${targetMax} событий с надежностью 80%+!).
5. Чтобы ответ уместился полностью и был предельно информативным:
   - В reasoning: пиши емко и четко (1-2 плотных предложения с цифрами xG и формой).
   - В keyStats: ровно 2 конкретных факта.
   - В brotherVerdict: 1 емкий вердикт.
6. Поле "unmatchedQueries" должно быть пустым ([]).
7. СТРОЖАЙШЕЕ ПРАВИЛО ГРУППИРОВКИ ПО ЛИГАМ:
   Матчи в массиве "matches" ОБЯЗАНЫ быть сгруппированы по лигам и турнирам! Все матчи одной лиги (например, все матчи РПЛ или Лиги Наций) должны следовать СТРОГО ДРУГ ЗА ДРУГОМ (подряд), а не вперемешку!

ОТВЕТ ДОЛЖЕН БЫТЬ СТРОГО В ФОРМАТЕ JSON (без markdown, чистый валидный JSON):
{
  "brotherSummary": {
    "greeting": "Приветствие Брата с оценкой линии на выбранное время",
    "matchesAnalyzedTotal": ${Math.max(realBookmakerMatches.length, baselineAnalyzed)},
    "matchesQualified": ${targetRecommend.includes('-') ? targetRecommend.split('-')[0] : 35},
    "averageConfidence": 87,
    "brotherTip": "Конкретный полезный совет по банкролл-менеджменту",
    "sportName": "${sportName}",
    "date": "${targetDate}",
    "timeRange": "с ${cleanStartTime} до ${cleanEndTime}",
    "userFilterQuery": null
  },
  "unmatchedQueries": [],
  "noMatchesNotice": null,
  "matches": [
    {
      "id": "match-1",
      "league": "Название лиги/турнира",
      "homeTeam": "Хозяева",
      "awayTeam": "Гости",
      "matchName": "Хозяева — Гости",
      "time": "19:30",
      "status": "upcoming",
      "predictions": [
        {
          "event": "Конкретный исход с probability >= 80%",
          "probability": 87,
          "estimatedOdds": "1.42",
          "tag": "Железобетон"
        }
      ],
      "reasoning": "Подробное аргументированное обоснование с цифрами xG и формы",
      "keyStats": [
        "Статистический факт 1 с реальными цифрами",
        "Статистический факт 2"
      ],
      "brotherVerdict": "Короткий братский вердикт простыми словами"
    }
  ]
}
`;

  try {
    let responseText = '';

    // Step 1: Optional Google Search Grounding for custom queries without line match
    if (isCustomMode && realBookmakerMatches.length === 0) {
      const isSearchQuotaExhausted = Date.now() < searchQuotaExhaustedUntil;
      if (!isSearchQuotaExhausted) {
        try {
          const searchPromise = ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
              tools: [{ googleSearch: {} }],
              maxOutputTokens: 8192,
              responseMimeType: 'application/json',
            },
          });
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('SEARCH_GROUNDING_TIMEOUT')), 5000)
          );

          const response = await Promise.race([searchPromise, timeoutPromise]);
          responseText = response.text || '';
        } catch (searchErr: any) {
          const msg = searchErr?.message || String(searchErr);
          console.warn('Search-grounded call skipped:', msg.slice(0, 90));
          if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429') || msg.includes('SEARCH_GROUNDING_TIMEOUT')) {
            searchQuotaExhaustedUntil = Date.now() + 15 * 60 * 1000;
          }
        }
      }
    }

    // Step 2: Direct high-speed generation across robust cascade of models
    if (!responseText) {
      responseText = await generatePredictionWithCascade(prompt, ai);
    }

    const parsed: BrotherResponse | null = parseRobustBrotherResponse(responseText);

    if (parsed) {
      if (Array.isArray(parsed.matches)) {
        parsed.matches.forEach((m) => {
          // Normalize and translate team and match names to Russian
          m.homeTeam = translateTeamNameToRussian(m.homeTeam);
          m.awayTeam = translateTeamNameToRussian(m.awayTeam);
          m.matchName = translateMatchNameToRussian(m.matchName, m.homeTeam, m.awayTeam);

          m.predictions = (m.predictions || []).filter((p) => p.probability >= 80);
          if (!m.source) {
            m.source = 'Линия БК Марафон / LiveScore';
          }

          // 1. Detect and standardize existing combo predictions
          m.predictions.forEach((p) => {
            const evLower = p.event.toLowerCase();
            const tagLower = (p.tag || '').toLowerCase();
            const hasComboKeyword =
              p.isCombo === true ||
              tagLower.includes('комбо') ||
              evLower.includes('комбо') ||
              evLower.includes(' + ') ||
              (p.comboItems && p.comboItems.length > 1) ||
              evLower.includes('победа 1, обе забьют') ||
              evLower.includes('п1, оз') ||
              evLower.includes('п1 + оз');

            if (hasComboKeyword) {
              p.isCombo = true;
              p.tag = '🔥 Комбо';

              if (!p.comboItems || p.comboItems.length === 0) {
                const cleaned = p.event.replace(/^комбо:?\s*/i, '');
                const parts = cleaned
                  .split(/\s*\+\s*|\s*,\s*(?=[а-яa-z0-9])/i)
                  .map((s) => s.trim())
                  .filter(Boolean);
                if (parts.length > 1) {
                  p.comboItems = parts;
                } else {
                  p.comboItems = [cleaned];
                }
              }
            }
          });

          // 2. If match has multiple single predictions and no combo yet, synthesize a high-value combo
          const hasExistingCombo = m.predictions.some((p) => p.isCombo);
          if (!hasExistingCombo && m.predictions.length >= 2) {
            const p1 = m.predictions[0];
            const p2 = m.predictions[1];
            const comboOdds = (
              (parseFloat(p1.estimatedOdds) || 1.45) *
              (parseFloat(p2.estimatedOdds) || 1.5) *
              0.85
            ).toFixed(2);

            const synthesizedCombo: MatchPrediction = {
              event: `КОМБО: ${p1.event} + ${p2.event}`,
              isCombo: true,
              comboItems: [p1.event, p2.event],
              probability: Math.max(80, Math.min(p1.probability, p2.probability, 88)),
              estimatedOdds: comboOdds,
              tag: '🔥 Комбо',
            };
            m.predictions.unshift(synthesizedCombo);
          } else if (hasExistingCombo) {
            // Sort combo to be the first in predictions list so it prominently displays in the table
            m.predictions.sort((a, b) => (b.isCombo ? 1 : 0) - (a.isCombo ? 1 : 0));
          }
        });

        // Enforce strict time range if user specified non-default time filter
        if (cleanStartTime !== '00:00' || cleanEndTime !== '23:59') {
          const timeToMin = (tStr: string) => {
            const match = tStr.match(/(\d{1,2}):(\d{2})/);
            if (!match) return null;
            return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
          };
          const sMin = timeToMin(cleanStartTime) || 0;
          const eMin = timeToMin(cleanEndTime) || 1439;

          parsed.matches = parsed.matches.filter((m) => {
            const mMin = timeToMin(m.time);
            if (mMin === null) return true;
            if (sMin <= eMin) return mMin >= sMin && mMin <= eMin;
            return mMin >= sMin || mMin <= eMin;
          });
        }

        parsed.matches = parsed.matches.filter((m) => m.predictions.length > 0);

        // Group strictly by league: matches of the same league follow one after another
        parsed.matches.sort((a, b) => {
          const lA = (a.league || 'Прочие турниры').toLowerCase();
          const lB = (b.league || 'Прочие турниры').toLowerCase();
          if (lA !== lB) {
            return lA.localeCompare(lB, 'ru');
          }
          return (a.time || '').localeCompare(b.time || '');
        });

        if (parsed.brotherSummary) {
          parsed.brotherSummary.date = targetDate;
          parsed.brotherSummary.timeRange = `с ${cleanStartTime} до ${cleanEndTime}`;
          parsed.brotherSummary.lineSource = `Официальная линия БК (${realBookmakerMatches.length} реальных событий на ${targetDate})`;
          if (realBookmakerMatches.length > 0) {
            parsed.brotherSummary.matchesAnalyzedTotal = realBookmakerMatches.length;
          }
          parsed.brotherSummary.matchesQualified = parsed.matches.length;
        }

        // In custom query mode, retain the generated match and do not discard it
        if (cleanCustomQuery) {
          const matched = parsed.matches.filter((m) => isMatchMatchingQuery(m, cleanCustomQuery));
          if (matched.length > 0) {
            parsed.matches = matched;
          }
          // The AI was specifically asked for this match; ensure unmatchedQueries is empty
          if (parsed.matches.length > 0) {
            parsed.unmatchedQueries = [];
            parsed.noMatchesNotice = undefined;
          }
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
          ? `По запросу «${cleanCustomQuery}» не найдено исходов с вероятностью от 80% на ${targetDate} (матч слишком непредсказуемый).`
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
    if (rawMsg.includes('PERMISSION_DENIED') || rawMsg.includes('leaked') || rawMsg.includes('403')) {
      userFriendlyError = 'Ключ Gemini заблокирован Google из-за утечки или отсутствия прав (403 PERMISSION_DENIED). Создайте новый ключ в Google AI Studio и обновите переменную GEMINI_API_KEY.';
    } else if (rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('API key not valid') || rawMsg.includes('401')) {
      userFriendlyError = 'Неверный API ключ Gemini (API_KEY_INVALID). Проверьте ключ в Vercel: Project Settings → Environment Variables.';
    } else if (rawMsg.includes('User location is not supported') || rawMsg.includes('location')) {
      userFriendlyError = 'Региональное ограничение Google (User location is not supported). В настройках Vercel Function Region выберите регион США (us-east-1) или Франкфурт (fra1).';
    } else if (rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('429')) {
      userFriendlyError = 'Превышен минутный лимит запросов к бесплатному Gemini API (Rate Limit 429). Google ограничивает частоту бесплатных запросов в минуту. Подождите 30–60 секунд и повторите попытку.';
    } else if (rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE') || rawMsg.includes('high demand')) {
      userFriendlyError = 'Серверы нейросети Google временно перегружены запросами (503 High Demand). Нажмите кнопку «ПОЛУЧИТЬ АНАЛИЗ И ПРОГНОЗ» еще раз через 5–10 секунд.';
    } else if (rawMsg.includes('FUNCTION_INVOCATION_TIMEOUT') || rawMsg.includes('timeout') || rawMsg.includes('504')) {
      userFriendlyError = 'Таймаут ответа. Поиск по актуальным событиям занял больше времени, чем ожидалось. Попробуйте снова.';
    }

    return res.status(500).json({
      error: userFriendlyError,
    });
  }
}
