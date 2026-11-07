import { LogOut, Menu } from 'lucide-react';
import type { TabType } from './Sidebar';

interface TopbarProps {
  activeTab?: TabType;
  onSignOut?: () => void;
  onToggleMobileMenu?: () => void;
}

export function Topbar({ activeTab = 'dashboard', onSignOut, onToggleMobileMenu }: TopbarProps) {
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
        backgroundColor: '#FFFFFF',
        height: '56px',
        width: '100%',
        borderRadius: '8px',
        boxSizing: 'border-box',
        padding: '0 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        border: '1px solid #CBD5E1',
        margin: 0,
        flexShrink: 0
      }}
    >
      <div className="flex items-center gap-2.5">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="lg:hidden h-9 w-9 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <div className="flex items-center gap-2">
          <img
            src="/fixoraailogo.jpeg"
            alt="FixoraAI Logo"
            className="lg:hidden h-7 w-7 rounded-md object-cover border border-slate-200"
          />
          <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            {tabTitles[activeTab] || 'Dashboard'}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-rose-600 border border-[#CBD5E1] text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        )}
      </div>
    </header>
  );
}
