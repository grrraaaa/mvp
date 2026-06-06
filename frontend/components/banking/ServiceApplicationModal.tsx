"use client";

import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { showStubToast } from "@/lib/sbbol/stubToast";

interface Props {
  serviceName?: string;
  onClose: () => void;
}

export function ServiceApplicationModal({ serviceName, onClose }: Props) {
  const [orgName, setOrgName] = useState("");
  const [phone, setPhone] = useState("+375 ");
  const [comment, setComment] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    showStubToast(
      `Заявка на «${serviceName ?? "сервис"}» принята (демо). Менеджер свяжется в течение 1 рабочего дня.`,
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
          aria-label="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-gray-900 pr-8">Заявка на подключение</h2>
        {serviceName && (
          <p className="text-sm text-[#107f8c] font-medium mt-1">{serviceName}</p>
        )}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="block text-xs font-semibold text-gray-600">
            Организация
            <input
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              placeholder="ООО Пример"
            />
          </label>
          <label className="block text-xs font-semibold text-gray-600">
            Телефон
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-semibold text-gray-600">
            Комментарий
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
              placeholder="Уточните тариф или оборот"
            />
          </label>
          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-[#21A038] text-white text-sm font-semibold hover:bg-[#1a8030]"
          >
            Отправить заявку (демо)
          </button>
        </form>
      </div>
    </div>
  );
}
