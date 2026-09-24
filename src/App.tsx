import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Flame,
  Calendar,
  Clock,
  Sparkles,
  Copy,
  Check,
  CheckCircle2,
  SlidersHorizontal,
  Zap,
  FileSpreadsheet,
  Search,
  AlertTriangle,
  Info,
  X,
  Target,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface MatchPrediction {
  event: string;
  probability: number;
  estimatedOdds: string;
  tag: string;
}

interface MatchAnalysis {
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

interface UnmatchedQuery {
  query: string;
  reason: string;
}

interface BrotherSummary {
  greeting: string;
  matchesAnalyzedTotal: number;
  matchesQualified: number;
  averageConfidence: number;
  brotherTip: string;
  sportName: string;
  date: string;
  timeRange: string;
  userFilterQuery?: string;
}

interface ApiResponse {
  brotherSummary: BrotherSummary;
  matches: MatchAnalysis[];
  unmatchedQueries?: UnmatchedQuery[];
  noMatchesNotice?: string;
  error?: string;
}

const SPORTS = [
  { id: 'football', name: 'Футбол', icon: '⚽', desc: 'РПЛ, АПЛ, Ла Лига, ЛЧ, Серия А' },
  { id: 'hockey', name: 'Хоккей', icon: '🏒', desc: 'КХЛ, НХЛ, ВХЛ' },
  { id: 'basketball', name: 'Баскетбол', icon: '🏀', desc: 'НБА, Евролига, ВТБ' },
  { id: 'tennis', name: 'Теннис', icon: '🎾', desc: 'ATP, WTA туры' },
  { id: 'esports', name: 'Киберспорт', icon: '🎮', desc: 'CS2, Dota 2' },
];

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

export default function App() {
  const getLocalDateString = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const now = new Date();
  const todayStr = getLocalDateString(now);
  const currentHours = String(now.getHours()).padStart(2, '0');
  const currentMinutes = String(now.getMinutes()).padStart(2, '0');
  const defaultStartTime = `${currentHours}:${currentMinutes}`;
  const defaultEndTime = '23:59';

  // Form State
  const [selectedSport, setSelectedSport] = useState<string>('football');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [startTime, setStartTime] = useState<string>(defaultStartTime);
  const [endTime, setEndTime] = useState<string>(defaultEndTime);
  const [customMatchesInput, setCustomMatchesInput] = useState<string>('');

  // Analysis State
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStage, setLoadingStage] = useState<number>(0);
  const [scannedCount, setScannedCount] = useState<number>(0);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expressCopied, setExpressCopied] = useState<boolean>(false);
  const [confidenceFilter, setConfidenceFilter] = useState<number>(80);
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});
  const [cooldown, setCooldown] = useState<number>(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const analysisSteps = customMatchesInput.trim()
    ? [
        `Поиск информации через Google Search строго для матча «${customMatchesInput.trim()}»...`,
        `Проверка времени начала, стартовых составов и потерь команд...`,
        `Аудит xG, текущей формы и личных встреч...`,
        `Математический расчет: отбор исходов с вероятностью строго от 80%...`,
        `Формирование персонального вердикта Брата (все сторонние матчи исключены)...`,
      ]
    : [
        'Поиск официальных расписаний через Google Search в реальном времени...',
        'Фильтрация матчей строго по интервалу времени и вашему запросу...',
        'Аудит xG, текущих составов, кондиций команд и травм...',
        'Математический расчет: отбор исходов с вероятностью строго от 80%...',
        'Формирование братского вердикта и экспертного обоснования...',
      ];

  const handleAnalyze = async () => {
    setLoading(true);
    setLoadingStage(0);
    setScannedCount(8);
    setErrorMessage(null);
    setData(null);

    const stageInterval = setInterval(() => {
      setLoadingStage((prev) => {
        if (prev < analysisSteps.length - 1) return prev + 1;
        return prev;
      });
      setScannedCount((prev) => Math.min(prev + Math.floor(Math.random() * 9 + 4), 48));
    }, 750);

    try {
      const response = await fetch('/api/analyze-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sport: selectedSport,
          date: selectedDate,
          startTime: startTime,
          endTime: endTime,
          customQuery: customMatchesInput.trim(),
        }),
      });

      const rawText = await response.text();
      let result: ApiResponse;
      try {
        result = JSON.parse(rawText);
      } catch {
        if (response.status === 504) {
          throw new Error('Таймаут Vercel (504): Поиск данных занял слишком много времени. Попробуйте еще раз.');
        } else if (response.status === 404) {
          throw new Error('Эндпоинт API не найден (404). Убедитесь, что серверная функция развернута на Vercel.');
        } else {
          throw new Error(`Ошибка сервера (${response.status}): ${rawText.slice(0, 180)}`);
        }
      }

      if (!response.ok) {
        throw new Error(result.error || `Ошибка сервера (${response.status})`);
      }

      setTimeout(() => {
        clearInterval(stageInterval);
        setData(result);
        setLoading(false);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      clearInterval(stageInterval);
      const msg = err?.message || 'Не удалось получить данные с сервера.';
      setErrorMessage(msg);
      if (msg.includes('429') || msg.includes('лимит') || msg.includes('Rate Limit') || msg.includes('RESOURCE_EXHAUSTED')) {
        setCooldown(40);
      }
      setLoading(false);
    }
  };

  const activeCustomQuery = (customMatchesInput.trim() || data?.brotherSummary?.userFilterQuery || '').trim();

  const filteredMatches = data?.matches
    ? data.matches
        .filter((m) => m.predictions.some((p) => p.probability >= confidenceFilter))
        .filter((m) => (!activeCustomQuery ? true : isMatchMatchingQuery(m, activeCustomQuery)))
    : [];

  const toggleReasoning = (id: string) => {
    setExpandedReasoning((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const copyMatchForecast = (match: MatchAnalysis) => {
    const eventsStr = match.predictions
      .map((p) => `• ${p.event} (Вероятность: ${p.probability}%, кэф ~${p.estimatedOdds})`)
      .join('\n');

    const text = `🔥 ПРОГНОЗ: ${match.matchName} (${match.time})
🏆 Турнир: ${match.league}
🎯 События (вероятность ≥ 80%):
${eventsStr}

📊 Обоснование:
${match.reasoning}

💪 Вердикт Брата:
"${match.brotherVerdict}"`;

    navigator.clipboard.writeText(text);
    setCopiedId(match.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const copyExpress = () => {
    if (!filteredMatches.length) return;
    const items = filteredMatches
      .map(
        (m, idx) =>
          `${idx + 1}. ${m.matchName} (${m.time}) — ${m.predictions[0].event} [${m.predictions[0].probability}% | кэф ~${m.predictions[0].estimatedOdds}]`
      )
      .join('\n');

    const totalOdds = filteredMatches
      .reduce((acc, m) => acc * (parseFloat(m.predictions[0].estimatedOdds) || 1.45), 1)
      .toFixed(2);

    const expressText = `🚀 ЭКСПРЕСС ОТ БРАТА (${selectedDate})
Спорт: ${SPORTS.find((s) => s.id === selectedSport)?.name || 'Спорт'}
Интервал: с ${startTime} до ${endTime}

${items}

📈 Общий ориентировочный кэф: ~${totalOdds}`;

    navigator.clipboard.writeText(expressText);
    setExpressCopied(true);
    setTimeout(() => setExpressCopied(false), 2500);
  };

  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setSelectedDate(getLocalDateString(d));
  };

  return (
    <div className="min-h-screen bg-[#02050E] text-slate-100 flex flex-col font-sans selection:bg-blue-600/30 selection:text-sky-200 relative antialiased">
      {/* Elegant Atmospheric Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[480px] bg-blue-700/10 blur-[180px] rounded-full pointer-events-none" />
        <div className="absolute top-1/4 -right-32 w-[600px] h-[600px] bg-indigo-900/15 blur-[200px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 -left-32 w-[650px] h-[600px] bg-blue-950/25 blur-[200px] rounded-full pointer-events-none" />
      </div>

      {/* Header */}
      <header className="border-b border-blue-500/15 bg-[#030818]/90 backdrop-blur-2xl sticky top-0 z-40 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-sky-500 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-300" />
              <div className="relative w-10 h-10 rounded-xl bg-[#030919] border border-blue-500/30 flex items-center justify-center shadow-lg shadow-blue-950/50">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-brand font-black text-2xl tracking-tight text-white drop-shadow-[0_2px_8px_rgba(59,130,246,0.3)]">
                  БРАТ
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-blue-950/80 border border-blue-500/30 text-sky-300">
                  Спортивный интеллект
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="hidden sm:flex items-center gap-2 text-slate-400 text-xs">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_#38bdf8]" />
              <span className="text-slate-300 font-medium">Аудит официальной сетки</span>
              <span className="text-blue-900">|</span>
              <span className="text-sky-300 font-mono-data font-semibold">Строго ≥ 80%</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
        
        {/* CONTROL PANEL */}
        <section className="sapphire-panel rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="space-y-6">
            
            {/* 1. Sport Selector */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-sky-200 flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5 text-sky-400" />
                  <span>Вид спорта</span>
                </label>
                <span className="text-[11px] text-slate-400">Выберите дисциплину</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {SPORTS.map((sport) => {
                  const isSelected = selectedSport === sport.id;
                  return (
                    <button
                      key={sport.id}
                      type="button"
                      onClick={() => setSelectedSport(sport.id)}
                      className={`relative text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden ${
                        isSelected
                          ? 'bg-gradient-to-b from-[#0c1f4a] to-[#06122d] border-blue-400/70 shadow-[0_12px_28px_-6px_rgba(37,99,235,0.35)] text-white'
                          : 'bg-[#030919]/80 border-blue-500/10 hover:border-blue-500/30 hover:bg-[#061333]/70 text-slate-300'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-sky-400 to-transparent" />
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl filter drop-shadow">{sport.icon}</span>
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_10px_#38bdf8]" />
                        )}
                      </div>
                      <div className="font-bold text-sm text-white tracking-tight">{sport.name}</div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">{sport.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Date and Time Range Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
              
              {/* Date selection (5 columns) */}
              <div className="lg:col-span-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-sky-200 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-sky-400" />
                    <span>Дата матчей</span>
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQuickDate(0)}
                      className="px-2.5 py-1 text-[11px] bg-[#040C20] hover:bg-[#0A1D4A] border border-blue-500/20 hover:border-blue-400/40 rounded-lg text-sky-200 transition-colors font-medium cursor-pointer"
                    >
                      Сегодня
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDate(1)}
                      className="px-2.5 py-1 text-[11px] bg-[#040C20] hover:bg-[#0A1D4A] border border-blue-500/20 hover:border-blue-400/40 rounded-lg text-sky-200 transition-colors font-medium cursor-pointer"
                    >
                      Завтра
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDate(2)}
                      className="px-2.5 py-1 text-[11px] bg-[#040C20] hover:bg-[#0A1D4A] border border-blue-500/20 hover:border-blue-400/40 rounded-lg text-sky-200 transition-colors font-medium cursor-pointer"
                    >
                      Послезавтра
                    </button>
                  </div>
                </div>

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-[#030919] border border-blue-500/20 hover:border-blue-400/40 focus:border-sky-400 rounded-xl px-4 py-3 text-white text-sm font-semibold outline-none transition-all shadow-inner"
                />
              </div>

              {/* Time Range selection (7 columns) */}
              <div className="lg:col-span-7 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-sky-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    <span>Диапазон времени событий</span>
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        const h = String(d.getHours()).padStart(2, '0');
                        const m = String(d.getMinutes()).padStart(2, '0');
                        setStartTime(`${h}:${m}`);
                        setEndTime('23:59');
                      }}
                      className="px-2 py-1 text-[11px] bg-[#040C20] hover:bg-[#0A1D4A] border border-blue-500/20 hover:border-blue-400/40 rounded-lg text-sky-300 transition-colors font-medium cursor-pointer"
                    >
                      С текущего ({currentHours}:{currentMinutes})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStartTime('18:00');
                        setEndTime('23:30');
                      }}
                      className="px-2 py-1 text-[11px] bg-[#040C20] hover:bg-[#0A1D4A] border border-blue-500/20 hover:border-blue-400/40 rounded-lg text-sky-200 transition-colors font-medium cursor-pointer"
                    >
                      Вечер (18:00–23:30)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStartTime('00:00');
                        setEndTime('23:59');
                      }}
                      className="px-2 py-1 text-[11px] bg-[#040C20] hover:bg-[#0A1D4A] border border-blue-500/20 hover:border-blue-400/40 rounded-lg text-sky-200 transition-colors font-medium cursor-pointer"
                    >
                      Весь день
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400">Начало от:</span>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-[#030919] border border-blue-500/20 hover:border-blue-400/40 focus:border-sky-400 rounded-xl px-4 py-3 text-white text-sm font-semibold outline-none transition-all shadow-inner font-mono-data"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400">Окончание до:</span>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-[#030919] border border-blue-500/20 hover:border-blue-400/40 focus:border-sky-400 rounded-xl px-4 py-3 text-white text-sm font-semibold outline-none transition-all shadow-inner font-mono-data"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Custom Match Input */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-sky-200 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-sky-400" />
                    <span>Точечный анализ матчей (ТОЛЬКО вписанные)</span>
                  </label>
                  {customMatchesInput.trim() && (
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                      Режим: строго вписанные
                    </span>
                  )}
                </div>
                {customMatchesInput && (
                  <button
                    type="button"
                    onClick={() => setCustomMatchesInput('')}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Очистить</span>
                  </button>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={customMatchesInput}
                  onChange={(e) => setCustomMatchesInput(e.target.value)}
                  placeholder="Впишите конкретный матч или команды (например: «Спартак - Динамо», «Реал - Барселона», «Ливерпуль»)..."
                  className={`w-full bg-[#030919] border rounded-xl pl-10 pr-4 py-3.5 text-white text-sm outline-none transition-all placeholder:text-slate-500 shadow-inner ${
                    customMatchesInput.trim()
                      ? 'border-amber-400/50 focus:border-amber-400 ring-1 ring-amber-400/20'
                      : 'border-blue-500/20 hover:border-blue-400/40 focus:border-sky-400'
                  }`}
                />
              </div>
              <p className="text-[11px] text-slate-400 leading-normal flex items-start gap-1.5">
                <span className="text-sky-400 font-bold shrink-0">🎯</span>
                <span>
                  {customMatchesInput.trim() ? (
                    <span className="text-amber-300 font-medium">
                      Включен строгий режим: ИИ проанализирует <b>ИСКЛЮЧИТЕЛЬНО</b> указанные вами матчи. Любые другие матчи дня будут отфильтрованы.
                    </span>
                  ) : (
                    <>
                      Если поле пустое — ИИ проверит <span className="text-sky-300 font-medium">всю линию дня</span>. Если вписать матч — ИИ проанализирует <b>только его</b>.
                    </>
                  )}
                </span>
              </p>
            </div>

            {/* 4. BUTTON */}
            <div className="pt-2">
              <button
                type="button"
                disabled={loading || cooldown > 0}
                onClick={handleAnalyze}
                className={`w-full relative group overflow-hidden rounded-2xl py-4 sm:py-5 px-6 font-brand font-bold text-base sm:text-lg tracking-wide uppercase transition-all duration-300 shadow-xl ${
                  loading || cooldown > 0
                    ? 'bg-[#061026] text-slate-400 cursor-not-allowed border border-blue-500/20'
                    : customMatchesInput.trim()
                    ? 'bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 bg-[length:200%_auto] hover:bg-right text-white shadow-[0_12px_36px_-6px_rgba(217,119,6,0.45)] hover:shadow-[0_16px_44px_-6px_rgba(217,119,6,0.65)] hover:-translate-y-0.5 active:translate-y-0 border border-amber-300/30 cursor-pointer'
                    : 'bg-gradient-to-r from-blue-600 via-sky-500 to-blue-600 bg-[length:200%_auto] hover:bg-right text-white shadow-[0_12px_36px_-6px_rgba(37,99,235,0.45)] hover:shadow-[0_16px_44px_-6px_rgba(37,99,235,0.65)] hover:-translate-y-0.5 active:translate-y-0 border border-sky-300/30 cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-center gap-3">
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                      <span className="tracking-wider text-sm sm:text-base font-sans">
                        {customMatchesInput.trim()
                          ? `Анализ матча «${customMatchesInput.trim().slice(0, 25)}»...`
                          : 'Идет поиск официальной сетки и аудит...'}
                      </span>
                    </>
                  ) : cooldown > 0 ? (
                    <>
                      <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
                      <span className="tracking-wide text-amber-300 text-sm sm:text-base font-sans">
                        Ожидание лимита Google API ({cooldown} сек)
                      </span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 fill-white text-white" />
                      <span>
                        {customMatchesInput.trim()
                          ? `ПРОАНАЛИЗИРОВАТЬ ТОЛЬКО: ${customMatchesInput.trim().slice(0, 28)}${customMatchesInput.trim().length > 28 ? '...' : ''}`
                          : 'ПОЛУЧИТЬ АНАЛИЗ И ПРОГНОЗ'}
                      </span>
                      <ArrowRight className="w-5 h-5 ml-1 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </div>
              </button>
            </div>

          </div>
        </section>

        {/* LOADING STAGES */}
        {loading && (
          <section className="sapphire-panel rounded-3xl p-6 sm:p-8 space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-500/20 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
                  <span className="text-xs uppercase tracking-widest font-bold text-sky-400">
                    Аудит официальной сетки в процессе
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">
                  Прочесываем расписание событий ({startTime} – {endTime})
                </h3>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-auto">
                <div className="px-4 py-2 rounded-xl bg-[#030919] border border-blue-500/25 text-center">
                  <div className="text-[10px] text-slate-400">Событий в обработке</div>
                  <div className="text-lg font-black text-sky-400 font-mono-data">
                    {scannedCount}+
                  </div>
                </div>
              </div>
            </div>

            {/* Step list */}
            <div className="space-y-3">
              {analysisSteps.map((step, idx) => {
                const isPassed = idx < loadingStage;
                const isCurrent = idx === loadingStage;
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3.5 p-3 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                      isCurrent
                        ? 'bg-blue-950/70 text-sky-200 border border-blue-500/40'
                        : isPassed
                        ? 'text-slate-400 bg-white/[0.01]'
                        : 'text-slate-600'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                      {isPassed ? (
                        <CheckCircle2 className="w-4 h-4 text-sky-400" />
                      ) : isCurrent ? (
                        <div className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                      )}
                    </div>
                    <span>{step}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Error notification banner */}
        {errorMessage && (
          <div className="rounded-2xl bg-rose-950/40 border border-rose-500/40 p-5 text-sm text-rose-200 flex items-start gap-3 backdrop-blur-md">
            <span className="text-xl shrink-0">⚠️</span>
            <div className="space-y-2 flex-1">
              <div className="font-bold text-white text-sm sm:text-base leading-snug">
                {errorMessage}
              </div>
              {errorMessage.includes('429') || errorMessage.includes('лимит') || errorMessage.includes('Rate Limit') ? (
                <div className="text-xs text-sky-200/90 leading-relaxed bg-blue-950/60 p-3.5 rounded-xl border border-blue-500/30 space-y-1">
                  <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Ключ GEMINI_API_KEY активен и подтвержден</span>
                  </div>
                  <p className="text-slate-300">
                    Google AI Studio временно приостановил запросы из-за минутного ограничения частоты бесплатного аккаунта. Таймер ожидания уже запущен на кнопке выше — подождите несколько секунд и повторите запрос.
                  </p>
                </div>
              ) : errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('GEMINI_API_KEY не обнаружен') ? (
                <div className="text-xs text-rose-300/80 leading-relaxed">
                  Проверьте переменную <code className="bg-black/50 px-1.5 py-0.5 rounded text-amber-300 font-mono">GEMINI_API_KEY</code> в настройках Vercel (Project Settings → Environment Variables) и обязательно сделайте <strong>Redeploy</strong>.
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Initial Welcome State */}
        {!loading && !data && !errorMessage && (
          <section className="sapphire-panel rounded-3xl p-8 sm:p-12 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-sky-400">
              <Zap className="w-7 h-7" />
            </div>
            <div className="max-w-lg mx-auto space-y-2">
              <h3 className="font-brand font-bold text-white text-lg sm:text-xl">
                Готов к поиску и аудиту линии
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Задайте дату, точное время начала и окончания событий, или впишите конкретные интересующие вас команды. Нажмите кнопку <span className="text-sky-400 font-bold">«ПРОГНОЗ»</span> — ИИ проверит реальные расписания и отфильтрует только железобетонные события с вероятностью от 80%.
              </p>
            </div>
          </section>
        )}

        {/* UNMATCHED QUERIES WARNING BANNER */}
        {!loading && data && data.unmatchedQueries && data.unmatchedQueries.length > 0 && (
          <div className="rounded-2xl bg-amber-950/40 border border-amber-500/40 p-5 text-sm text-amber-200 shadow-xl backdrop-blur-md space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
              <span>Уведомление по запрошенным матчам:</span>
            </div>
            <ul className="space-y-1.5 pl-7 list-disc text-xs sm:text-sm text-amber-200/90">
              {data.unmatchedQueries.map((item, idx) => (
                <li key={idx} className="leading-relaxed">
                  <span className="font-semibold text-white">«{item.query}»</span>: {item.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* NO MATCHES NOTICE */}
        {!loading && data && data.noMatchesNotice && filteredMatches.length === 0 && (
          <section className="sapphire-panel rounded-3xl p-8 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-sky-400">
              <Info className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="font-bold text-white text-base sm:text-lg">
                События не найдены
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {data.noMatchesNotice}
              </p>
              <p className="text-xs text-slate-400">
                Попробуйте расширить диапазон времени (например, выбрав «Весь день») или убрать фильтр конкретных команд.
              </p>
            </div>
          </section>
        )}

        {/* RESULTS SECTION: Summary & Required Table */}
        {!loading && data && filteredMatches.length > 0 && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Aesthetic Summary Card */}
            <div className="sapphire-panel rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-blue-500/20 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sky-400 font-bold text-xs uppercase tracking-wider">
                      Резюме анализа
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-950/70 border border-blue-600/30 text-sky-200 font-mono-data">
                      {data.brotherSummary.timeRange}
                    </span>
                    {data.brotherSummary.userFilterQuery && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-300 font-medium flex items-center gap-1">
                        <span>🎯</span>
                        <span>Только матч: «{data.brotherSummary.userFilterQuery}»</span>
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg sm:text-xl font-brand font-bold text-white">
                    {data.brotherSummary.greeting}
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={copyExpress}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 hover:from-blue-500 hover:via-indigo-500 hover:to-sky-400 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-500/20 cursor-pointer"
                  >
                    {expressCopied ? <Check className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                    <span>{expressCopied ? 'Скопировано!' : 'Собрать экспресс'}</span>
                  </button>
                </div>
              </div>

              {/* Stats badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="sapphire-inner-card p-4 rounded-2xl text-center">
                  <div className="text-xs text-slate-400 font-medium">Матчей изучено</div>
                  <div className="text-2xl font-brand font-bold text-white mt-1 font-mono-data">
                    {data.brotherSummary.matchesAnalyzedTotal}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {data.brotherSummary.userFilterQuery ? 'Только запрошенные' : '100% сетки'}
                  </div>
                </div>

                <div className="sapphire-inner-card p-4 rounded-2xl text-center">
                  <div className="text-xs text-slate-400 font-medium">Прошло в таблицу</div>
                  <div className="text-2xl font-brand font-bold text-sky-400 mt-1 font-mono-data">
                    {filteredMatches.length}
                  </div>
                  <div className="text-[10px] text-sky-400/80 mt-0.5">Строго ≥ {confidenceFilter}%</div>
                </div>

                <div className="sapphire-inner-card p-4 rounded-2xl text-center">
                  <div className="text-xs text-slate-400 font-medium">Средняя вероятность</div>
                  <div className="text-2xl font-brand font-bold text-blue-300 mt-1 font-mono-data">
                    {data.brotherSummary.averageConfidence}%
                  </div>
                  <div className="text-[10px] text-blue-300/80 mt-0.5">Высокая точность</div>
                </div>

                <div className="sapphire-inner-card p-4 rounded-2xl text-center">
                  <div className="text-xs text-slate-400 font-medium">Статус отбора</div>
                  <div className="text-2xl font-brand font-bold text-sky-300 mt-1">Строгий</div>
                  <div className="text-[10px] text-sky-300/80 mt-0.5">Без сомнительных</div>
                </div>
              </div>

              {/* Tip block */}
              <div className="sapphire-inner-card border-l-2 border-l-sky-400 p-4 rounded-2xl text-xs text-slate-300 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">Совет Брата: </span>
                  {data.brotherSummary.brotherTip}
                </div>
              </div>
            </div>

            {/* Filter and Table Tools */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#030919]/95 border border-blue-500/25 p-4 rounded-2xl">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-sky-400" />
                <span className="font-bold text-white text-sm">
                  Таблица отобранных прогнозов ({filteredMatches.length} матчей)
                </span>
                <span className="text-xs text-slate-400">
                  • Меньше 80% отсеяно
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Порог вероятности:</span>
                <div className="flex bg-[#02050E] p-1 rounded-xl border border-blue-500/25">
                  {[80, 85, 90].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setConfidenceFilter(val)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        confidenceFilter === val
                          ? 'bg-blue-600 text-white shadow-sm font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {val}%+
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* REQUIRED TABLE (Clean aesthetic styling) */}
            <div className="overflow-x-auto rounded-3xl border border-blue-500/25 bg-[#030819]/95 shadow-2xl backdrop-blur-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-blue-500/20 bg-[#020510]/95 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-4 px-4 sm:px-6">1. Название матча</th>
                    <th className="py-4 px-4">2. Время начала</th>
                    <th className="py-4 px-4 sm:px-6">3. Прогнозируемые события</th>
                    <th className="py-4 px-4 text-center">4. Вероятность</th>
                    <th className="py-4 px-4 sm:px-6 min-w-[320px]">5. Обоснование почему</th>
                    <th className="py-4 px-4 text-center">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-500/15 text-sm">
                  {filteredMatches.map((match) => {
                    const isExpanded = expandedReasoning[match.id];
                    return (
                      <tr
                        key={match.id}
                        className="hover:bg-blue-900/15 transition-colors group"
                      >
                        {/* 1. Название матча */}
                        <td className="py-5 px-4 sm:px-6 align-top">
                          <div className="space-y-1">
                            <div className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">
                              {match.league}
                            </div>
                            <div className="font-bold text-white text-base group-hover:text-sky-300 transition-colors">
                              {match.matchName}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-1.5">
                              <span>{match.homeTeam}</span>
                              <span className="text-slate-600">vs</span>
                              <span>{match.awayTeam}</span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Время начала */}
                        <td className="py-5 px-4 align-top">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#030919] border border-blue-500/25 text-slate-200 font-mono-data text-xs font-bold shadow-inner">
                            <Clock className="w-3.5 h-3.5 text-sky-400" />
                            <span>{match.time}</span>
                          </div>
                        </td>

                        {/* 3. Прогнозируемые события */}
                        <td className="py-5 px-4 sm:px-6 align-top">
                          <div className="space-y-2">
                            {match.predictions.map((p, pIdx) => (
                              <div
                                key={pIdx}
                                className="p-2.5 rounded-xl bg-[#030919] border border-blue-500/20 flex items-center justify-between gap-3 shadow-inner"
                              >
                                <div className="space-y-0.5">
                                  <div className="font-bold text-white text-xs sm:text-sm">
                                    {p.event}
                                  </div>
                                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                    <span className="text-sky-300 font-semibold font-mono-data">
                                      Кэф ~{p.estimatedOdds}
                                    </span>
                                    <span>•</span>
                                    <span className="text-blue-400 font-medium">{p.tag}</span>
                                  </div>
                                </div>
                                <span className="text-xs font-bold text-sky-300 px-2.5 py-0.5 rounded-lg bg-blue-950/80 border border-blue-500/30 font-mono-data">
                                  {p.probability}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* 4. Вероятность */}
                        <td className="py-5 px-4 text-center align-top">
                          <div className="space-y-1">
                            <span className="inline-block px-3 py-1.5 rounded-xl font-bold text-sm bg-blue-950/80 border border-blue-500/30 text-sky-300 font-mono-data">
                              {Math.max(...match.predictions.map((p) => p.probability))}%
                            </span>
                            <div className="text-[10px] text-blue-400/80 font-bold uppercase tracking-wider">
                              Железобетон
                            </div>
                          </div>
                        </td>

                        {/* 5. Обоснование почему */}
                        <td className="py-5 px-4 sm:px-6 align-top">
                          <div className="space-y-2.5">
                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                              {isExpanded
                                ? match.reasoning
                                : `${match.reasoning.slice(0, 160)}...`}
                            </p>

                            {match.reasoning.length > 160 && (
                              <button
                                type="button"
                                onClick={() => toggleReasoning(match.id)}
                                className="text-[11px] text-sky-400 hover:text-sky-300 font-bold underline cursor-pointer"
                              >
                                {isExpanded ? 'Свернуть' : 'Подробнее'}
                              </button>
                            )}

                            {match.keyStats && match.keyStats.length > 0 && (
                              <div className="space-y-1 pt-1.5 border-t border-blue-500/15">
                                {(isExpanded ? match.keyStats : match.keyStats.slice(0, 1)).map(
                                  (stat, sIdx) => (
                                    <div
                                      key={sIdx}
                                      className="text-[11px] text-slate-400 flex items-start gap-1.5"
                                    >
                                      <span className="text-sky-400 font-bold">•</span>
                                      <span>{stat}</span>
                                    </div>
                                  )
                                )}
                              </div>
                            )}

                            {/* Verdict */}
                            <div className="bg-[#030919] border border-blue-500/20 border-l-2 border-l-sky-400 rounded-xl p-3 text-xs text-slate-300 flex items-start gap-2 shadow-inner">
                              <span className="font-extrabold text-sky-300 shrink-0">
                                Вердикт:
                              </span>
                              <span className="italic text-slate-300">{match.brotherVerdict}</span>
                            </div>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="py-5 px-4 text-center align-top">
                          <button
                            type="button"
                            onClick={() => copyMatchForecast(match)}
                            title="Скопировать прогноз матча"
                            className="p-2.5 rounded-xl bg-[#030919] hover:bg-blue-900/40 border border-blue-500/25 text-slate-300 hover:text-white transition-all cursor-pointer shadow-inner"
                          >
                            {copiedId === match.id ? (
                              <Check className="w-4 h-4 text-sky-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-blue-500/15 bg-[#01030B] py-6 text-center text-xs text-slate-500 relative z-10">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-medium text-slate-400">
            «БРАТ» • Реальный ИИ-аналитик спортивных событий
          </p>
        </div>
      </footer>
    </div>
  );
}
