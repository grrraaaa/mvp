"use client";

import { ReactNode, Suspense, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Menu } from "lucide-react";
import Navbar from "@/components/banking/Navbar";
import Sidebar, { getActiveTab, getSubHeaderTitle } from "@/components/banking/Sidebar";
import Footer from "@/components/banking/Footer";
import { BankingModals } from "@/components/banking/BankingModals";
import { AssistantDockPanel } from "@/components/assistant/AssistantDockPanel";
import { useBankingStore } from "@/store/bankingStore";
import { useAuthStore } from "@/store/authStore";
import { fetchNotifications } from "@/lib/api/banking";
import { useDocumentDeepLink } from "@/hooks/useDocumentDeepLink";
import { useAssistantDockStore } from "@/store/assistantDockStore";
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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [unreadEmails, setUnreadEmails] = useState(1);
  const [phoneAlertModal, setPhoneAlertModal] = useState(false);
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const activeTab = getActiveTab(pathname);
  const subHeaderTitle = getSubHeaderTitle(activeTab);
  const dockCollapsed = useAssistantDockStore((s) => s.collapsed);
  const dockRightPad = dockCollapsed
    ? ""
    : "lg:pr-[420px] xl:pr-[460px] 2xl:pr-[500px]";

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

        <div className={`flex-1 md:pl-[130px] flex flex-col min-w-0 w-full transition-[padding] duration-200 ${dockRightPad}`}>
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

          <div className="bg-[#138d8a] h-14 w-full flex items-center px-6 text-white justify-between select-none">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (activeTab !== "money") router.push("/");
                }}
                className="p-1 hover:bg-[#1a9391]/80 rounded transition-colors"
                title="Вернуться назад"
                disabled={activeTab === "money"}
              >
                <ArrowLeft className={`w-5 h-5 ${activeTab === "money" ? "opacity-40" : "opacity-100"}`} />
              </button>
              <span className="font-extrabold text-sm uppercase tracking-wider font-sans">{subHeaderTitle}</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[10.5px] font-semibold text-teal-100 uppercase tracking-wide">
              <span>Система: СФЕРУМ 2.15</span>
              <span>•</span>
              <span className="bg-white/15 px-2.5 py-0.5 rounded text-white font-black text-[10px]">
                Безопасный клиринг БН
              </span>
            </div>
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

        <AssistantDockPanel />
      </div>

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
