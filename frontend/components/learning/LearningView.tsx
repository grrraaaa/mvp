"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Banknote,
  BarChart3,
  Bell,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Copy,
  Database,
  ExternalLink,
  FileText,
  Filter,
  GraduationCap,
  LineChart,
  MessageSquare,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { useSbbolUi } from "@/components/layout/SbbolUiContext";
import { useAssistantStore } from "@/store/assistantStore";
import {
  AI_COMMANDS,
  AI_REAL_CAPABILITIES,
  CATEGORY_SUBLABEL,
  DEMO_QUICK_START,
  LEARNING_MODULES,
  type AiCategory,
  type AiCommand,
  type LearningModule,
} from "./learningContent";

const STORAGE_KEY = "sbbol_learning_progress";

const ICONS: Record<LearningModule["iconKey"], React.ReactNode> = {
  rocket: <Rocket className="w-5 h-5" />,
  banknote: <Banknote className="w-5 h-5" />,
  file: <FileText className="w-5 h-5" />,
  users: <Users className="w-5 h-5" />,
  shield: <ShieldCheck className="w-5 h-5" />,
  sparkles: <Sparkles className="w-5 h-5" />,
  chart: <LineChart className="w-5 h-5" />,
  form: <Wand2 className="w-5 h-5" />,
  search: <Search className="w-5 h-5" />,
  voice: <Sparkles className="w-5 h-5" />,
  onec: <Database className="w-5 h-5" />,
  bell: <Bell className="w-5 h-5" />,
};

const CATEGORY_ACCENT: Record<AiCategory, string> = {
  Платежи: "#138d8a",
  Документы: "#2c9faf",
  Графики: "#7b3fbe",
  Аналитика: "#5b8def",
  Навигация: "#e9a23b",
  Сервисы: "#d9534f",
  Формы: "#9b5de5",
  "1С": "#0a8064",
  Напоминания: "#c2560d",
  Кнопки: "#5e6472",
  Продукты: "#1f7a8c",
  Страхование: "#a35dba",
};

const CATEGORY_BG: Record<AiCategory, string> = {
  Платежи: "from-[#138d8a]/10 to-[#138d8a]/5",
  Документы: "from-[#2c9faf]/10 to-[#2c9faf]/5",
  Графики: "from-[#7b3fbe]/10 to-[#7b3fbe]/5",
  Аналитика: "from-[#5b8def]/10 to-[#5b8def]/5",
  Навигация: "from-[#e9a23b]/10 to-[#e9a23b]/5",
  Сервисы: "from-[#d9534f]/10 to-[#d9534f]/5",
  Формы: "from-[#9b5de5]/10 to-[#9b5de5]/5",
  "1С": "from-[#0a8064]/10 to-[#0a8064]/5",
  Напоминания: "from-[#c2560d]/10 to-[#c2560d]/5",
  Кнопки: "from-[#5e6472]/10 to-[#5e6472]/5",
  Продукты: "from-[#1f7a8c]/10 to-[#1f7a8c]/5",
  Страхование: "from-[#a35dba]/10 to-[#a35dba]/5",
};

/** Монограмма в кружочке — строгая замена эмодзи в карточках команд. */
function CategoryBadge({ category, size = 40 }: { category: AiCategory; size?: number }) {
  const accent = CATEGORY_ACCENT[category];
  const letter = category === "1С" ? "1" : category.charAt(0);
  return (
    <div
      className="rounded-md flex items-center justify-center shrink-0 text-white font-bold"
      style={{
        width: size,
        height: size,
        background: accent,
        fontSize: size * 0.42,
        lineHeight: 1,
      }}
      aria-hidden
    >
      {letter}
    </div>
  );
}

