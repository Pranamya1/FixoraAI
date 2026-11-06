import { 
  LayoutDashboard, 
  Sparkles, 
  ShieldCheck, 
  BookOpen, 
  Settings
} from 'lucide-react';

export type TabType = 'dashboard' | 'generator' | 'review' | 'guidelines' | 'settings';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  pendingReviewsCount: number;
  currentUser?: { email: string; name: string; org: string } | null;
  theme?: 'dark' | 'light';
}

export function Sidebar({ activeTab, setActiveTab, pendingReviewsCount, currentUser, theme = 'dark' }: SidebarProps) {
  const isDark = theme === 'dark';
  const panelBg = isDark ? '#161F30' : '#FFFFFF';
  const panelBorder = isDark ? 'rgba(248, 250, 252, 0.12)' : '#E2E8F0';
  const primaryColor = isDark ? '#6366F1' : '#2563EB';

  const getInitials = (nameStr: string) => {
    if (!nameStr) return 'FX';
    const parts = nameStr.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return nameStr.slice(0, 2).toUpperCase();
  };

  const menuItems = [
    {
      id: 'dashboard' as TabType,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'review' as TabType,
      label: 'Post Review',
      icon: ShieldCheck,
      badge: pendingReviewsCount > 0 ? `${pendingReviewsCount}` : null,
      badgeColor: 'bg-amber-100 text-amber-800 border border-amber-300'
    },
    {
      id: 'generator' as TabType,
      label: 'Generate Post',
      icon: Sparkles,
      badge: 'AI Gen'
    },
    {
      id: 'guidelines' as TabType,
      label: 'Brand Guidelines',
      icon: BookOpen,
      badge: null
    },
    {
      id: 'settings' as TabType,
      label: 'Settings',
      icon: Settings,
      badge: null
    }
  ];

  return (
    <aside
      style={{
        width: '295px',
        minWidth: '295px',
        backgroundColor: panelBg,
        height: '100%',
        borderRadius: '8px',
        boxSizing: 'border-box',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        border: `1px solid ${panelBorder}`,
        margin: 0,
        flexShrink: 0
      }}
    >
      <div>
        {/* Brand Header with Logo */}
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-[#CBD5E1]">
          <img
            src="/fixoraailogo.jpeg"
            alt="FixoraAI Logo"
            className="h-10 w-10 rounded-lg object-cover shadow-sm border border-slate-300/80"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900 text-lg tracking-tight">Fixora</span>
              <span 
                style={{ 
                  backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(37, 99, 235, 0.1)',
                  color: primaryColor,
                  borderColor: isDark ? 'rgba(99, 102, 241, 0.4)' : 'rgba(37, 99, 235, 0.25)'
                }}
                className="text-[11px] px-1.5 py-0.2 rounded font-bold border"
              >
                AI
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  height: '50px',
                  minHeight: '50px',
                  backgroundColor: isActive ? primaryColor : 'transparent',
                  color: isActive ? '#ffffff' : (isDark ? '#94A3B8' : '#334155')
                }}
                className={`w-full flex items-center justify-between px-3.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'shadow-xs'
                    : 'hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.badgeColor || (isActive ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700')
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom User Account Button */}
      <div 
        style={{ borderColor: panelBorder }}
        className="pt-3 border-t"
      >
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          style={{
            height: '50px',
            minHeight: '50px',
            backgroundColor: activeTab === 'settings' 
              ? (isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(37, 99, 235, 0.08)')
              : (isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC'),
            borderColor: activeTab === 'settings' ? primaryColor : panelBorder
          }}
          className={`w-full flex items-center justify-between px-3 rounded-lg border text-left transition-all cursor-pointer shadow-2xs ${
            activeTab === 'settings' ? 'ring-1' : ''
          }`}
          title="Account & Workspace Settings"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div 
              style={{ backgroundColor: primaryColor, color: '#ffffff' }}
              className="h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs shadow-xs shrink-0"
            >
              {getInitials(currentUser?.name || currentUser?.email || 'User')}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 truncate">
                {currentUser?.name || 'Workspace Account'}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {currentUser?.email || 'Account Settings'}
              </p>
            </div>
          </div>
          <Settings 
            style={{ color: activeTab === 'settings' ? primaryColor : undefined }}
            className={`h-4 w-4 shrink-0 transition-colors ${activeTab === 'settings' ? '' : 'text-slate-400'}`} 
          />
        </button>
      </div>
    </aside>
  );
}
