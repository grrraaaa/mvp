"use client";

import { ReactNode, Suspense, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, MessageSquare } from "lucide-react";
import Navbar from "@/components/banking/Navbar";
import Sidebar, { getActiveTab, getSubHeaderTitle } from "@/components/banking/Sidebar";
import Footer from "@/components/banking/Footer";
import { BankingModals } from "@/components/banking/BankingModals";
import { useBankingStore } from "@/store/bankingStore";
import { useAuthStore } from "@/store/authStore";
import { fetchNotifications } from "@/lib/api/banking";
import { useDocumentDeepLink } from "@/hooks/useDocumentDeepLink";
import { useSbbolUi } from "@/components/layout/SbbolUiContext";

function DocumentDeepLinkHandler() {
  useDocumentDeepLink();
  return null;
}

interface Props {
  children: ReactNode;
}

export function BankingShell({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const loadAll = useBankingStore((s) => s.loadAll);
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const resetBanking = useBankingStore((s) => s.reset);
  const { chatOpen } = useSbbolUi();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [unreadEmails, setUnreadEmails] = useState(1);
  const [phoneAlertModal, setPhoneAlertModal] = useState(false);
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const activeTab = getActiveTab(pathname);
  const subHeaderTitle = getSubHeaderTitle(activeTab);

  useEffect(() => {
    if (!user) return;
    resetBanking();
    void loadAll();
    void fetchNotifications(true)
      .then((items) => setNotificationCount(items.length))
      .catch(() => setNotificationCount(0));
  }, [user?.org_id, loadAll, resetBanking, user]);

  const handleLogout = () => {
    clearAuth();
    resetBanking();
    router.replace("/login");
  };

  return (
    <div className="banking-app min-h-screen w-full bg-[#f4f6f9] text-[#2c3e50] flex flex-col font-sans relative">
      <Suspense fallback={null}>
        <DocumentDeepLinkHandler />
      </Suspense>
      <Navbar
        notificationsCount={notificationCount}
        messagesCount={unreadEmails}
        companyName={user?.org_name ?? "DEMO ЮРИДИЧЕСКОЕ ЛИЦО"}
        onLogout={handleLogout}
        onOpenPhoneSupport={() => setPhoneAlertModal(true)}
        onOpenNotifications={() => {
          setNotificationModalOpen(true);
          setNotificationCount(0);
        }}
        onOpenMessages={() => {
          setEmailModalOpen(true);
          setUnreadEmails(0);
        }}
      />

      <div className="flex-1 flex flex-col md:flex-row relative">
        <Sidebar mobileOpen={mobileSidebarOpen} setMobileOpen={setMobileSidebarOpen} />

        <div
          className={`flex-1 md:pl-[130px] ${chatOpen ? "md:pr-[410px]" : ""} flex flex-col min-w-0 transition-all duration-200`}
        >
          <div className="md:hidden bg-white border-b border-gray-150 px-4 py-2.5 flex items-center justify-between z-10">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-1.5 justify-center hover:bg-slate-100 rounded text-gray-550 flex items-center gap-2 text-xs font-bold font-sans focus:outline-none"
            >
              <Menu className="w-5 h-5 text-sber-green" />
              <span>СБЕР МЕНЮ</span>
            </button>
            <span className="text-xs font-black text-gray-800 uppercase tracking-widest">{subHeaderTitle}</span>
          </div>

          <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto select-none outline-none">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>

          <Footer />
        </div>
      </div>

      {!chatOpen && (
        <div className="fixed bottom-6 right-6 z-40 select-none hidden md:block">
          <button
            onClick={() => {
              alert(
                "Служба поддержки Сбер Бизнес Онлайн: оператор-консультант готов ответить на ваши вопросы по телефону +375 17 359-99-11.",
              );
            }}
            className="w-12 h-12 rounded-full bg-sber-green hover:bg-sber-green-hover text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 group relative focus:outline-none"
          >
            <MessageSquare className="w-5.5 h-5.5" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-505" />
            </span>
            <span className="absolute right-14 bg-gray-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-350 pointer-events-none">
              Чат-поддержка Сбера онлайн
            </span>
          </button>
        </div>
      )}

      <BankingModals
        phoneOpen={phoneAlertModal}
        notificationsOpen={notificationModalOpen}
        emailOpen={emailModalOpen}
        onClosePhone={() => setPhoneAlertModal(false)}
        onCloseNotifications={() => setNotificationModalOpen(false)}
        onCloseEmail={() => setEmailModalOpen(false)}
      />
    </div>
  );
}
