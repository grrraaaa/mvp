"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Clock, Newspaper, Smartphone } from "lucide-react";
import { loginRequest } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";
import { SberBrandLogo } from "@/components/banking/SberBrandLogo";

type Tab = "login" | "ecp";

const DEMO_ACCOUNTS = [
  { login: "demo", password: "demo", label: "ЮЛ — DEMO" },
  { login: "ipivanov", password: "ip123", label: "ИП Иванов" },
  { login: "buhplus", password: "buh123", label: "Бухгалтерия" },
];

export function LoginView() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [tab, setTab] = useState<Tab>("login");
  const [login, setLogin] = useState("demo");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const doLogin = async (user: string, pass: string) => {
    setError("");
    setLoading(true);
    try {
      const data = await loginRequest(user.trim(), pass);
      if (!data.user) throw new Error("Нет данных пользователя");
      setAuth(data.access_token, data.user);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (tab !== "login") return;
    await doLogin(login, password);
  };

  const fillDemo = (acc: (typeof DEMO_ACCOUNTS)[0]) => {
    setTab("login");
    setLogin(acc.login);
    setPassword(acc.password);
    setError("");
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden flex flex-col bg-[#eef2f6] text-[#2c3e50] font-sans antialiased">
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur border-b border-gray-200/80 shadow-sm px-6 h-16 flex items-center shrink-0">
        <SberBrandLogo />
      </header>

      <main className="flex-1 w-full min-h-0 grid grid-cols-1 md:grid-cols-[minmax(0,440px)_1fr] xl:grid-cols-[minmax(0,440px)_minmax(260px,300px)_1fr]">
        {/* Форма входа — фиксированная ширина, без белой полосы справа */}
        <section className="bg-white flex flex-col min-h-[calc(100vh-4rem)] shadow-[4px_0_24px_rgba(15,45,40,0.06)] z-10">
          <div className="flex border-b border-gray-100">
            <button
              type="button"
              onClick={() => setTab("login")}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                tab === "login"
                  ? "text-[#138d8a] border-b-[3px] border-[#138d8a] -mb-px bg-white"
                  : "text-gray-500 hover:text-gray-700 border-b-[3px] border-transparent"
              }`}
            >
              Вход
            </button>
            <button
              type="button"
              onClick={() => setTab("ecp")}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                tab === "ecp"
                  ? "text-[#138d8a] border-b-[3px] border-[#138d8a] -mb-px bg-white"
                  : "text-gray-500 hover:text-gray-700 border-b-[3px] border-transparent"
              }`}
            >
              Вход по ЭЦП
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-center px-8 sm:px-10 py-10 w-full max-w-[440px]">
            {tab === "ecp" ? (
              <div className="text-center text-gray-500 text-sm py-8">
                <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-[#e7f4f4] flex items-center justify-center">
                  <Smartphone className="w-7 h-7 text-[#138d8a]" />
                </div>
                <p className="mb-6 leading-relaxed">
                  Для входа по электронной цифровой подписи подключите USB-токен или выберите сертификат на
                  компьютере.
                </p>
                <button
                  type="button"
                  className="w-full py-3.5 border-2 border-[#138d8a] text-[#138d8a] text-sm font-bold rounded-lg hover:bg-[#e7f4f4] transition"
                >
                  Выбрать сертификат
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="login" className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                    Логин
                  </label>
                  <input
                    id="login"
                    type="text"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    autoComplete="username"
                    className="w-full px-4 py-3.5 bg-[#eef4fa] border border-transparent rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#138d8a]/35 focus:border-[#138d8a]/30 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                    Пароль
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      className="w-full px-4 py-3.5 pr-12 bg-[#eef4fa] border border-transparent rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#138d8a]/35 focus:border-[#138d8a]/30 focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#138d8a]"
                      aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className="text-right mt-2">
                    <button type="button" className="text-xs text-[#138d8a] font-medium hover:underline">
                      Забыли пароль?
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !login || !password}
                  className="w-full py-3.5 bg-[#138d8a] hover:bg-[#107c79] active:bg-[#0f7270] disabled:opacity-50 text-white text-sm font-bold rounded-lg transition shadow-md shadow-[#138d8a]/25"
                >
                  {loading ? "Вход…" : "Войти"}
                </button>
                <button
                  type="button"
                  className="w-full py-3.5 bg-[#e7f4f4] hover:bg-[#d5eceb] text-[#138d8a] text-sm font-bold rounded-lg transition"
                >
                  Стать клиентом
                </button>
              </form>
            )}

            <div className="mt-10 pt-6 border-t border-gray-100 flex items-center justify-between text-xs text-[#138d8a] font-semibold">
              <button
                type="button"
                onClick={() => {
                  fillDemo(DEMO_ACCOUNTS[0]);
                  void doLogin("demo", "demo");
                }}
                className="hover:underline"
              >
                Демо-режим
              </button>
              <button type="button" className="hover:underline">
                Зарезервировать счёт
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.login}
                  type="button"
                  onClick={() => fillDemo(acc)}
                  className="text-[10px] px-2.5 py-1 rounded-full border border-gray-200 text-gray-500 hover:border-[#138d8a] hover:text-[#138d8a] hover:bg-[#f0faf9] transition bg-white"
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Средняя колонка — карточки с фото */}
        <section className="hidden xl:flex flex-col gap-5 py-10 px-5 bg-gradient-to-b from-[#eef2f6] to-[#e4eaef] min-h-[calc(100vh-4rem)]">
          <article className="bg-white rounded-2xl shadow-sm border border-white/80 overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
            <div className="relative h-36 w-full overflow-hidden">
              <Image
                src="/images/login/hero-office.jpg"
                alt="Современный офис"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="300px"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-4 flex items-center gap-2 text-white">
                <Newspaper className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Новости</span>
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <h3 className="text-sm font-bold text-[#2c3e50] mb-2 leading-snug">
                Обновление мобильного банка для бизнеса
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed flex-1">
                Новая аналитика, платежи в один клик и уведомления о движении средств — всё в приложении СберБизнес.
              </p>
              <a href="#" className="text-xs text-[#138d8a] font-semibold mt-4 hover:underline inline-block">
                Читать все новости →
              </a>
            </div>
          </article>

          <article className="bg-white rounded-2xl shadow-sm border border-white/80 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
            <div className="relative h-28 w-full">
              <Image
                src="/images/login/team-meeting.jpg"
                alt="Команда за работой"
                fill
                className="object-cover"
                sizes="300px"
              />
              <div className="absolute inset-0 bg-[#138d8a]/75 mix-blend-multiply" />
            </div>
            <div className="p-5 flex items-start gap-3 -mt-8 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-white shadow-md border border-gray-100 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 text-[#138d8a]" />
              </div>
              <div className="pt-1">
                <h3 className="text-sm font-bold text-[#2c3e50] mb-1 leading-snug">Режим работы подразделений</h3>
                <p className="text-xs text-gray-500">Пн–Пт: 9:00–18:00</p>
                <p className="text-xs text-gray-400 mt-1">Сб–Вс: выходной</p>
              </div>
            </div>
          </article>

          <article className="bg-white rounded-2xl shadow-sm border border-white/80 p-5 flex gap-4 hover:shadow-md transition-shadow">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0">
              <Image
                src="/images/login/finance-desk.jpg"
                alt="Финансовая аналитика"
                fill
                className="object-cover"
                sizes="80px"
              />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2c3e50] mb-1">Для предпринимателей</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Расчётный счёт, эквайринг и кредиты для ИП и юрлиц — онлайн за несколько минут.
              </p>
            </div>
          </article>
        </section>

        {/* Правая колонка — промо с фоновым фото, на всю оставшуюся ширину */}
        <section className="hidden md:flex relative min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden">
          <Image
            src="/images/login/mobile-pay.jpg"
            alt=""
            fill
            className="object-cover"
            sizes="50vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a5c5a]/92 via-[#138d8a]/88 to-[#083526]/95" />

          <div className="relative z-10 flex flex-col items-center px-8 py-12 w-full max-w-xl text-center">
            <p className="text-[#90d0cc] text-xs font-bold uppercase tracking-[0.2em] mb-3">СберБизнес</p>
            <h2 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight tracking-tight mb-3">
              Мобильный банк
              <br />
              <span className="text-[#b8ebe8]">для вашего бизнеса</span>
            </h2>
            <p className="text-white/75 text-sm max-w-sm mb-10 leading-relaxed">
              Управляйте счетами, платежами и аналитикой с телефона — быстро и безопасно.
            </p>

            <div className="relative w-[220px] h-[420px] bg-[#0f7270] rounded-[2.25rem] border-[4px] border-white/30 shadow-2xl shadow-black/30 overflow-hidden">
              <div className="bg-white h-full p-4 text-gray-800">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-[#138d8a]/15 flex items-center justify-center">
                    <span className="text-[8px] font-black text-[#138d8a]">С</span>
                  </div>
                  <div className="text-[9px] font-bold text-gray-500 truncate uppercase tracking-wide">
                    ИП ИВАНОВ ИВАН И…
                  </div>
                </div>
                <div className="text-2xl font-black text-[#138d8a] tabular-nums">12 000,00</div>
                <div className="text-[10px] text-gray-400 font-medium">BYN · доступно</div>
                <div className="grid grid-cols-4 gap-2 mt-5 text-center text-[8px] text-gray-500">
                  {["Карты", "Реквизиты", "Выписка", "Платежи"].map((l) => (
                    <div key={l}>
                      <div className="w-8 h-8 mx-auto bg-[#f4f6f9] rounded-lg mb-1 border border-gray-100 shadow-sm" />
                      <span className="leading-tight block">{l}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 text-[8px] font-bold text-gray-400 uppercase tracking-wider">
                  Последние операции
                </div>
                <div className="mt-2 space-y-2">
                  {[
                    { w: "w-3/4", amt: "- 450,00" },
                    { w: "w-2/3", amt: "+ 2 100,00" },
                    { w: "w-4/5", amt: "- 89,50" },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className={`h-5 ${row.w} bg-[#f4f6f9] rounded border border-gray-100`} />
                      <span className="text-[7px] text-gray-400 tabular-nums shrink-0">{row.amt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-10 w-full max-w-sm bg-white/95 backdrop-blur rounded-2xl p-4 flex items-center gap-4 shadow-xl">
              <div className="w-14 h-14 bg-white border-2 border-gray-100 shrink-0 grid grid-cols-5 gap-px p-1 rounded-lg">
                {Array.from({ length: 25 }).map((_, i) => (
                  <div key={i} className={`${i % 3 === 0 ? "bg-gray-900" : "bg-white"}`} />
                ))}
              </div>
              <p className="text-left text-xs leading-snug text-gray-600">
                Сканируйте QR-код и скачайте бесплатное приложение для Android и iOS
              </p>
            </div>
          </div>

          <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-white/5 blur-3xl pointer-events-none" />
          <div className="absolute -top-10 -left-10 w-60 h-60 rounded-full bg-[#90d0cc]/10 blur-2xl pointer-events-none" />
        </section>
      </main>
    </div>
  );
}
