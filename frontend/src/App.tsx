import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import type { TabType } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { DashboardView } from './views/DashboardView';
import { GeneratorView } from './views/GeneratorView';
import { ReviewQueueView } from './views/ReviewQueueView';
import { GuidelinesView } from './views/GuidelinesView';
import { SettingsView } from './views/SettingsView';
import { AuthView } from './views/AuthView';
import { OnboardingView } from './views/OnboardingView';
import type { OnboardingPayload } from './views/OnboardingView';
import { api } from './services/api';
import { supabase } from './services/supabase';

interface UserProfile {
  email: string;
  name: string;
  org: string;
}

export function App() {
  // 1. Initialize user from localStorage to prevent being kicked out on reload or rebuild
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('fixora_active_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // 2. Initialize pending onboarding from localStorage
  const [onboardingData, setOnboardingData] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('fixora_pending_onboarding');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Fast initial auth check: if no active profile or Supabase token exists in storage,
  // do not stall new users with a loading spinner.
  const [checkingAuth, setCheckingAuth] = useState(() => {
    try {
      const hasUser = !!localStorage.getItem('fixora_active_user');
      const hasPending = !!localStorage.getItem('fixora_pending_onboarding');
      const hasSupabaseToken = Object.keys(localStorage).some(
        (key) => key.startsWith('sb-') && key.endsWith('-auth-token')
      );
      return hasUser || hasPending || hasSupabaseToken;
    } catch {
      return false;
    }
  });
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') || window.location.pathname.includes('settings')) {
      return 'settings';
    }
    return 'dashboard';
  });
  const [pendingReviewsCount, setPendingReviewsCount] = useState<number>(0);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('fixora_theme') as 'dark' | 'light') || 'dark';
  });

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('fixora_theme', next);
      return next;
    });
  };

  // Sync Supabase Auth with persisted local session
  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted && session?.user) {
          const user = session.user;
          const fullName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split('@')[0] ||
            '';
          const orgName = user.user_metadata?.company || '';

          const profile: UserProfile = {
            email: user.email || '',
            name: fullName,
            org: orgName
          };

          // Save active profile to localStorage
          localStorage.setItem('fixora_active_user', JSON.stringify(profile));
          setCurrentUser(profile);
        }
      } catch (err) {
        console.error('Supabase session check error:', err);
      } finally {
        if (mounted) setCheckingAuth(false);
      }
    }

    checkSession();

    // Listen for auth state events
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const user = session.user;
        const fullName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          '';
        const orgName = user.user_metadata?.company || '';

        const profile: UserProfile = {
          email: user.email || '',
          name: fullName,
          org: orgName
        };

        localStorage.setItem('fixora_active_user', JSON.stringify(profile));
        setCurrentUser(profile);
      } else if (event === 'SIGNED_OUT') {
        // ONLY clear user if user explicitly signed out
        localStorage.removeItem('fixora_active_user');
        localStorage.removeItem('fixora_pending_onboarding');
        setCurrentUser(null);
        setOnboardingData(null);
      }
      setCheckingAuth(false);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Poll for pending review count if logged in
  useEffect(() => {
    if (!currentUser) return;
    const checkReviews = async () => {
      try {
        const posts = await api.getPosts('ACTION_REQUIRED');
        setPendingReviewsCount(posts.length);
      } catch {
        // Silent catch for initial load
      }
    };
    checkReviews();
    const interval = setInterval(checkReviews, 15000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Handle Authentication Flow
  const handleLogin = (userData: UserProfile) => {
    localStorage.setItem('fixora_active_user', JSON.stringify(userData));
    localStorage.removeItem('fixora_pending_onboarding');
    setCurrentUser(userData);
    setOnboardingData(null);
  };

  const handleStartSignup = (signupData: UserProfile) => {
    localStorage.setItem('fixora_pending_onboarding', JSON.stringify(signupData));
    localStorage.setItem('fixora_active_user', JSON.stringify(signupData));
    setOnboardingData(signupData);
  };

  const handleCompleteOnboarding = async (payload?: OnboardingPayload) => {
    const emailKey = onboardingData?.email || currentUser?.email || '';
    if (emailKey) {
      try {
        localStorage.setItem(`fixora_onboarded_${emailKey}`, 'true');
        localStorage.removeItem('fixora_pending_onboarding');
      } catch (e) {
        console.warn('LocalStorage error:', e);
      }
    }

    if (payload) {
      // Sync exact onboarding configurations with Settings
      localStorage.setItem('fixora_setting_industry', payload.industry);
      localStorage.setItem('fixora_setting_tones', JSON.stringify(payload.brandTones));
      localStorage.setItem('fixora_setting_channels', JSON.stringify(payload.channels));
      localStorage.setItem('fixora_setting_docs', JSON.stringify(payload.docNames));
      localStorage.setItem('fixora_setting_rules', payload.rulesText);
      localStorage.setItem('fixora_guideline_analysis_status', payload.analysisStatus);
      if (payload.analysisMessage) localStorage.setItem('fixora_guideline_analysis_message', payload.analysisMessage);

      const updatedProfile: UserProfile = {
        email: emailKey,
        name: onboardingData?.name || currentUser?.name || '',
        org: payload.companyName || onboardingData?.org || ''
      };

      localStorage.setItem('fixora_active_user', JSON.stringify(updatedProfile));
      setCurrentUser(updatedProfile);
      try {
        if (payload.rulesText.trim()) await api.uploadRawGuideline(`${payload.companyName} Brand Guidelines`, payload.rulesText.trim(), 'v1.0');
        const uploadResults = await Promise.allSettled((payload.uploadedFiles || []).map((file) => api.uploadGuidelineFile(file, file.name)));
        const failed = uploadResults.filter((result) => result.status === 'rejected');
        if (failed.length) throw new Error(`${failed.length} file upload(s) failed. Check the files and try completing setup again.`);
        localStorage.setItem('fixora_setting_docs', JSON.stringify(payload.docNames));
        setOnboardingData(null);
      } catch (err) {
        setOnboardingData({ ...updatedProfile, uploadError: err instanceof Error ? err.message : 'Guideline upload failed.' } as UserProfile);
        throw err;
      }
    } else if (onboardingData) {
      setCurrentUser(onboardingData);
      setOnboardingData(null);
    }
  };

  const handleUpdateUser = (updated: UserProfile) => {
    setCurrentUser(updated);
    localStorage.setItem('fixora_active_user', JSON.stringify(updated));
  };

  const handleDeleteAccount = async () => {
    // 1. Sign out from Supabase Auth to invalidate the session token
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase sign-out during delete:', e);
    }

    // 2. Wipe every key from localStorage and sessionStorage
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Storage clear error:', e);
    }

    // 3. Reset React state
    setCurrentUser(null);
    setOnboardingData(null);
    setActiveTab('dashboard');

    // 4. Hard-navigate to root so Supabase SDK re-initialises clean
    window.location.replace('/');
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Sign out error:', e);
    }
    localStorage.removeItem('fixora_active_user');
    localStorage.removeItem('fixora_pending_onboarding');
    setCurrentUser(null);
    setOnboardingData(null);
  };

  // While checking auth session
  if (checkingAuth && !currentUser) {
    return (
      <div className="min-h-screen w-screen bg-[#ffffff] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-[#009DFF] border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Connecting to FixoraAI...</p>
        </div>
      </div>
    );
  }

  // 1. If currently in onboarding wizard (or returning user who has not completed onboarding)
  if (onboardingData) {
    return (
      <OnboardingView
        initialData={onboardingData}
        onComplete={handleCompleteOnboarding}
      />
    );
  }

  // 2. If not signed in, show Sign In / Sign Up page with real Supabase Auth
  if (!currentUser) {
    return (
      <AuthView
        onLogin={handleLogin}
        onStartSignup={handleStartSignup}
      />
    );
  }

  // 3. Authenticated Application
  const isDark = theme === 'dark';
  return (
    <div
      className={isDark ? 'dark-site' : 'light-site'}
      style={{
        backgroundColor: isDark ? '#0B0F17' : '#F8FAFC',
        padding: 0,
        height: '100vh',
        width: '100vw',
        boxSizing: 'border-box',
        display: 'flex',
        gap: '10px',
        overflow: 'hidden'
      }}
    >
      {/* Sidebar: 295px horizontal width */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingReviewsCount={pendingReviewsCount}
        currentUser={currentUser}
        theme={theme}
      />

      {/* Right area: takes remaining space, 10px gap between topbar and content, 0 margin */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          height: '100%',
          minWidth: 0,
          margin: 0
        }}
      >
        {/* Topbar: takes 100% of remaining width */}
        <Topbar
          activeTab={activeTab}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onSignOut={handleSignOut}
        />

        {/* Dashboard Content area: takes remaining height & width */}
        <main
          style={{
            flex: 1,
            width: '100%',
            backgroundColor: isDark ? '#161F30' : '#FFFFFF',
            borderRadius: '8px',
            boxSizing: 'border-box',
            padding: '24px',
            border: `1px solid ${isDark ? 'rgba(248, 250, 252, 0.12)' : '#E2E8F0'}`,
            margin: 0,
            overflowY: 'auto'
          }}
        >
          {activeTab === 'dashboard' && (
            <DashboardView
              currentUser={currentUser}
              onNavigate={setActiveTab}
            />
          )}
          {activeTab === 'generator' && <GeneratorView />}
          {activeTab === 'review' && <ReviewQueueView />}
          {activeTab === 'guidelines' && <GuidelinesView />}
          {activeTab === 'settings' && (
            <SettingsView
              currentUser={currentUser}
              onUpdateUser={handleUpdateUser}
              onDeleteAccount={handleDeleteAccount}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
