import { 
  LayoutDashboard, 
  Sparkles, 
  ShieldCheck, 
  BookOpen, 
  Settings,
  X
} from 'lucide-react';

export type TabType = 'dashboard' | 'generator' | 'review' | 'guidelines' | 'settings';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  pendingReviewsCount: number;
  currentUser?: { email: string; name: string; org: string } | null;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ 
  activeTab, 
  setActiveTab, 
  pendingReviewsCount, 
  currentUser,
  mobileOpen = false,
  onCloseMobile
}: SidebarProps) {
  const panelBg = '#FFFFFF';
  const panelBorder = '#CBD5E1';
  const primaryColor = '#2563EB';

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

  const handleNavClick = (id: TabType) => {
    setActiveTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (isDrawer: boolean = false) => (
    <>
      <div>
        {/* Brand Header with Logo */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#CBD5E1]">
          <div className="flex items-center gap-3">
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
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    color: primaryColor,
                    borderColor: 'rgba(37, 99, 235, 0.25)'
                  }}
                  className="text-[11px] px-1.5 py-0.2 rounded font-bold border"
                >
                  AI
                </span>
              </div>
            </div>
          </div>

          {isDrawer && onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                style={{
                  height: '48px',
                  minHeight: '48px',
                  backgroundColor: isActive ? primaryColor : 'transparent',
                  color: isActive ? '#ffffff' : '#334155'
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
          onClick={() => handleNavClick('settings')}
          style={{
            height: '48px',
            minHeight: '48px',
            backgroundColor: activeTab === 'settings' 
              ? 'rgba(37, 99, 235, 0.08)'
              : '#F8FAFC',
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
    </>
  );

  return (
    <>
      {/* 1. Desktop Persistent Sidebar */}
      <aside
        style={{
          width: '280px',
          minWidth: '280px',
          backgroundColor: panelBg,
          height: '100%',
          borderRadius: '8px',
          boxSizing: 'border-box',
          padding: '16px',
          justifyContent: 'space-between',
          border: `1px solid ${panelBorder}`,
          margin: 0,
          flexShrink: 0
        }}
        className="hidden lg:flex flex-col"
      >
        {sidebarContent(false)}
      </aside>

      {/* 2. Mobile & Tablet Slide-over Drawer with Backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div 
            style={{
              backgroundColor: panelBg,
              borderRight: `1px solid ${panelBorder}`
            }}
            className="relative z-50 w-72 max-w-[85vw] h-full p-4 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200"
          >
            {sidebarContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