function loadProgress(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

type Tab = "modules" | "commands";

export default function LearningView() {
  const { openChat } = useSbbolUi();
  const setSuggestedChips = useAssistantStore((s) => s.setSuggestedChips);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [openModule, setOpenModule] = useState<string>(LEARNING_MODULES[0].id);
  const [tab, setTab] = useState<Tab>("commands");
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<AiCategory | "Все">("Все");

  useEffect(() => {
    setDone(loadProgress());
  }, []);

  const toggleLesson = (id: string) => {
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* quota */
      }
      return next;
    });
  };

  const askAssistant = (question: string) => {
    setSuggestedChips([question]);
    openChat();
  };

  const totalLessons = useMemo(
    () => LEARNING_MODULES.reduce((s, m) => s + m.lessons.length, 0),
    [],
  );
  const doneCount = useMemo(
    () =>
      LEARNING_MODULES.reduce(
        (s, m) => s + m.lessons.filter((l) => done[l.id]).length,
        0,
      ),
    [done],
  );
  const pct = Math.round((doneCount / totalLessons) * 100);

  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    return AI_COMMANDS.filter((c) => {
      if (activeCategory !== "Все" && c.category !== activeCategory) return false;
      if (!q) return true;
      return (
        c.cmd.toLowerCase().includes(q) ||
        c.example.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    });
  }, [query, activeCategory]);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const out: (AiCategory | "Все")[] = ["Все"];
    for (const c of AI_COMMANDS) {
      if (!seen.has(c.category)) {
        seen.add(c.category);
        out.push(c.category);
      }
    }
    return out;
  }, []);

  return (
    <div className="font-sans -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Teal header */}
      <div className="bg-gradient-to-br from-[#2d9494] via-[#2a8a8a] to-[#1d7a7a] text-white px-4 sm:px-6 py-6 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute -bottom-12 -left-8 w-48 h-48 rounded-full bg-white/5 blur-3xl" />
        <div className="max-w-4xl mx-auto relative">
          <div className="flex items-center gap-3">
            <Link href="/other" className="p-1 hover:bg-white/10 rounded" aria-label="Назад">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">ИИ-консультант СберБизнес</h1>
              <p className="text-xs text-white/80">
                Реальные возможности демо-проекта — готовые запросы для чата справа
              </p>
            </div>
          </div>
          {/* Overall progress */}
          <div className="mt-4 bg-white/15 backdrop-blur rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span className="flex items-center gap-1.5">
                <Award className="w-4 h-4" />
                Прогресс обучения
              </span>
              <span>
                {doneCount} из {totalLessons} · {pct}%
              </span>
            </div>
            <div className="h-2 bg-white/25 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            {pct === 100 && (
              <p className="text-xs mt-2 font-semibold">
                Поздравляем! Курс пройден полностью — вы готовы к работе в СберБизнес.
              </p>
            )}
          </div>

          {/* Tabs */}
          <div className="mt-3 flex gap-1 bg-white/10 rounded-xl p-1 backdrop-blur">
            <button
              type="button"
              onClick={() => setTab("commands")}
              className={`flex-1 text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                tab === "commands" ? "bg-white text-[#1d7a7a] shadow-sm" : "text-white/90 hover:bg-white/10"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Попробовать ({DEMO_QUICK_START.length} шагов)
            </button>
            <button
              type="button"
              onClick={() => setTab("modules")}
              className={`flex-1 text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                tab === "modules" ? "bg-white text-[#1d7a7a] shadow-sm" : "text-white/90 hover:bg-white/10"
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              Уроки ({LEARNING_MODULES.length})
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#f4f6f8] px-4 sm:px-6 py-6 min-h-[400px]">
        <div className="max-w-4xl mx-auto">
          {tab === "modules" ? (
            <ModulesTab
              done={done}
              openModule={openModule}
              setOpenModule={setOpenModule}
              onToggle={toggleLesson}
              onAsk={askAssistant}
            />
          ) : (
            <CommandsTab
              query={query}
              setQuery={setQuery}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              categories={categories}
              filtered={filteredCommands}
              onAsk={askAssistant}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ModulesTab({
  done,
  openModule,
  setOpenModule,
  onToggle,
  onAsk,
}: {
  done: Record<string, boolean>;
  openModule: string;
  setOpenModule: (s: string) => void;
  onToggle: (id: string) => void;
  onAsk: (q: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#138d8a]/30 bg-[#138d8a]/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <p className="text-sm font-bold text-gray-900">Сначала попробуйте готовые запросы</p>
          <p className="text-xs text-gray-600 mt-1">
            На вкладке «Попробовать» — 10 шагов с кнопкой «Спросить» и полный каталог из {AI_COMMANDS.length} команд.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onAsk(DEMO_QUICK_START[0].ask)}
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#138d8a] text-white text-xs font-semibold hover:bg-[#0e6b69]"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {DEMO_QUICK_START[0].ask}
        </button>
      </div>
      {LEARNING_MODULES.map((mod) => {
        const modDone = mod.lessons.filter((l) => done[l.id]).length;
        const modPct = Math.round((modDone / mod.lessons.length) * 100);
        const expanded = openModule === mod.id;
        const isNew = ["ai-basics", "ai-charts", "ai-forms", "ai-search", "ai-products", "ai-buttons", "ai-knowledge"].includes(mod.id);
        return (
          <div
            key={mod.id}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setOpenModule(expanded ? "" : mod.id)}
              className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50/70"
            >
              <span
                className="p-2.5 rounded-xl text-white shrink-0 relative"
                style={{ background: mod.accent }}
              >
                {ICONS[mod.iconKey]}
                {isNew && (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-amber-400 text-[8px] font-bold text-amber-900 uppercase">
                    new
                  </span>
                )}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-sm text-gray-900">{mod.title}</span>
                <span className="block text-xs text-gray-500 mt-0.5">{mod.subtitle}</span>
                <span className="mt-2 flex items-center gap-2">
                  <span className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <span
                      className="block h-full rounded-full transition-all duration-500"
                      style={{ width: `${modPct}%`, background: mod.accent }}
                    />
                  </span>
                  <span className="text-[10px] font-bold text-gray-400 shrink-0">
                    {modDone}/{mod.lessons.length}
                  </span>
                </span>
              </span>
              <ChevronDown
                className={`w-5 h-5 text-gray-400 transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`}
              />
            </button>

            {expanded && (
              <div className="border-t border-gray-100 divide-y divide-gray-50">
                {mod.lessons.map((lesson, idx) => (
                  <div key={lesson.id} className="px-5 py-4 flex gap-3.5">
                    <button
                      type="button"
                      onClick={() => onToggle(lesson.id)}
                      className="mt-0.5 shrink-0"
                      aria-label={done[lesson.id] ? "Снять отметку" : "Отметить пройденным"}
                    >
                      {done[lesson.id] ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300 hover:text-emerald-400" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-semibold ${done[lesson.id] ? "text-gray-400 line-through" : "text-gray-800"}`}
                      >
                        Урок {idx + 1}. {lesson.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{lesson.text}</p>
                      <div className="flex flex-wrap gap-2 mt-2.5">
                        {lesson.href && (
                          <Link
                            href={lesson.href}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:border-[#2d9494] hover:text-[#2d9494]"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {lesson.hrefLabel ?? "Открыть"}
                          </Link>
                        )}
                        {lesson.ask && (
                          <button
                            type="button"
                            onClick={() => onAsk(lesson.ask!)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2d9494]/10 text-xs font-semibold text-[#2d9494] hover:bg-[#2d9494]/20"
                          >
                            <MessageSquare className="w-3 h-3" />
                            Спросить: «{lesson.ask}»
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onToggle(lesson.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                            done[lesson.id]
                              ? "bg-gray-100 text-gray-500 hover:bg-gray-200"
                              : "bg-emerald-500 text-white hover:bg-emerald-600"
                          }`}
                        >
                          {done[lesson.id] ? "Пройдено ✓" : "Отметить пройденным"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CommandsTab({
  query,
  setQuery,
  activeCategory,
  setActiveCategory,
  categories,
  filtered,
  onAsk,
}: {
  query: string;
  setQuery: (s: string) => void;
  activeCategory: AiCategory | "Все";
  setActiveCategory: (c: AiCategory | "Все") => void;
  categories: (AiCategory | "Все")[];
  filtered: AiCommand[];
  onAsk: (q: string) => void;
}) {
  const totalFeatured = useMemo(
    () => AI_COMMANDS.filter((c) => c.featured).length,
    [],
  );
  const featured = useMemo(
    () => AI_COMMANDS.filter((c) => c.featured).slice(0, 6),
    [],
  );
  const categoriesCount = categories.length - 1; // без "Все"

  return (
    <div className="space-y-5">
      {/* HERO — корпоративный, сдержанный */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-6 sm:px-8 sm:py-7 border-b border-gray-100">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#138d8a]">
            <Sparkles className="w-3.5 h-3.5" />
            Каталог команд ИИ
          </div>
          <h2 className="mt-2 text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
            Что уже работает в&nbsp;этом демо
          </h2>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed max-w-2xl">
            Не абстрактный чат-бот: консультант читает счета, документы и выписку вашей
            организации, открывает разделы, заполняет формы, строит графики PNG и проверяет
            реквизиты. Нажмите <b className="text-gray-900">«Спросить»</b> — запрос уйдёт
            в чат справа; можно копировать и менять под себя.
          </p>
        </div>

        {/* Stat row — простая сетка, без градиентов */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
          <HeroStat
            icon={<Zap className="w-4 h-4" />}
            value={AI_COMMANDS.length}
            label="готовых команд"
          />
          <HeroStat
            icon={<Bookmark className="w-4 h-4" />}
            value={categoriesCount}
            label="категорий"
          />
          <HeroStat
            icon={<BarChart3 className="w-4 h-4" />}
            value={4}
            label="типа графиков"
          />
          <HeroStat
            icon={<Database className="w-4 h-4" />}
            value={totalFeatured}
            label="часто используемых"
          />
        </div>

        <div className="px-6 py-3 sm:px-8 bg-gray-50/60 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-gray-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#21a038]" />
            Только контекст СберБизнес
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#21a038]" />
            Rule-based + LLM
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#21a038]" />
            Tenant-изоляция по org_id
          </span>
        </div>
      </section>

      {/* REAL CAPABILITIES */}
      {activeCategory === "Все" && !query && (
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1 h-4 bg-[#138d8a] rounded-sm" />
            <h3 className="text-sm font-bold text-gray-900">Реальные возможности проекта</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {AI_REAL_CAPABILITIES.map((cap) => (
              <div
                key={cap.id}
                className="rounded-xl border border-gray-100 bg-gray-50/50 p-4"
              >
                <p className="text-sm font-semibold text-gray-900">{cap.title}</p>
                <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{cap.detail}</p>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {cap.examples.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => onAsk(ex)}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-white border border-gray-200 text-[#138d8a] hover:border-[#138d8a] hover:bg-[#138d8a]/5 transition-colors"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* DEMO QUICK START — приёмочный сценарий */}
      {activeCategory === "Все" && !query && (
        <section className="bg-white rounded-2xl border border-[#138d8a]/25 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-[#138d8a]/5">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#138d8a]" />
              Попробуйте сейчас — по шагам
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              Скопируйте порядок из приёмочного workflow: каждая кнопка отправляет готовый запрос в чат.
            </p>
          </div>
          <ol className="divide-y divide-gray-100">
            {DEMO_QUICK_START.map((step, idx) => (
              <li key={step.id} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-[#138d8a] text-white text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{step.result}</p>
                    <p className="text-[11px] text-gray-400 mt-1 font-mono truncate" title={step.ask}>
                      {step.ask}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onAsk(step.ask)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#138d8a] text-white text-xs font-semibold hover:bg-[#0e6b69] transition-colors self-start sm:self-center"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Спросить
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* QUICK START — featured commands */}
      {activeCategory === "Все" && !query && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-[#138d8a]" />
              Ещё частые команды
            </h3>
            <span className="text-[11px] text-gray-500">
              {featured.length} из {AI_COMMANDS.length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {featured.map((cmd, idx) => (
              <FeaturedCommandCard key={`f-${idx}`} cmd={cmd} onAsk={onAsk} />
            ))}
          </div>
        </section>
      )}

      {/* SEARCH + CATEGORIES */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3.5">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" />
          Поиск и фильтр
        </div>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Найти: график, платёж, ФСЗН, 1С, контрагент…"
            className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:border-[#138d8a] focus:ring-1 focus:ring-[#138d8a]/30 transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded-md"
              aria-label="Очистить поиск"
            >
              <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Category chips — единый teal + серый */}
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            const count =
              cat === "Все"
                ? AI_COMMANDS.length
                : AI_COMMANDS.filter((c) => c.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`text-[11px] font-semibold px-3 py-1.5 rounded-md border transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? "text-white border-[#138d8a] bg-[#138d8a]"
                    : "text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50 bg-white"
                }`}
              >
                {cat}
                <span
                  className={`text-[9px] font-bold px-1.5 rounded ${
                    isActive ? "bg-white/25 text-white" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {activeCategory !== "Все" && (
          <div className="flex items-center gap-2 text-[11px] text-gray-500 pt-1 border-t border-gray-100">
            <span className="font-semibold text-gray-700">{activeCategory}</span>
            <span className="text-gray-300">·</span>
            <span>{CATEGORY_SUBLABEL[activeCategory]}</span>
          </div>
        )}
      </div>

      {/* RESULTS header */}
      <div className="flex items-baseline justify-between border-b border-gray-200 pb-2">
        <h3 className="text-sm font-bold text-gray-900 flex items-baseline gap-2">
          <span>{activeCategory === "Все" ? "Все команды" : activeCategory}</span>
          <span className="text-xs font-normal text-gray-500">
            · {filtered.length}{" "}
            {pluralize(filtered.length, ["команда", "команды", "команд"])}
          </span>
        </h3>
        {(query || activeCategory !== "Все") && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setActiveCategory("Все");
            }}
            className="text-[11px] font-semibold text-[#138d8a] hover:text-[#0e6b69] flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Сбросить
          </button>
        )}
      </div>

      {/* Results grid */}
      {filtered.length === 0 ? (
        <EmptyState
          onReset={() => {
            setQuery("");
            setActiveCategory("Все");
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((cmd, idx) => (
            <CommandCard key={`${cmd.cmd}-${idx}`} cmd={cmd} onAsk={onAsk} />
          ))}
        </div>
      )}

      {/* HOW IT WORKS */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1 h-4 bg-[#138d8a] rounded-sm" />
          <h3 className="text-sm font-bold text-gray-900">Как это работает</h3>
        </div>
        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-600">
          <Step
            num={1}
            title="Скопируйте или нажмите «Спросить»"
            text="Пример уходит в чат в готовом виде — можно просто отправить, ничего не дописывая."
          />
          <Step
            num={2}
            title="ИИ сопоставляет intent"
            text="Rule-based срабатывает мгновенно. При наличии OPENAI_API_KEY подключается LLM."
          />
          <Step
            num={3}
            title="Действие в реальном времени"
            text="Открывает раздел, заполняет форму, рисует график по данным кабинета, отправляет в шлюз."
          />
        </ol>
      </section>

      {/* TIPS — единый серый стиль */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1 h-3.5 bg-[#138d8a] rounded-sm" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-700">
              Совет
            </span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            ИИ понимает <b>синонимы и падежи</b>: «Иванову», «Иванова», «Иванов» — найдёт
            того же контрагента. Не помните точную команду — опишите задачу своими словами,
            ассистент уточнит детали.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1 h-3.5 bg-[#138d8a] rounded-sm" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-700">
              Рекомендация
            </span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            Говорите обычной фразой с <b>несколькими полями сразу</b>:
            «Получатель Ромашка, сумма 1500, назначение аренда» — ИИ разнесёт значения
            по форме и подтянет УНП / IBAN из справочника автоматически.
          </p>
        </div>
      </section>
    </div>
  );
}

function HeroStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <div className="px-4 py-3.5 flex items-center gap-3">
      <div className="shrink-0 w-9 h-9 rounded-md bg-[#138d8a]/10 text-[#138d8a] flex items-center justify-center">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-gray-900 leading-none">{value}</div>
        <div className="text-[11px] text-gray-500 font-medium mt-1">{label}</div>
      </div>
    </div>
  );
}

function Step({
  num,
  title,
  text,
}: {
  num: number;
  title: string;
  text: string;
}) {
  return (
    <li className="relative rounded-lg border border-gray-200 bg-white p-3 pl-12">
      <span className="absolute left-3 top-3 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white bg-[#138d8a]">
        {num}
      </span>
      <p className="font-semibold text-gray-900 text-[12.5px] leading-snug">{title}</p>
      <p className="text-[11.5px] text-gray-600 mt-1.5 leading-relaxed">{text}</p>
    </li>
  );
}

function pluralize(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

function FeaturedCommandCard({ cmd, onAsk }: { cmd: AiCommand; onAsk: (q: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onAsk(cmd.example)}
      className="group relative text-left rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-[#138d8a] transition-all overflow-hidden"
    >
      <div className="absolute inset-y-0 left-0 w-1 bg-[#138d8a]" />
      <div className="p-4 pl-5">
        <div className="flex items-start gap-3">
          <CategoryBadge category={cmd.category} size={36} />
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-semibold text-gray-900 leading-snug line-clamp-2">
              {cmd.cmd}
            </p>
            <p className="mt-1 text-[11.5px] text-gray-500 leading-snug line-clamp-2">
              {cmd.description}
            </p>
          </div>
        </div>

        <div className="mt-3 px-3 py-2 rounded-md bg-gray-50 border border-gray-200">
          <p className="text-[11px] text-gray-700 font-mono leading-snug">«{cmd.example}»</p>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px]">
          <span className="font-semibold text-gray-500 uppercase tracking-wider">
            {cmd.category}
          </span>
          <span className="font-bold text-[#138d8a] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            Спросить ИИ
            <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </button>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
      <div className="w-14 h-14 mx-auto rounded-full bg-gray-100 flex items-center justify-center">
        <Search className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-sm font-bold text-gray-900 mt-3">Ничего не нашлось</p>
      <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
        Попробуйте другое слово или сбросьте фильтр категории. Все команды работают
        на естественном языке — можно описать задачу своими словами.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#138d8a] hover:bg-[#0e6b69] text-white text-xs font-bold transition-colors"
      >
        Сбросить и показать всё
      </button>
    </div>
  );
}

function CommandCard({ cmd, onAsk }: { cmd: AiCommand; onAsk: (q: string) => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(cmd.example);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="group relative bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#138d8a] transition-all overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-1 bg-[#138d8a]" />

      <div className="p-3.5 pl-4">
        <div className="flex items-start gap-3">
          <CategoryBadge category={cmd.category} size={36} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[13.5px] font-semibold text-gray-900 leading-tight">
                {cmd.cmd}
              </p>
              {cmd.featured && (
                <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-[#138d8a] bg-[#138d8a]/10 px-1.5 py-0.5 rounded">
                  хит
                </span>
              )}
            </div>
            <p className="text-[11.5px] text-gray-600 mt-0.5 leading-snug">
              {cmd.description}
            </p>
          </div>
        </div>

        {/* Example block */}
        <div className="mt-2.5 px-2.5 py-2 rounded-md bg-gray-50 border border-gray-200 group-hover:bg-gray-100/70 transition-colors">
          <div className="flex items-start gap-2">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider shrink-0 mt-0.5">
              Пример
            </p>
            <p className="text-[11.5px] text-gray-800 font-mono leading-snug flex-1">
              «{cmd.example}»
            </p>
            <button
              type="button"
              onClick={copy}
              className="shrink-0 -mt-0.5 p-1 rounded hover:bg-white text-gray-400 hover:text-[#138d8a] transition-colors"
              aria-label="Скопировать пример"
              title="Скопировать"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-[#21a038]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Footer row */}
        <div className="mt-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-gray-500 uppercase tracking-wider">
            {cmd.category}
          </span>
          <button
            type="button"
            onClick={() => onAsk(cmd.example)}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#138d8a] hover:text-[#0e6b69] group/btn"
          >
            <MessageSquare className="w-3 h-3" />
            Спросить
            <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
