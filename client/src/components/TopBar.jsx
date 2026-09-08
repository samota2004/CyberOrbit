import React from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  Sun, 
  Moon, 
  Menu
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const TopBar = ({
  currentUser,
  currentPageTitle = 'Admin Dashboard',
  onOpenCopilot,
  onRefreshData,
  isRefreshing,
  onLogout,
  onToggleMobileNav
}) => {
  const { isDark, toggleTheme } = useTheme();

  const adminName = currentUser?.name || 'Alex Rivera';
  const adminRole = currentUser?.role === 'SECURITY_ADMIN' 
    ? 'SOC Lead' 
    : currentUser?.role === 'SYSTEM_ADMIN' 
      ? 'System Admin' 
      : 'Security Analyst';

  return (
    <header 
      id="cyberorbit-topbar" 
      className={`h-16 border-b px-4 md:px-6 flex items-center justify-between z-20 backdrop-blur-md shrink-0 transition-colors duration-200 ${
        isDark 
          ? 'bg-[#0E0E0E]/95 border-[#2A2A2A] text-white' 
          : 'bg-[#FFFFFF]/95 border-[#E5E5E5] text-[#0E0E0E]'
      }`}
    >
      {/* Left: Mobile Toggle, Clean Page Title, Data Refresh */}
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          id="btn-topbar-mobile-menu"
          onClick={onToggleMobileNav}
          title="Open Navigation"
          className={`md:hidden p-2 rounded-sm border cursor-pointer transition-colors ${
            isDark 
              ? 'border-[#2A2A2A] text-gray-300 hover:text-white hover:border-[#C6A14A]' 
              : 'border-[#E5E5E5] text-gray-700 hover:text-black hover:border-[#C6A14A]'
          }`}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Current Page Title */}
        {currentPageTitle && (
          <div className="min-w-0">
            <h1 className="font-serif-display text-lg md:text-xl font-light tracking-tight truncate">
              {currentPageTitle}
            </h1>
          </div>
        )}

        {/* Data Refresh */}
        <button
          id="btn-topbar-refresh"
          onClick={onRefreshData}
          disabled={isRefreshing}
          title="Re-sync Telemetry"
          className={`p-2 border rounded-sm transition-colors cursor-pointer ${
            isDark
              ? 'bg-[#141414] border-[#2A2A2A] hover:border-[#C6A14A] text-gray-400 hover:text-[#C6A14A]'
              : 'bg-[#FFFFFF] border-[#E5E5E5] hover:border-[#C6A14A] text-gray-600 hover:text-[#C6A14A]'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#C6A14A]' : ''}`} />
        </button>
      </div>

      {/* Right: AI Copilot, Theme Toggle, User Profile */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* AI Copilot Button */}
        {onOpenCopilot && (
          <button
            id="btn-topbar-copilot"
            onClick={onOpenCopilot}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-[#C6A14A] rounded-sm text-xs font-mono tracking-wider bg-[#C6A14A]/10 text-[#C6A14A] hover:bg-[#C6A14A] hover:text-black transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI COPILOT</span>
          </button>
        )}

        {/* Theme Switcher */}
        <button
          id="btn-topbar-theme-toggle"
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className={`p-2 border rounded-sm transition-colors cursor-pointer ${
            isDark 
              ? 'border-[#2A2A2A] text-[#C6A14A] hover:bg-white/5' 
              : 'border-[#E5E5E5] text-[#A98532] hover:bg-black/5'
          }`}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-gray-800" />}
        </button>

        {/* User Profile */}
        <div 
          id="topbar-admin-profile"
          className={`flex items-center gap-2 px-2.5 py-1.5 border rounded-sm ${
            isDark ? 'bg-[#141414] border-[#2A2A2A]' : 'bg-[#FFFFFF] border-[#E5E5E5]'
          }`}
        >
          <div className="w-6 h-6 rounded-xs border border-[#C6A14A] bg-[#C6A14A]/15 text-[#C6A14A] flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
            {adminName.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold leading-tight truncate max-w-[120px]">{adminName}</div>
            <div className="text-[9px] font-mono text-[#C6A14A] tracking-wider uppercase">{adminRole}</div>
          </div>
        </div>
      </div>
    </header>
  );
};
