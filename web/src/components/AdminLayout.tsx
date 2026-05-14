import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ArrowLeftRight,
  Landmark,
  Bot,
  BadgePercent,
  Settings,
  Menu,
  X,
  ChevronRight,
  Shield,
  LogOut,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  user: any;
  onLogout: () => void;
}

const SidebarItem = ({ icon: Icon, label, active, href }: any) => (
  <Link
    to={href}
    className={cn(
      'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group',
      active
        ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
    )}
  >
    <Icon size={20} className={cn(active ? 'text-yellow-400' : 'group-hover:scale-110 transition-transform')} />
    <span className="font-medium">{label}</span>
    {active && <ChevronRight size={16} className="ml-auto opacity-50" />}
  </Link>
);

export default function AdminLayout({ children, activeTab, user, onLogout }: AdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth >= 1024);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    { id: 'payment-methods', label: 'Payment Methods', icon: Landmark },
    { id: 'trades', label: 'AI Trades', icon: Bot },
    { id: 'trader-settings', label: 'Trader Settings', icon: BadgePercent },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 overflow-x-hidden">
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen transition-all duration-300 border-r border-zinc-800/50 bg-[#0F0F11]',
          isSidebarOpen ? 'w-72' : 'w-20',
          'lg:translate-x-0',
          isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full p-4">
          <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
                <Shield className="text-black" size={24} />
              </div>
              {(isSidebarOpen || isMobileMenuOpen) && (
                <div>
                  <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                    MarketClaw
                  </span>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-yellow-400 font-bold">Admin</p>
                </div>
              )}
            </div>
            {isMobileMenuOpen && (
              <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden p-2 text-zinc-500 hover:text-white">
                <X size={20} />
              </button>
            )}
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto">
            {menuItems.map((item) => (
              <SidebarItem
                key={item.id}
                {...item}
                href={`/admin/${item.id}`}
                active={activeTab === item.id}
              />
            ))}
          </nav>

          <div className="pt-4 border-t border-zinc-800/50 space-y-3">
            <div className={cn('flex items-center gap-3 px-2', (!isSidebarOpen && !isMobileMenuOpen) && 'justify-center')}>
              <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                <Shield size={18} className="text-yellow-400" />
              </div>
              {(isSidebarOpen || isMobileMenuOpen) && (
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{user?.displayName || 'Administrator'}</p>
                  <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                </div>
              )}
            </div>
            {(isSidebarOpen || isMobileMenuOpen) && (
              <button
                type="button"
                onClick={onLogout}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm font-bold text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
              >
                <LogOut size={16} />
                Logout
              </button>
            )}
          </div>
        </div>
      </aside>

      <main className={cn('transition-all duration-300 min-h-screen', isSidebarOpen ? 'lg:pl-72' : 'lg:pl-20', 'pl-0')}>
        <header className="h-16 border-b border-zinc-800/50 bg-[#0F0F11]/80 backdrop-blur-xl sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setIsMobileMenuOpen(true);
                } else {
                  setIsSidebarOpen(!isSidebarOpen);
                }
              }}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
            >
              <Menu size={20} />
            </button>
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500 font-bold">Admin System</p>
              <h1 className="text-sm md:text-lg font-bold text-white">Operations Console</h1>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
