import React from 'react';
import { 
  ArrowLeftRight, 
  CreditCard, 
  FileText, 
  CalendarDays, 
  Briefcase, 
  Handshake, 
  MoreHorizontal,
  Settings,
  X
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onChangeTab: (tabId: string) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  unreadCount?: number;
}

export default function Sidebar({ 
  activeTab, 
  onChangeTab, 
  mobileOpen, 
  setMobileOpen,
  unreadCount = 1 
}: SidebarProps) {

  const menuItems = [
    {
      id: 'money',
      name: 'Деньги и события',
      icon: ArrowLeftRight,
    },
    {
      id: 'payments',
      name: 'Расчеты',
      icon: CreditCard,
    },
    {
      id: 'statement',
      name: 'Выписка',
      icon: FileText,
    },
    {
      id: 'payroll',
      name: 'Зарплата',
      icon: CalendarDays,
      hasBadge: true,
      badgeText: '1',
    },
    {
      id: 'products',
      name: 'Продукты и услуги',
      icon: Briefcase,
    },
    {
      id: 'services',
      name: 'Сервисы',
      icon: Handshake,
    },
    {
      id: 'other',
      name: 'Прочее',
      icon: MoreHorizontal,
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 w-full shrink-0 relative">
      {/* Sber Vertical Nav container */}
      <div className="flex-1 overflow-y-auto py-2">
        <nav className="space-y-[2px]" id="sidebar-nav-container">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  onChangeTab(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full group flex flex-col items-center justify-center py-4 px-2 border-l-[4px] font-sans transition-all relative ${
                  isActive 
                    ? 'bg-emerald-50/40 border-sber-green text-sber-green' 
                    : 'bg-white hover:bg-gray-50 border-transparent text-gray-500 hover:text-sber-green'
                }`}
              >
                {/* Visual badge helper (e.g. '1' calendar event number for Salary as seen on screen) */}
                {item.hasBadge && (
                  <span className="absolute top-3.5 right-6 bg-sber-green text-white font-bold rounded-full w-4 tight h-4 text-[9px] flex items-center justify-center border-2 border-white select-none">
                    {item.badgeText}
                  </span>
                )}

                <div className={`transition-transform duration-200 ${isActive ? 'scale-105 text-sber-green' : 'text-gray-400 group-hover:text-sber-green'}`}>
                  <Icon className="w-6 h-6 stroke-[1.8]" />
                </div>
                
                <span className={`text-[11px] mt-2 text-center font-medium leading-tight max-w-[76px] transition-colors ${
                  isActive ? 'text-gray-900 font-semibold' : 'text-gray-500 group-hover:text-sber-green'
                }`}>
                  {item.name}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Settings Gear control at bottom of sidebar hierarchy */}
      <div className="p-3 border-t border-gray-100 flex justify-center">
        <button 
          onClick={() => {
            onChangeTab('settings');
            setMobileOpen(false);
          }}
          className={`p-3 rounded-full transition-colors flex items-center justify-center hover:bg-slate-100 ${
            activeTab === 'settings' ? 'text-sber-green bg-emerald-50/40' : 'text-gray-400 hover:text-sber-green'
          }`}
          title="Параметры и настройки"
        >
          <Settings className="w-6 h-6 stroke-[1.8]" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-[130px] md:flex-col md:fixed md:inset-y-0 md:top-16 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar frame */}
      <div className={`fixed inset-y-0 left-0 z-50 w-[130px] transform bg-white transition-transform duration-300 ease-in-out md:hidden flex flex-col ${
        mobileOpen ? 'translate-x-0 font-sans' : '-translate-x-full'
      }`}>
        {/* Mobile close control */}
        <div className="p-2 border-b border-gray-200 flex justify-end">
          <button onClick={() => setMobileOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="flex-1">
          {sidebarContent}
        </div>
      </div>
    </>
  );
}
