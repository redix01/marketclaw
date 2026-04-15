import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  TrendingUp, 
  ClipboardList, 
  History, 
  Bot, 
  ScrollText, 
  Wallet, 
  Settings,
  Search,
  Bell,
  User,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  basePath: string;
  user: any;
  account: any;
  isGuest?: boolean;
  onExitGuest?: () => void;
}

const SidebarItem = ({ icon: Icon, label, id, active, href }: any) => (
  <Link
    to={href}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
      active 
        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
        : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
    )}
  >
    <Icon size={20} className={cn(active ? "text-emerald-400" : "group-hover:scale-110 transition-transform")} />
    <span className="font-medium">{label}</span>
    {active && <ChevronRight size={16} className="ml-auto opacity-50" />}
  </Link>
);

export default function Layout({ children, activeTab, basePath, user, account, isGuest, onExitGuest }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when tab changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);

  // Handle window resize to auto-close/open sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
    { id: 'trade', label: 'Trade', icon: TrendingUp },
    { id: 'orders', label: 'Orders', icon: ClipboardList },
    { id: 'history', label: 'History', icon: History },
    { id: 'agents', label: 'Agents', icon: Bot },
    { id: 'logs', label: 'Agent Logs', icon: ScrollText },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 font-sans selection:bg-emerald-500/30 overflow-x-hidden">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed top-0 left-0 z-50 h-screen transition-all duration-300 border-r border-zinc-800/50 bg-[#0F0F11]",
          isSidebarOpen ? "w-64" : "w-20",
          "lg:translate-x-0",
          isMobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full p-4">
          <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Bot className="text-black" size={24} />
              </div>
              {(isSidebarOpen || isMobileMenuOpen) && (
                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                  OpenClaw
                </span>
              )}
            </div>
            {isMobileMenuOpen && (
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="lg:hidden p-2 text-zinc-500 hover:text-white"
              >
                <X size={20} />
              </button>
            )}
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
            {menuItems.map((item) => (
              <SidebarItem
                key={item.id}
                {...item}
                href={`${basePath}/${item.id}`}
                active={activeTab === item.id}
              />
            ))}
          </nav>

          <div className="mt-auto pt-4 border-t border-zinc-800/50">
            <div className={cn("flex items-center gap-3 px-2", (!isSidebarOpen && !isMobileMenuOpen) && "justify-center")}>
              <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={20} className="text-zinc-400" />
                )}
              </div>
              {(isSidebarOpen || isMobileMenuOpen) && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.displayName || 'Trader'}</p>
                  <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "transition-all duration-300 min-h-screen",
        isSidebarOpen ? "lg:pl-64" : "lg:pl-20",
        "pl-0"
      )}>
        {isGuest && (
          <div className="bg-emerald-500 text-black px-4 md:px-6 py-2 flex flex-col md:flex-row items-center justify-between text-[10px] md:text-xs font-bold gap-2 sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <Bot size={14} className="shrink-0" />
              <span className="text-center md:text-left">DEMO MODE: You are viewing the dashboard as a guest. Data is simulated and not saved.</span>
            </div>
            <button 
              onClick={onExitGuest}
              className="px-3 py-1 bg-black text-white rounded-lg hover:bg-zinc-800 transition-colors whitespace-nowrap"
            >
              Exit Demo & Sign In
            </button>
          </div>
        )}
        {/* Top Bar */}
        <header className={cn(
          "h-16 border-b border-zinc-800/50 bg-[#0F0F11]/80 backdrop-blur-xl sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between",
          isGuest && "top-auto"
        )}>
          <div className="flex items-center gap-4 flex-1">
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
            <div className="relative max-w-md w-full hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="text" 
                placeholder="Search symbols, agents, or orders..." 
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <div className="hidden sm:flex items-center gap-4 md:gap-6 border-r border-zinc-800 pr-4 md:pr-6 mr-1 md:mr-2">
              <div className="text-right">
                <p className="text-[8px] md:text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Cash Balance</p>
                <p className="text-xs md:text-sm font-mono text-emerald-400">${account?.cashBalance?.toLocaleString() || '0.00'}</p>
              </div>
              <div className="text-right hidden lg:block">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Account Mode</p>
                <span className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded-full border border-zinc-700 font-bold">PAPER TRADING</span>
              </div>
            </div>
            
            <button className="relative p-2 text-zinc-400 hover:text-zinc-200 transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-[#0F0F11]"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
