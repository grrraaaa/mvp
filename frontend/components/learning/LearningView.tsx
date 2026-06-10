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
  MessageSquare,
  Rocket,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useSbbolUi } from "@/components/layout/SbbolUiContext";
import { useAssistantStore } from "@/store/assistantStore";
import { LEARNING_MODULES, type LearningModule } from "./learningContent";

const STORAGE_KEY = "sbbol_learning_progress";

const ICONS: Record<LearningModule["iconKey"], React.ReactNode> = {
  rocket: <Rocket className="w-5 h-5" />,
  banknote: <Banknote className="w-5 h-5" />,
  file: <FileText className="w-5 h-5" />,
  users: <Users className="w-5 h-5" />,
  shield: <ShieldCheck className="w-5 h-5" />,
};

function loadProgress(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export default function LearningView() {
  const { openChat } = useSbbolUi();
  const setSuggestedChips = useAssistantStore((s) => s.setSuggestedChips);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [openModule, setOpenModule] = useState<string>(LEARNING_MODULES[0].id);

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

  return (
    <div className="font-sans -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Teal header */}
      <div className="bg-[#2d9494] text-white px-4 sm:px-6 py-5">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/other" className="p-1 hover:bg-white/10 rounded" aria-label="Назад">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <GraduationCap className="w-6 h-6" />
            <div>
              <h1 className="text-lg font-semibold leading-tight">Обучающий модуль</h1>
              <p className="text-xs text-white/80">
                Интерактивный курс по СберБизнес: {totalLessons} уроков в 5 модулях
              </p>
            </div>
          </div>
          {/* Overall progress */}
          <div className="mt-4 bg-white/15 rounded-xl p-3.5">
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
        </div>
      </div>

      {/* Modules */}
      <div className="bg-[#f4f6f8] px-4 sm:px-6 py-6 min-h-[400px]">
        <div className="max-w-4xl mx-auto space-y-4">
          {LEARNING_MODULES.map((mod) => {
            const modDone = mod.lessons.filter((l) => done[l.id]).length;
            const modPct = Math.round((modDone / mod.lessons.length) * 100);
            const expanded = openModule === mod.id;
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
                    className="p-2.5 rounded-xl text-white shrink-0"
                    style={{ background: mod.accent }}
                  >
                    {ICONS[mod.iconKey]}
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
                          onClick={() => toggleLesson(lesson.id)}
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
                                onClick={() => askAssistant(lesson.ask!)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2d9494]/10 text-xs font-semibold text-[#2d9494] hover:bg-[#2d9494]/20"
                              >
                                <MessageSquare className="w-3 h-3" />
                                Спросить: «{lesson.ask}»
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleLesson(lesson.id)}
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
      </div>
    </div>
  );
}
