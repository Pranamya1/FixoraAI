import { LogOut, Sun, Moon } from 'lucide-react';
import type { TabType } from './Sidebar';

interface TopbarProps {
  activeTab?: TabType;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onSignOut?: () => void;
}

export function Topbar({ activeTab = 'dashboard', theme = 'dark', onToggleTheme, onSignOut }: TopbarProps) {
  const isDark = theme === 'dark';
  const panelBg = isDark ? '#161F30' : '#FFFFFF';
  const panelBorder = isDark ? 'rgba(248, 250, 252, 0.12)' : '#E2E8F0';

  const tabTitles: Record<TabType, string> = {
    dashboard: 'Dashboard',
    review: 'Post Review',
    generator: 'Generate Post',
    guidelines: 'Brand Guidelines',
    settings: 'Settings'
  };

  return (
    <header
      style={{
        backgroundColor: panelBg,
        height: '60px',
        width: '100%',
        borderRadius: '8px',
        boxSizing: 'border-box',
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        border: `1px solid ${panelBorder}`,
        margin: 0,
        flexShrink: 0
      }}
    >
      <h1 className="text-base font-bold text-slate-900">
        {tabTitles[activeTab] || 'Dashboard'}
      </h1>

      <div className="flex items-center gap-2">
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
              isDark 
                ? 'bg-slate-800/80 hover:bg-slate-700 text-amber-300 border-slate-700' 
                : 'bg-slate-100 hover:bg-slate-200 text-indigo-700 border-slate-300'
            }`}
            title={`Switch to ${isDark ? 'Bright Mode' : 'Dark Mode'}`}
          >
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            <span>{isDark ? 'Bright Mode' : 'Dark Mode'}</span>
          </button>
        )}

        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 hover:bg-white text-slate-700 hover:text-rose-600 border border-[#CBD5E1] text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </header>
  );
}
