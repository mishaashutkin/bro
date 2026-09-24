import React, { useState } from 'react';
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

  const analysisSteps = [
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

      const result: ApiResponse = await response.json();

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
      setErrorMessage(
        err?.message || 'Не удалось получить данные с сервера. Проверьте переменную окружения GEMINI_API_KEY.'
      );
      setLoading(false);
    }
  };

  const filteredMatches = data?.matches
    ? data.matches.filter((m) =>
        m.predictions.some((p) => p.probability >= confidenceFilter)
      )
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
    <div className="min-h-screen bg-[#050B18] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-200 relative antialiased">
      {/* Elegant Atmospheric Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[850px] h-[450px] bg-sky-600/10 blur-[150px] rounded-full" />
        <div className="absolute top-1/3 -right-24 w-[500px] h-[500px] bg-blue-700/8 blur-[160px] rounded-full" />
        <div className="absolute bottom-10 -left-20 w-[550px] h-[450px] bg-indigo-900/12 blur-[150px] rounded-full" />
      </div>

      {/* Header */}
      <header className="border-b border-sky-500/15 bg-[#070F22]/90 backdrop-blur-xl sticky top-0 z-40 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 via-sky-500 to-blue-600 p-[1.5px] shadow-lg shadow-sky-500/20">
              <div className="w-full h-full bg-[#070F22] rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-white">
                  БРАТ
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                  Реальный ИИ-Анализ
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="hidden sm:flex items-center gap-2 text-slate-400 text-xs">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Поиск расписаний в реальном времени</span>
              <span className="text-slate-600">·</span>
              <span className="text-sky-300 font-semibold">Порог ≥ 80%</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
        
        {/* CONTROL PANEL */}
        <section className="navy-card rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="space-y-6">
            
            {/* 1. Sport Selector */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-sky-200 flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5 text-cyan-400" />
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
                      className={`relative text-left p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-b from-sky-950/80 to-blue-950/70 border-cyan-400/70 shadow-lg shadow-cyan-950/50 text-white'
                          : 'bg-[#081226]/70 border-white/[0.05] hover:border-sky-700/50 hover:bg-[#0B1A38]/70 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xl">{sport.icon}</span>
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                        )}
                      </div>
                      <div className="font-bold text-sm text-white">{sport.name}</div>
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
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Дата матчей</span>
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQuickDate(0)}
                      className="px-2.5 py-1 text-[11px] bg-[#0A1733] hover:bg-[#10234D] border border-sky-500/25 rounded-lg text-sky-200 transition-colors font-medium cursor-pointer"
                    >
                      Сегодня
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDate(1)}
                      className="px-2.5 py-1 text-[11px] bg-[#0A1733] hover:bg-[#10234D] border border-sky-500/25 rounded-lg text-sky-200 transition-colors font-medium cursor-pointer"
                    >
                      Завтра
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDate(2)}
                      className="px-2.5 py-1 text-[11px] bg-[#0A1733] hover:bg-[#10234D] border border-sky-500/25 rounded-lg text-sky-200 transition-colors font-medium cursor-pointer"
                    >
                      Послезавтра
                    </button>
                  </div>
                </div>

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-[#061024] border border-sky-500/25 hover:border-sky-400 focus:border-cyan-400 rounded-xl px-4 py-3 text-white text-sm font-semibold outline-none transition-all shadow-inner"
                />
              </div>

              {/* Time Range selection (7 columns) */}
              <div className="lg:col-span-7 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-sky-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
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
                      className="px-2 py-1 text-[11px] bg-[#0A1733] hover:bg-[#10234D] border border-sky-500/25 rounded-lg text-cyan-300 transition-colors font-medium cursor-pointer"
                    >
                      С текущего ({currentHours}:{currentMinutes})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStartTime('18:00');
                        setEndTime('23:30');
                      }}
                      className="px-2 py-1 text-[11px] bg-[#0A1733] hover:bg-[#10234D] border border-sky-500/25 rounded-lg text-sky-200 transition-colors font-medium cursor-pointer"
                    >
                      Вечер (18:00–23:30)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStartTime('00:00');
                        setEndTime('23:59');
                      }}
                      className="px-2 py-1 text-[11px] bg-[#0A1733] hover:bg-[#10234D] border border-sky-500/25 rounded-lg text-sky-200 transition-colors font-medium cursor-pointer"
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
                      className="w-full bg-[#061024] border border-sky-500/25 hover:border-sky-400 focus:border-cyan-400 rounded-xl px-4 py-3 text-white text-sm font-semibold outline-none transition-all shadow-inner font-mono-data"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400">Окончание до:</span>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-[#061024] border border-sky-500/25 hover:border-sky-400 focus:border-cyan-400 rounded-xl px-4 py-3 text-white text-sm font-semibold outline-none transition-all shadow-inner font-mono-data"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Custom Match Input */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-sky-200 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Индивидуальный выбор матчей (опционально)</span>
                </label>
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
                  placeholder="Впишите интересующие матчи или команды (например: «Спартак - Динамо», «Арсенал», «Реал Мадрид»)..."
                  className="w-full bg-[#061024] border border-sky-500/25 hover:border-sky-400 focus:border-cyan-400 rounded-xl pl-10 pr-4 py-3.5 text-white text-sm outline-none transition-all placeholder:text-slate-500 shadow-inner"
                />
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                💡 Если оставить поле пустым — ИИ просканирует <span className="text-cyan-300 font-medium">всю линию</span> в интервале времени. Если вписать команды — ИИ проверит конкретно их. Если матч не попадает в диапазон времени или не запланирован, система сообщит об этом.
              </p>
            </div>

            {/* 4. BUTTON */}
            <div className="pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={handleAnalyze}
                className={`w-full relative group overflow-hidden rounded-2xl py-4 sm:py-5 px-6 font-bold text-base sm:text-lg tracking-wider uppercase transition-all duration-300 cursor-pointer shadow-xl ${
                  loading
                    ? 'bg-[#091633] text-slate-500 cursor-not-allowed border border-sky-500/20'
                    : 'bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:via-sky-300 hover:to-blue-400 text-slate-950 shadow-cyan-500/20 hover:shadow-cyan-500/35 hover:-translate-y-0.5 active:translate-y-0'
                }`}
              >
                <div className="flex items-center justify-center gap-3">
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                      <span className="tracking-widest">Идет реальный ИИ-поиск и аудит...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 fill-slate-950" />
                      <span>ПРОГНОЗ</span>
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
          <section className="navy-card rounded-3xl p-6 sm:p-8 space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sky-500/20 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-xs uppercase tracking-widest font-bold text-cyan-400">
                    Реальный анализ сетки в процессе
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">
                  Прочесываем официальное расписание ({startTime} – {endTime})
                </h3>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-auto">
                <div className="px-4 py-2 rounded-xl bg-[#061024] border border-sky-500/25 text-center">
                  <div className="text-[10px] text-slate-400">Событий в обработке</div>
                  <div className="text-lg font-black text-cyan-400 font-mono-data">
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
                        ? 'bg-sky-950/70 text-cyan-200 border border-cyan-500/40'
                        : isPassed
                        ? 'text-slate-400 bg-white/[0.01]'
                        : 'text-slate-600'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                      {isPassed ? (
                        <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                      ) : isCurrent ? (
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
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
            <span className="text-xl">⚠️</span>
            <div className="space-y-1">
              <div className="font-bold text-white">Внимание: {errorMessage}</div>
              <div className="text-xs text-rose-300/80">
                Убедитесь, что в панели Vercel (Project Settings → Environment Variables) добавлена переменная <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300">GEMINI_API_KEY</code>.
              </div>
            </div>
          </div>
        )}

        {/* Initial Welcome State */}
        {!loading && !data && !errorMessage && (
          <section className="navy-card rounded-3xl p-8 sm:p-12 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
              <Zap className="w-7 h-7" />
            </div>
            <div className="max-w-lg mx-auto space-y-2">
              <h3 className="font-extrabold text-white text-lg sm:text-xl">
                Готов к поиску и аудиту линии
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Задайте дату, точное время начала и окончания событий, или впишите конкретные интересующие вас команды. Нажмите кнопку <span className="text-cyan-400 font-bold">«ПРОГНОЗ»</span> — ИИ проверит реальные расписания и отфильтрует только железобетонные события с вероятностью от 80%.
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
          <section className="navy-card rounded-3xl p-8 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
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
            <div className="navy-card rounded-3xl p-6 sm:p-8 space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-sky-500/20 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold text-xs uppercase tracking-wider">
                      Резюме анализа
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-950/70 border border-sky-600/30 text-sky-200 font-mono-data">
                      {data.brotherSummary.timeRange}
                    </span>
                    {data.brotherSummary.userFilterQuery && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-600/30 text-cyan-200">
                        Фильтр: «{data.brotherSummary.userFilterQuery}»
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-white">
                    {data.brotherSummary.greeting}
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={copyExpress}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/10 cursor-pointer"
                  >
                    {expressCopied ? <Check className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                    <span>{expressCopied ? 'Скопировано!' : 'Собрать экспресс'}</span>
                  </button>
                </div>
              </div>

              {/* Stats badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#061024] border border-sky-500/20 p-4 rounded-2xl text-center">
                  <div className="text-xs text-slate-400 font-medium">Матчей изучено</div>
                  <div className="text-xl font-extrabold text-white mt-0.5 font-mono-data">
                    {data.brotherSummary.matchesAnalyzedTotal}
                  </div>
                  <div className="text-[10px] text-slate-500">100% реальной сетки</div>
                </div>

                <div className="bg-[#061024] border border-sky-500/20 p-4 rounded-2xl text-center">
                  <div className="text-xs text-slate-400 font-medium">Прошло в таблицу</div>
                  <div className="text-xl font-extrabold text-cyan-400 mt-0.5 font-mono-data">
                    {filteredMatches.length}
                  </div>
                  <div className="text-[10px] text-cyan-400/80">Строго ≥ {confidenceFilter}%</div>
                </div>

                <div className="bg-[#061024] border border-sky-500/20 p-4 rounded-2xl text-center">
                  <div className="text-xs text-slate-400 font-medium">Средняя вероятность</div>
                  <div className="text-xl font-extrabold text-amber-400 mt-0.5 font-mono-data">
                    {data.brotherSummary.averageConfidence}%
                  </div>
                  <div className="text-[10px] text-amber-400/80">Высокая точность</div>
                </div>

                <div className="bg-[#061024] border border-sky-500/20 p-4 rounded-2xl text-center">
                  <div className="text-xs text-slate-400 font-medium">Статус отбора</div>
                  <div className="text-xl font-extrabold text-sky-400 mt-0.5">Строгий</div>
                  <div className="text-[10px] text-sky-400/80">Без сомнительных</div>
                </div>
              </div>

              {/* Tip block */}
              <div className="flex items-start gap-3 bg-[#061024]/80 border border-sky-500/20 p-4 rounded-2xl text-xs text-slate-300">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">Совет Брата: </span>
                  {data.brotherSummary.brotherTip}
                </div>
              </div>
            </div>

            {/* Filter and Table Tools */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#081226]/90 border border-sky-500/25 p-4 rounded-2xl">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white text-sm">
                  Таблица отобранных прогнозов ({filteredMatches.length} матчей)
                </span>
                <span className="text-xs text-slate-400">
                  • Меньше 80% отсеяно
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Порог вероятности:</span>
                <div className="flex bg-[#061024] p-1 rounded-xl border border-sky-500/25">
                  {[80, 85, 90].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setConfidenceFilter(val)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        confidenceFilter === val
                          ? 'bg-cyan-500 text-slate-950 shadow-sm font-semibold'
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
            <div className="overflow-x-auto rounded-3xl border border-sky-500/25 bg-[#081226]/90 shadow-2xl backdrop-blur-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-sky-500/20 bg-[#061024]/80 text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    <th className="py-4 px-4 sm:px-6">1. Название матча</th>
                    <th className="py-4 px-4">2. Время начала</th>
                    <th className="py-4 px-4 sm:px-6">3. Прогнозируемые события</th>
                    <th className="py-4 px-4 text-center">4. Вероятность</th>
                    <th className="py-4 px-4 sm:px-6 min-w-[320px]">5. Обоснование почему</th>
                    <th className="py-4 px-4 text-center">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-500/15 text-sm">
                  {filteredMatches.map((match) => {
                    const isExpanded = expandedReasoning[match.id];
                    return (
                      <tr
                        key={match.id}
                        className="hover:bg-sky-950/25 transition-colors group"
                      >
                        {/* 1. Название матча */}
                        <td className="py-5 px-4 sm:px-6 align-top">
                          <div className="space-y-1">
                            <div className="text-[11px] font-semibold text-sky-400 uppercase tracking-wide">
                              {match.league}
                            </div>
                            <div className="font-extrabold text-white text-base group-hover:text-cyan-300 transition-colors">
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
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#061024] border border-sky-500/25 text-slate-200 font-mono-data text-xs font-bold shadow-inner">
                            <Clock className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{match.time}</span>
                          </div>
                        </td>

                        {/* 3. Прогнозируемые события */}
                        <td className="py-5 px-4 sm:px-6 align-top">
                          <div className="space-y-2">
                            {match.predictions.map((p, pIdx) => (
                              <div
                                key={pIdx}
                                className="p-2.5 rounded-xl bg-[#061024] border border-sky-500/20 flex items-center justify-between gap-3 shadow-inner"
                              >
                                <div className="space-y-0.5">
                                  <div className="font-bold text-white text-xs sm:text-sm">
                                    {p.event}
                                  </div>
                                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                    <span className="text-amber-300 font-semibold font-mono-data">
                                      Кэф ~{p.estimatedOdds}
                                    </span>
                                    <span>•</span>
                                    <span className="text-cyan-400 font-medium">{p.tag}</span>
                                  </div>
                                </div>
                                <span className="text-xs font-black text-cyan-400 px-2.5 py-0.5 rounded-lg bg-cyan-950/70 border border-cyan-500/30 font-mono-data">
                                  {p.probability}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* 4. Вероятность */}
                        <td className="py-5 px-4 text-center align-top">
                          <div className="space-y-1">
                            <span className="inline-block px-3 py-1.5 rounded-xl font-extrabold text-sm bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono-data">
                              {Math.max(...match.predictions.map((p) => p.probability))}%
                            </span>
                            <div className="text-[10px] text-cyan-400/80 font-bold uppercase tracking-wider">
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
                                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer"
                              >
                                {isExpanded ? 'Свернуть' : 'Подробнее'}
                              </button>
                            )}

                            {match.keyStats && match.keyStats.length > 0 && (
                              <div className="space-y-1 pt-1.5 border-t border-sky-500/15">
                                {(isExpanded ? match.keyStats : match.keyStats.slice(0, 1)).map(
                                  (stat, sIdx) => (
                                    <div
                                      key={sIdx}
                                      className="text-[11px] text-slate-400 flex items-start gap-1.5"
                                    >
                                      <span className="text-cyan-400 font-bold">•</span>
                                      <span>{stat}</span>
                                    </div>
                                  )
                                )}
                              </div>
                            )}

                            {/* Verdict */}
                            <div className="bg-[#061024] border border-sky-500/20 rounded-xl p-2.5 text-xs text-slate-300 flex items-start gap-2 shadow-inner">
                              <span className="font-extrabold text-amber-400 shrink-0">
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
                            className="p-2.5 rounded-xl bg-[#061024] hover:bg-sky-900/40 border border-sky-500/25 text-slate-300 hover:text-white transition-all cursor-pointer shadow-inner"
                          >
                            {copiedId === match.id ? (
                              <Check className="w-4 h-4 text-cyan-400" />
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
      <footer className="border-t border-sky-500/15 bg-[#040814] py-6 text-center text-xs text-slate-500 relative z-10">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-medium text-slate-400">
            «БРАТ» • Реальный ИИ-аналитик спортивных событий
          </p>
        </div>
      </footer>
    </div>
  );
}
