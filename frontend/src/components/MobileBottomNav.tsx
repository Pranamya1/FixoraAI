import { 
  LayoutDashboard, 
  Sparkles, 
  ShieldCheck, 
  BookOpen, 
  Settings 
} from 'lucide-react';
import type { TabType } from './Sidebar';

interface MobileBottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  pendingReviewsCount?: number;
}

export function MobileBottomNav({
  activeTab,
  setActiveTab,
  pendingReviewsCount = 0
}: MobileBottomNavProps) {
  const navItems = [
    {
      id: 'dashboard' as TabType,
      label: 'Home',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'review' as TabType,
      label: 'Review',
      icon: ShieldCheck,
      badge: pendingReviewsCount > 0 ? (pendingReviewsCount > 9 ? '9+' : `${pendingReviewsCount}`) : null
    },
    {
      id: 'generator' as TabType,
      label: 'Generate',
      icon: Sparkles,
      badge: null
    },
    {
      id: 'guidelines' as TabType,
      label: 'Rules',
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
    <nav 
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 pt-1 pb-[max(6px,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-blue-600 font-bold scale-102'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 transition-transform ${isActive ? 'stroke-[2.25]' : 'stroke-[1.75]'}`} />
                {item.badge && (
                  <span className="absolute -top-1 -right-2 bg-amber-500 text-white text-[9px] font-black h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'text-blue-600 font-bold' : 'text-slate-500'}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-3 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
