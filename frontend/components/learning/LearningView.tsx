"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  Banknote,
  CheckCircle2,
  ChevronDown,
  Circle,
  ExternalLink,
  FileText,
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
} from "lucide-react";
import { useSbbolUi } from "@/components/layout/SbbolUiContext";
import { useAssistantStore } from "@/store/assistantStore";
import {
  AI_COMMANDS,
  LEARNING_MODULES,
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
};

const CATEGORY_ACCENT: Record<AiCommand["category"], string> = {
  Платежи: "#138d8a",
  Документы: "#2c9faf",
  Графики: "#7b3fbe",
  Аналитика: "#5b8def",
  Навигация: "#e9a23b",
  Сервисы: "#d9534f",
  Формы: "#9b5de5",
};

const CATEGORY_BG: Record<AiCommand["category"], string> = {
  Платежи: "from-[#138d8a]/10 to-[#138d8a]/5",
  Документы: "from-[#2c9faf]/10 to-[#2c9faf]/5",
  Графики: "from-[#7b3fbe]/10 to-[#7b3fbe]/5",
  Аналитика: "from-[#5b8def]/10 to-[#5b8def]/5",
  Навигация: "from-[#e9a23b]/10 to-[#e9a23b]/5",
  Сервисы: "from-[#d9534f]/10 to-[#d9534f]/5",
  Формы: "from-[#9b5de5]/10 to-[#9b5de5]/5",
};

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
  const [tab, setTab] = useState<Tab>("modules");
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<AiCommand["category"] | "Все">("Все");

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
    const out: (AiCommand["category"] | "Все")[] = ["Все"];
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
              <h1 className="text-lg font-semibold leading-tight">Обучающий модуль СберБизнес</h1>
              <p className="text-xs text-white/80">
                Курс по работе с банком + каталог команд ИИ-консультанта
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
              onClick={() => setTab("modules")}
              className={`flex-1 text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                tab === "modules" ? "bg-white text-[#1d7a7a] shadow-sm" : "text-white/90 hover:bg-white/10"
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              Уроки ({LEARNING_MODULES.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("commands")}
              className={`flex-1 text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                tab === "commands" ? "bg-white text-[#1d7a7a] shadow-sm" : "text-white/90 hover:bg-white/10"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Команды ИИ ({AI_COMMANDS.length})
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
      {LEARNING_MODULES.map((mod) => {
        const modDone = mod.lessons.filter((l) => done[l.id]).length;
        const modPct = Math.round((modDone / mod.lessons.length) * 100);
        const expanded = openModule === mod.id;
        const isNew = ["ai-basics", "ai-charts", "ai-forms", "ai-search"].includes(mod.id);
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
  activeCategory: AiCommand["category"] | "Все";
  setActiveCategory: (c: AiCommand["category"] | "Все") => void;
  categories: (AiCommand["category"] | "Все")[];
  filtered: AiCommand[];
  onAsk: (q: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1d7a7a] via-[#138d8a] to-[#7b3fbe] text-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Каталог</p>
          <h2 className="text-xl font-bold mt-1">Что умеет ИИ-консультант</h2>
          <p className="text-sm text-white/85 mt-1 leading-relaxed max-w-2xl">
            Все команды работают на естественном языке. Нажмите «Спросить» — ИИ откроет чат
            с готовым сообщением. Или напишите свою фразу — смысл поймём.
          </p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className="px-2.5 py-1 rounded-full bg-white/15 text-[11px] font-semibold backdrop-blur">
              {AI_COMMANDS.length} команд
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white/15 text-[11px] font-semibold backdrop-blur">
              7 категорий
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white/15 text-[11px] font-semibold backdrop-blur">
              📊 4 типа графиков
            </span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Найти команду: «график», «платёж», «ФСЗН»…"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#138d8a] focus:ring-2 focus:ring-[#138d8a]/20"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
              aria-label="Очистить поиск"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            const count = cat === "Все" ? AI_COMMANDS.length : AI_COMMANDS.filter((c) => c.category === cat).length;
            const accent = cat === "Все" ? "#138d8a" : CATEGORY_ACCENT[cat as AiCommand["category"]];
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${
                  isActive
                    ? "text-white border-transparent shadow-sm"
                    : "text-gray-600 border-gray-200 hover:border-gray-300 bg-white"
                }`}
                style={isActive ? { background: accent } : undefined}
              >
                {cat}
                <span
                  className={`text-[9px] font-bold ${isActive ? "text-white/80" : "text-gray-400"}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-2">🤷</div>
          <p className="text-sm text-gray-700 font-semibold">Ничего не нашлось</p>
          <p className="text-xs text-gray-500 mt-1">
            Попробуйте другое слово или сбросьте фильтр категории
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setActiveCategory("Все");
            }}
            className="mt-3 text-xs font-semibold text-[#138d8a] hover:underline"
          >
            Сбросить
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((cmd, idx) => (
            <CommandCard key={`${cmd.cmd}-${idx}`} cmd={cmd} onAsk={onAsk} />
          ))}
        </div>
      )}

      {/* Hint footer */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 leading-relaxed">
        <p className="font-semibold mb-1">💡 Совет</p>
        ИИ понимает синонимы и падежи: «Иванову», «Иванова», «Иванов» — найдёт того же контрагента.
        Не помните точную команду — опишите задачу своими словами, ассистент уточнит.
      </div>
    </div>
  );
}

function CommandCard({ cmd, onAsk }: { cmd: AiCommand; onAsk: (q: string) => void }) {
  const accent = CATEGORY_ACCENT[cmd.category];
  return (
    <div
      className={`relative bg-gradient-to-br ${CATEGORY_BG[cmd.category]} rounded-2xl border border-gray-200 shadow-sm p-3.5 hover:shadow-md transition-shadow group overflow-hidden`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm"
          style={{ background: accent, color: "white" }}
        >
          {cmd.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-gray-900 leading-tight">{cmd.cmd}</p>
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0"
              style={{ background: accent, color: "white" }}
            >
              {cmd.category}
            </span>
          </div>
          <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">{cmd.description}</p>
          <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-white/70 border border-gray-200/60">
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Пример</p>
            <p className="text-xs text-gray-800 mt-0.5 font-mono leading-snug">«{cmd.example}»</p>
          </div>
          <button
            type="button"
            onClick={() => onAsk(cmd.example)}
            className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-white px-2.5 py-1.5 rounded-full shadow-sm hover:opacity-90 transition-opacity"
            style={{ background: accent }}
          >
            <MessageSquare className="w-3 h-3" />
            Спросить ИИ
          </button>
        </div>
      </div>
    </div>
  );
}
