"use client";

import { Search, ScanLine, Database, ShieldCheck, GraduationCap, MoreHorizontal, Lightbulb, Wand2, ChevronRight, MessageSquare } from "lucide-react";
import { IconAiSpark } from "./IconAiSpark";
import { WelcomeCharacter3D } from "./character3d/WelcomeCharacter3D";
import { useAuthStore } from "@/store/authStore";
import { useCharacterStore } from "@/store/characterStore";

interface Props {
  onSendPrompt: (text: string) => void;
  onStartChat: () => void;
  compact?: boolean;
}

interface QuickAction {
  label: string;
  hint: string;
  icon: React.ReactNode;
  bg: string;
  iconColor: string;
  message: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Поиск",
    hint: "платежа",
    icon: <Search className="w-5 h-5" strokeWidth={2.2} />,
    bg: "bg-[#e6f7f1]",
    iconColor: "text-[#0a8064]",
    message: "Найди платёж",
  },
  {
    label: "Сканировать",
    hint: "счёта",
    icon: <ScanLine className="w-5 h-5" strokeWidth={2.2} />,
    bg: "bg-[#e6f0fa]",
    iconColor: "text-[#0e6cb8]",
    message: "Помоги заполнить платёж по фото счёта",
  },
  {
    label: "Данные",
    hint: "из 1С",
    icon: <Database className="w-5 h-5" strokeWidth={2.2} />,
    bg: "bg-[#f1ebfb]",
    iconColor: "text-[#6b3fc9]",
    message: "Покажи данные из 1С",
  },
  {
    label: "Контрагент",
    hint: "проверка",
    icon: <ShieldCheck className="w-5 h-5" strokeWidth={2.2} />,
    bg: "bg-[#fdeede]",
    iconColor: "text-[#c2560d]",
    message: "Проверь контрагента",
  },
  {
    label: "Обучение",
    hint: "процессам",
    icon: <GraduationCap className="w-5 h-5" strokeWidth={2.2} />,
    bg: "bg-[#dcf3e8]",
    iconColor: "text-[#0a8064]",
    message: "Расскажи как работать в СберБизнес",
  },
  {
    label: "Другое",
    hint: "запросы",
    icon: <MoreHorizontal className="w-5 h-5" strokeWidth={2.2} />,
    bg: "bg-[#eef0f3]",
    iconColor: "text-[#5a6470]",
    message: "Что ты умеешь?",
  },
];

const SPECIAL_TILES = [
  {
    label: "Налоговые подсказки",
    icon: <Lightbulb className="w-4 h-4" />,
    message: "Подскажи по налогам на этой неделе",
  },
  {
    label: "Создать паттерны",
    icon: <Wand2 className="w-4 h-4" />,
    message: "Создай паттерн для регулярных платежей",
  },
];

/**
 * Приветственный экран плавающего чата — дизайн в стиле web mobile Copilot:
 * карточка с аватаром ассистента на мятном градиенте, приветствие,
 * сетка популярных запросов, «специально для вас» и крупная кнопка-CTA.
 */
export function WelcomeScreen({ onSendPrompt, onStartChat, compact }: Props) {
  const user = useAuthStore((s) => s.user);
  const characterName = useCharacterStore((s) => s.config.name);
  const greetingName =
    user?.display_name?.split(/[\s@.]/)[0] ||
    user?.login?.split(/[\s@.]/)[0] ||
    "Алексей";

  const handleTileClick = (message: string) => {
    onSendPrompt(message);
  };

  const avatarSize = compact ? 96 : 128;

  return (
    <div className={`flex flex-col w-full bg-white ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
      {/* Карточка ассистента */}
      <div
        className={`relative w-full overflow-hidden rounded-2xl ${
          compact ? "h-36" : "h-48 sm:h-52"
        }`}
        style={{
          background:
            "linear-gradient(135deg, #b8d8d3 0%, #c8e4dd 35%, #d6ece5 70%, #e3f1ea 100%)",
        }}
      >
        {/* Тонкий зернистый оверлей для имитации фото-фона */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(circle at 30% 40%, rgba(255,255,255,0.6) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(255,255,255,0.3) 0%, transparent 50%)",
          }}
          aria-hidden
        />
        {/* 3D-аватар ассистента (Александр / Александра) */}
        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <div className="flex flex-col items-center">
            <WelcomeCharacter3D size={avatarSize} />
          </div>
        </div>
        {/* Sparkles-чип в углу */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-white/70 backdrop-blur-sm rounded-full px-2 py-1 text-[10px] font-bold text-[#0d6e68]">
          <IconAiSpark size={12} />
          <span>AI · персонализировано</span>
        </div>
      </div>

      {/* Заголовок */}
      <div className={`${compact ? "mt-3" : "mt-4"} text-left`}>
        <h2 className={`${compact ? "text-base" : "text-lg sm:text-xl"} font-bold text-[#1f1f22] leading-tight`}>
          Добрый день, {greetingName}.
        </h2>
        <p className={`${compact ? "text-sm" : "text-base"} text-[#1f1f22] font-medium leading-snug`}>
          Чем я могу помочь?
        </p>
      </div>

      {/* ПОПУЛЯРНЫЕ ЗАПРОСЫ */}
      <div className="mt-4">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#9aa1a8] mb-2 px-0.5">
          Популярные запросы
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => handleTileClick(action.message)}
              className="flex flex-col items-center gap-1.5 px-1.5 py-2.5 rounded-xl bg-white border border-[#eef0f3] hover:border-[#0d6e68]/40 hover:shadow-sm transition-all text-center"
            >
              <div
                className={`w-9 h-9 rounded-lg ${action.bg} ${action.iconColor} flex items-center justify-center`}
                aria-hidden
              >
                {action.icon}
              </div>
              <div className="min-w-0 w-full">
                <p className="text-[11px] font-bold text-[#1f1f22] truncate leading-tight">
                  {action.label}
                </p>
                <p className="text-[10px] text-[#7d838a] truncate leading-tight">
                  {action.hint}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* СПЕЦИАЛЬНО ДЛЯ ВАС */}
      <div className="mt-4">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#9aa1a8] mb-2 px-0.5">
          Специально для вас
        </p>
        <div className="space-y-1.5">
          {SPECIAL_TILES.map((tile) => (
            <button
              key={tile.label}
              type="button"
              onClick={() => handleTileClick(tile.message)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#f5f7f9] hover:bg-[#eef1f4] border border-transparent hover:border-[#d8dde3] transition-all text-left group"
            >
              <span className="w-7 h-7 rounded-lg bg-white text-[#0d6e68] flex items-center justify-center border border-[#e4e8eb] group-hover:border-[#0d6e68]/30">
                {tile.icon}
              </span>
              <span className="flex-1 text-[12.5px] font-semibold text-[#1f1f22] truncate">
                {tile.label}
              </span>
              <ChevronRight className="w-4 h-4 text-[#9aa1a8] group-hover:text-[#0d6e68] shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Большая CTA-кнопка */}
      <button
        type="button"
        onClick={onStartChat}
        className={`mt-4 w-full bg-gradient-to-br from-[#0a3d2e] to-[#0a2818] hover:from-[#0d4a37] hover:to-[#0d3020] text-white font-bold ${compact ? "py-2.5 text-sm" : "py-3 text-[15px]"} rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(8,53,38,0.32)] transition-all`}
      >
        <MessageSquare className={compact ? "w-4 h-4" : "w-5 h-5"} strokeWidth={2.2} />
        Начать чат
        <ChevronRight className={compact ? "w-4 h-4" : "w-5 h-5"} />
      </button>
    </div>
  );
}
