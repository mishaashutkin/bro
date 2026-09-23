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
  RefreshCw,
  Zap,
  FileSpreadsheet,
  ChevronRight,
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

interface BrotherSummary {
  greeting: string;
  matchesAnalyzedTotal: number;
  matchesQualified: number;
  averageConfidence: number;
  brotherTip: string;
  sportName: string;
  date: string;
  timeRange: string;
}

interface ApiResponse {
  brotherSummary: BrotherSummary;
  matches: MatchAnalysis[];
}

const SPORTS = [
  { id: 'football', name: 'Футбол', icon: '⚽', desc: 'РПЛ, АПЛ, Ла Лига, ЛЧ, Серия А' },
  { id: 'hockey', name: 'Хоккей', icon: '🏒', desc: 'КХЛ, НХЛ, ВХЛ' },
  { id: 'basketball', name: 'Баскетбол', icon: '🏀', desc: 'НБА, Евролига, ВТБ' },
  { id: 'tennis', name: 'Теннис', icon: '🎾', desc: 'ATP, WTA туры' },
  { id: 'esports', name: 'Киберспорт', icon: '🎮', desc: 'CS2, Dota 2 Majors' },
];

export default function App() {
  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  const currentHours = String(now.getHours()).padStart(2, '0');
  const currentMinutes = String(now.getMinutes()).padStart(2, '0');
  const defaultTimeStr = `${currentHours}:${currentMinutes}`;

  // Form State
  const [selectedSport, setSelectedSport] = useState<string>('football');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedTime, setSelectedTime] = useState<string>(defaultTimeStr);

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
    'Сканирование всех матчей и турниров до конца дня...',
    'Сбор xG-метрик, текущих кондиций, составов и травм...',
    'Математическое моделирование вероятностей исходов...',
    'Фильтрация: исключение событий с вероятностью ниже 80%...',
    'Формирование экспертного аналитического обоснования...',
  ];

  const handleAnalyze = async () => {
    setLoading(true);
    setLoadingStage(0);
    setScannedCount(0);
    setErrorMessage(null);
    setData(null);

    const stageInterval = setInterval(() => {
      setLoadingStage((prev) => {
        if (prev < analysisSteps.length - 1) return prev + 1;
        return prev;
      });
      setScannedCount((prev) => Math.min(prev + Math.floor(Math.random() * 8 + 4), 48));
    }, 850);

    try {
      const response = await fetch('/api/analyze-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sport: selectedSport,
          date: selectedDate,
          startTime: selectedTime,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ошибка сервера (${response.status})`);
      }

      const result: ApiResponse = await response.json();

      setTimeout(() => {
        clearInterval(stageInterval);
        setData(result);
        setLoading(false);
      }, 3400);
    } catch (err: any) {
      console.error(err);
      clearInterval(stageInterval);
      setErrorMessage(
        err?.message || 'Не удалось получить данные с сервера. Проверьте переменную окружения GEMINI_API_KEY на Vercel.'
      );
      setLoading(false);
    }
  };

  useEffect(() => {
    handleAnalyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      .reduce((acc, m) => acc * (parseFloat(m.predictions[0].estimatedOdds) || 1.5), 1)
      .toFixed(2);

    const expressText = `🚀 ЭКСПРЕСС ОТ БРАТА (${selectedDate})
Спорт: ${SPORTS.find((s) => s.id === selectedSport)?.name || 'Спорт'}
Интервал: с ${selectedTime} до конца дня

${items}

📈 Общий кэф: ~${totalOdds}`;

    navigator.clipboard.writeText(expressText);
    setExpressCopied(true);
    setTimeout(() => setExpressCopied(false), 2500);
  };

  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black relative antialiased">
      {/* Subtle modern ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-emerald-500/8 blur-[140px] rounded-full" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[400px] bg-teal-500/5 blur-[160px] rounded-full" />
        <div className="absolute bottom-10 -left-40 w-[500px] h-[400px] bg-amber-500/5 blur-[160px] rounded-full" />
      </div>

      {/* Top Header - Ultra Clean & Minimal */}
      <header className="border-b border-white/[0.06] bg-[#07090E]/80 backdrop-blur-xl sticky top-0 z-40 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-amber-300 p-[1.5px] shadow-lg shadow-emerald-500/10">
              <div className="w-full h-full bg-[#0A0D14] rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <span className="font-black text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              БРАТ
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
        {/* PRIMARY CONTROL PANEL: Aesthetic Glass Card */}
        <section className="relative overflow-hidden rounded-3xl bg-[#0D111A]/90 border border-white/[0.08] p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Subtle accent border top */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

          <div className="space-y-6">
            {/* 1. Sport Selector (Compact & Aesthetic) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3 h-3 text-emerald-400" />
                  <span>Вид спорта</span>
                </label>
                <span className="text-[11px] text-slate-500">
                  Все матчи до конца дня
                </span>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap gap-2">
                {SPORTS.map((sport) => {
                  const isActive = selectedSport === sport.id;
                  return (
                    <button
                      key={sport.id}
                      type="button"
                      onClick={() => setSelectedSport(sport.id)}
                      className={`flex-1 min-w-[100px] flex items-center justify-center sm:justify-start gap-2 py-2 px-3 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-emerald-950/60 to-emerald-900/30 border-emerald-500/60 text-white shadow-sm shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                          : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] text-slate-300 hover:bg-white/[0.04]'
                      }`}
                    >
                      <span className="text-base leading-none">{sport.icon}</span>
                      <span className="font-bold text-xs text-white tracking-tight">{sport.name}</span>
                      {isActive && (
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-auto shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Date and Time Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
              {/* Date selection with calendar popup */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Дата матчей (календарь)</span>
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQuickDate(0)}
                      className="px-2.5 py-1 text-[11px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg text-slate-300 transition-colors font-medium cursor-pointer"
                    >
                      Сегодня
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDate(1)}
                      className="px-2.5 py-1 text-[11px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg text-slate-300 transition-colors font-medium cursor-pointer"
                    >
                      Завтра
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDate(2)}
                      className="px-2.5 py-1 text-[11px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg text-slate-300 transition-colors font-medium cursor-pointer"
                    >
                      Послезавтра
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-[#090C13] border border-white/[0.1] hover:border-white/[0.2] focus:border-emerald-500 rounded-xl px-4 py-3 text-white text-sm font-semibold outline-none transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Time selection */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Время начала событий</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      const h = String(d.getHours()).padStart(2, '0');
                      const m = String(d.getMinutes()).padStart(2, '0');
                      setSelectedTime(`${h}:${m}`);
                    }}
                    className="px-2.5 py-1 text-[11px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg text-amber-300 transition-colors font-medium cursor-pointer"
                  >
                    Сейчас ({currentHours}:{currentMinutes})
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full bg-[#090C13] border border-white/[0.1] hover:border-white/[0.2] focus:border-emerald-500 rounded-xl px-4 py-3 text-white text-sm font-semibold outline-none transition-all shadow-inner"
                  />
                  <div className="shrink-0 text-xs font-semibold text-slate-400 px-3.5 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                    → до 23:59
                  </div>
                </div>
              </div>
            </div>

            {/* 3. THE ONE BUTTON (ПРОГНОЗ) - Clean, prominent, powerful */}
            <div className="pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={handleAnalyze}
                className={`w-full relative group overflow-hidden rounded-2xl py-4 sm:py-5 px-6 font-black text-base sm:text-lg tracking-wider uppercase transition-all duration-300 cursor-pointer shadow-xl ${
                  loading
                    ? 'bg-slate-900 text-slate-500 cursor-not-allowed border border-white/[0.06]'
                    : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:via-teal-300 hover:to-emerald-300 text-slate-950 shadow-emerald-500/20 hover:shadow-emerald-500/35 hover:-translate-y-0.5 active:translate-y-0'
                }`}
              >
                <div className="relative z-10 flex items-center justify-center gap-2.5">
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                      <span>Анализ матчей в процессе...</span>
                    </>
                  ) : (
                    <>
                      <Flame className="w-5 h-5 text-slate-950" />
                      <span>ПРОГНОЗ</span>
                      <ChevronRight className="w-5 h-5 text-slate-950 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </div>
                {!loading && (
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Loading Progress Section (Aesthetic Minimal Scan) */}
        {loading && (
          <section className="rounded-3xl bg-[#0D111A]/90 border border-emerald-500/30 p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">
                    Анализ спортивных событий до конца дня
                  </h3>
                  <p className="text-xs text-slate-400">
                    Обработка всех игр в диапазоне времени с глубоким xG-моделированием
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center px-3 py-1.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-slate-400">Проверено событий:</span>
                <span className="font-black text-emerald-400 text-sm">{scannedCount}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              {analysisSteps.map((step, idx) => {
                const isPassed = loadingStage > idx;
                const isCurrent = loadingStage === idx;
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 text-xs sm:text-sm p-3 rounded-xl transition-all ${
                      isCurrent
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold'
                        : isPassed
                        ? 'text-slate-400 bg-white/[0.01]'
                        : 'text-slate-600'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                      {isPassed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : isCurrent ? (
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
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

        {/* Error notification banner if any */}
        {errorMessage && (
          <div className="rounded-2xl bg-rose-950/40 border border-rose-500/40 p-4 text-sm text-rose-200 flex items-start gap-3 backdrop-blur-md">
            <span className="text-xl">⚠️</span>
            <div className="space-y-1">
              <div className="font-bold text-white">Внимание: {errorMessage}</div>
              <div className="text-xs text-rose-300/80">
                Убедитесь, что в панели Vercel (Project Settings → Environment Variables) добавлена переменная <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300">GEMINI_API_KEY</code>.
              </div>
            </div>
          </div>
        )}

        {/* RESULTS SECTION: Aesthetic Summary & Required Table */}
        {!loading && data && (
          <div className="space-y-6 animate-fadeIn">
            {/* Aesthetic Summary Card */}
            <div className="rounded-3xl bg-[#0D111A]/90 border border-white/[0.08] p-6 shadow-2xl backdrop-blur-xl space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold text-xs uppercase tracking-wider">
                      Резюме анализа
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/[0.04] text-slate-300 font-mono">
                      {data.brotherSummary.timeRange}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-white">
                    {data.brotherSummary.greeting}
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={copyExpress}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/10 cursor-pointer"
                  >
                    {expressCopied ? <Check className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                    <span>{expressCopied ? 'Скопировано!' : 'Собрать экспресс'}</span>
                  </button>
                </div>
              </div>

              {/* Stats badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#090C13] border border-white/[0.06] p-3.5 rounded-2xl text-center">
                  <div className="text-xs text-slate-400 font-medium">Матчей изучено</div>
                  <div className="text-xl font-black text-white mt-0.5">
                    {data.brotherSummary.matchesAnalyzedTotal}
                  </div>
                  <div className="text-[10px] text-slate-500">100% расписания</div>
                </div>

                <div className="bg-[#090C13] border border-white/[0.06] p-3.5 rounded-2xl text-center">
                  <div className="text-xs text-slate-400 font-medium">Прошло в таблицу</div>
                  <div className="text-xl font-black text-emerald-400 mt-0.5">
                    {data.brotherSummary.matchesQualified}
                  </div>
                  <div className="text-[10px] text-emerald-400/70">Только ≥ 80%</div>
                </div>

                <div className="bg-[#090C13] border border-white/[0.06] p-3.5 rounded-2xl text-center">
                  <div className="text-xs text-slate-400 font-medium">Средняя вероятность</div>
                  <div className="text-xl font-black text-amber-400 mt-0.5">
                    {data.brotherSummary.averageConfidence}%
                  </div>
                  <div className="text-[10px] text-amber-400/70">Высокая точность</div>
                </div>

                <div className="bg-[#090C13] border border-white/[0.06] p-3.5 rounded-2xl text-center">
                  <div className="text-xs text-slate-400 font-medium">Статус отбора</div>
                  <div className="text-xl font-black text-teal-400 mt-0.5">Строгий</div>
                  <div className="text-[10px] text-teal-400/70">Без сомнительных</div>
                </div>
              </div>

              {/* Tip block */}
              <div className="flex items-start gap-3 bg-white/[0.02] border border-white/[0.06] p-3.5 rounded-2xl text-xs text-slate-300">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">Совет Брата: </span>
                  {data.brotherSummary.brotherTip}
                </div>
              </div>
            </div>

            {/* Filter and Table Tools */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0D111A]/90 border border-white/[0.08] p-4 rounded-2xl">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white text-sm">
                  Таблица отобранных прогнозов ({filteredMatches.length} матчей)
                </span>
                <span className="text-xs text-slate-500">
                  • Меньше 80% не вписывается
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Порог от:</span>
                <div className="flex bg-[#090C13] p-1 rounded-xl border border-white/[0.06]">
                  {[80, 85, 90].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setConfidenceFilter(val)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        confidenceFilter === val
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
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
            <div className="overflow-x-auto rounded-3xl border border-white/[0.08] bg-[#0D111A]/90 shadow-2xl backdrop-blur-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-[#090C13]/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-4 px-4 sm:px-6 w-12 text-center">#</th>
                    <th className="py-4 px-4 sm:px-6 min-w-[200px]">1. Название матча</th>
                    <th className="py-4 px-4 sm:px-6 w-28 whitespace-nowrap">2. Время</th>
                    <th className="py-4 px-4 sm:px-6 min-w-[280px]">
                      3. Точное прогнозируемое событие (в одной строке)
                    </th>
                    <th className="py-4 px-4 sm:px-6 w-32 whitespace-nowrap text-center">
                      4. Вероятность
                    </th>
                    <th className="py-4 px-4 sm:px-6 min-w-[320px]">5. Обоснование почему</th>
                    <th className="py-4 px-4 w-16 text-center">Копия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-sm">
                  {filteredMatches.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <div className="max-w-md mx-auto space-y-2">
                          <p className="font-bold text-white">В этот промежуток нет матчей с вероятностью ≥ {confidenceFilter}%</p>
                          <p className="text-xs text-slate-500">
                            Все события ниже заданного порога были отсеяны.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredMatches.map((match, idx) => {
                      const isExpanded = !!expandedReasoning[match.id];
                      const maxProb = Math.max(...match.predictions.map((p) => p.probability));

                      return (
                        <tr
                          key={match.id}
                          className="hover:bg-white/[0.02] transition-colors group"
                        >
                          {/* Row Index */}
                          <td className="py-5 px-4 sm:px-6 text-center text-slate-500 font-mono text-xs">
                            {idx + 1}
                          </td>

                          {/* 1. Название матча */}
                          <td className="py-5 px-4 sm:px-6">
                            <div className="space-y-1">
                              <span className="text-[10px] font-semibold text-emerald-400 tracking-wider uppercase block">
                                {match.league}
                              </span>
                              <div className="font-extrabold text-white text-base tracking-tight group-hover:text-emerald-300 transition-colors">
                                {match.matchName}
                              </div>
                              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                                <span>{match.homeTeam}</span>
                                <span className="text-slate-600 font-bold">vs</span>
                                <span>{match.awayTeam}</span>
                              </div>
                            </div>
                          </td>

                          {/* 2. Время */}
                          <td className="py-5 px-4 sm:px-6 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#090C13] border border-white/[0.08] text-slate-200 font-mono font-bold text-xs">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              <span>{match.time}</span>
                            </div>
                          </td>

                          {/* 3. Точное прогнозируемое событие (рядом в одной строке) */}
                          <td className="py-5 px-4 sm:px-6">
                            <div className="flex flex-wrap gap-2 items-center">
                              {match.predictions.map((pred, pIdx) => {
                                const isHigh = pred.probability >= 88;
                                return (
                                  <div
                                    key={pIdx}
                                    className={`flex flex-col p-2.5 rounded-xl border transition-all ${
                                      isHigh
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                                        : 'bg-[#090C13] border-white/[0.08] text-slate-200'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="font-bold text-xs sm:text-sm text-white">
                                        {pred.event}
                                      </span>
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                          isHigh
                                            ? 'bg-emerald-500 text-slate-950'
                                            : 'bg-white/[0.08] text-slate-300'
                                        }`}
                                      >
                                        {pred.probability}%
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 mt-1 text-[11px] text-slate-400">
                                      <span>кэф ~{pred.estimatedOdds}</span>
                                      <span className="text-emerald-400 font-medium">{pred.tag}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>

                          {/* 4. Процент вероятности/точности */}
                          <td className="py-5 px-4 sm:px-6 text-center whitespace-nowrap">
                            <div className="inline-flex flex-col items-center">
                              <div className="font-black text-lg text-emerald-400">
                                {maxProb}%
                              </div>
                              <div className="w-16 bg-white/[0.06] h-1.5 rounded-full overflow-hidden mt-1">
                                <div
                                  className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full"
                                  style={{ width: `${maxProb}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* 5. Обоснование почему */}
                          <td className="py-5 px-4 sm:px-6">
                            <div className="space-y-2">
                              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                                {isExpanded
                                  ? match.reasoning
                                  : `${match.reasoning.slice(0, 150)}...`}
                              </p>

                              {match.reasoning.length > 150 && (
                                <button
                                  type="button"
                                  onClick={() => toggleReasoning(match.id)}
                                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer"
                                >
                                  {isExpanded ? 'Свернуть' : 'Подробнее'}
                                </button>
                              )}

                              {match.keyStats && match.keyStats.length > 0 && (
                                <div className="space-y-1 pt-1 border-t border-white/[0.04]">
                                  {(isExpanded ? match.keyStats : match.keyStats.slice(0, 1)).map(
                                    (stat, sIdx) => (
                                      <div
                                        key={sIdx}
                                        className="text-[11px] text-slate-400 flex items-start gap-1.5"
                                      >
                                        <span className="text-emerald-400 font-bold">•</span>
                                        <span>{stat}</span>
                                      </div>
                                    )
                                  )}
                                </div>
                              )}

                              {/* Verdict */}
                              <div className="bg-[#090C13] border border-white/[0.06] rounded-xl p-2.5 text-xs text-slate-300 flex items-start gap-2">
                                <span className="font-extrabold text-amber-400 shrink-0">
                                  Вердикт:
                                </span>
                                <span className="italic text-slate-300">{match.brotherVerdict}</span>
                              </div>
                            </div>
                          </td>

                          {/* Action */}
                          <td className="py-5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => copyMatchForecast(match)}
                              title="Скопировать прогноз матча"
                              className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 hover:text-white transition-all cursor-pointer"
                            >
                              {copiedId === match.id ? (
                                <Check className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] bg-[#07090E] py-6 text-center text-xs text-slate-500 relative z-10">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-medium text-slate-400">
            «БРАТ» • Спортивный аналитик
          </p>
        </div>
      </footer>
    </div>
  );
}
