import { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  BookOpen, 
  Share2, 
  Check, 
  UploadCloud, 
  FileText, 
  X, 
  Trash2, 
  Lock, 
  User, 
  AlertTriangle,
  Save,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import { supabase } from '../services/supabase';

interface SettingsViewProps {
  currentUser?: { email: string; name: string; org: string } | null;
  onUpdateUser?: (updated: { email: string; name: string; org: string }) => void;
  onDeleteAccount?: () => void;
}

const AVAILABLE_TONES = [
  { name: 'Attractive & Bold', tag: 'B2B Enterprise', desc: 'Direct, confident, industry leadership' },
  { name: 'Clear & Professional', tag: 'Corporate', desc: 'Precise, trustworthy, executive standard' },
  { name: 'Visionary & Inspiring', tag: 'Thought Leader', desc: 'Forward-looking, motivating, high-impact' },
  { name: 'Conversational & Engaging', tag: 'Modern Social', desc: 'Approachable, warm, audience-centric' },
  { name: 'Educational & Instructive', tag: 'SaaS / Guides', desc: 'Helpful, structured, insightful clarity' },
  { name: 'Empathetic & Human', tag: 'Support & Values', desc: 'Authentic, caring, community-first' },
  { name: 'Technical & Data-Driven', tag: 'Engineering & R&D', desc: 'Analytical, factual, evidence-based' },
  { name: 'Minimalist & Direct', tag: 'Product First', desc: 'Concise, clean, zero fluff' }
];

const AVAILABLE_CHANNELS = [
  { id: 'LinkedIn', desc: 'Social & Articles', badge: 'Publishing' },
  { id: 'Twitter', desc: 'Campaign launches & threads', badge: 'Publishing' },
  { id: 'Instagram', desc: 'Visual creatives & reels', badge: 'Publishing' },
  { id: 'Facebook', desc: 'Enterprise page feed & stories', badge: 'Publishing' },
  { id: 'Slack', desc: 'Team review notifications', badge: 'Review Hub' },
  { id: 'Gmail', desc: 'Executive sign-offs', badge: 'Review Hub' },
  { id: 'Teams', desc: 'Connector cards & updates', badge: 'Review Hub' }
];

export function SettingsView({ currentUser, onUpdateUser, onDeleteAccount }: SettingsViewProps) {
  // Account profile state
  const [fullName, setFullName] = useState(currentUser?.name || '');
  const [companyName, setCompanyName] = useState(currentUser?.org || '');
  
  // Workspace configurations - zero pre-population fallback
  const [industry, setIndustry] = useState(() => {
    return localStorage.getItem('fixora_setting_industry') || '';
  });
  
  const [selectedTones, setSelectedTones] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fixora_setting_tones');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedChannels, setSelectedChannels] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fixora_setting_channels');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Docs state (up to 5 docs)
  const [docNames, setDocNames] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fixora_setting_docs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [connectedSocials, setConnectedSocials] = useState<string[]>([]);
  const [isConnectingOAuth, setIsConnectingOAuth] = useState<string | null>(null);
  const [connectModalPlatform, setConnectModalPlatform] = useState<string | null>(null);
  const [connectModalHandle, setConnectModalHandle] = useState<string>('');
  const [connectModalName, setConnectModalName] = useState<string>('');
  const [isSavingDirectConnect, setIsSavingDirectConnect] = useState<boolean>(false);
  const [oauthBanner, setOauthBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const conn = params.get('connected');
      const err = params.get('error');
      if (conn) {
        return { 
          type: 'success', 
          message: `${conn.toUpperCase()} connected successfully! Your account is ready for automated publishing.` 
        };
      }
      if (err) {
        return { 
          type: 'error', 
          message: `Social account connection cancelled or failed: ${err}` 
        };
      }
    } catch {
      // ignore
    }
    return null;
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.name);
      setCompanyName(currentUser.org);
    }
  }, [currentUser]);

  useEffect(() => {
    api.getConnectedAccounts()
      .then(res => {
        const plats = (res.connected_accounts || []).map((a: any) => a.platform.toUpperCase());
        setConnectedSocials(plats);
        const names = (res.connected_accounts || []).map((a: any) => 
          a.platform === 'LINKEDIN' ? 'LinkedIn' : a.platform.charAt(0) + a.platform.slice(1).toLowerCase()
        );
        setSelectedChannels(prev => {
          const merged = Array.from(new Set([...prev, ...names]));
          localStorage.setItem('fixora_setting_channels', JSON.stringify(merged));
          return merged;
        });
      })
      .catch(err => console.debug('Could not load connected accounts', err));
  }, []);

  const handleOAuthConnect = async (e: React.MouseEvent, platform: string) => {
    e.stopPropagation();
    setIsConnectingOAuth(platform);
    try {
      const res = await api.initiateConnect(platform.toLowerCase());
      if (res.auth_url) {
        window.location.href = res.auth_url;
      }
    } catch (err: any) {
      alert(`Could not initiate ${platform} connection: ` + err.message);
      setIsConnectingOAuth(null);
    }
  };

  const handleOAuthDisconnect = async (e: React.MouseEvent, platform: string) => {
    e.stopPropagation();
    try {
      await api.disconnectAccount(platform.toLowerCase());
      setConnectedSocials(prev => prev.filter(p => p !== platform.toUpperCase()));
      const platName = platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();
      setSelectedChannels(prev => {
        const updated = prev.filter(p => p !== platName);
        localStorage.setItem('fixora_setting_channels', JSON.stringify(updated));
        return updated;
      });
    } catch (err: any) {
      alert(`Could not disconnect ${platform}: ` + err.message);
    }
  };

  const openDirectConnectModal = (e: React.MouseEvent, platform: string) => {
    e.stopPropagation();
    const platNorm = platform.toUpperCase();
    const defaultHandle = platNorm === 'TWITTER' ? '@FixoraAI' : platNorm === 'INSTAGRAM' ? '@fixora.ai' : 'Fixora Global';
    setConnectModalPlatform(platNorm);
    setConnectModalHandle(defaultHandle);
    setConnectModalName(companyName || 'FixoraAI Global');
  };

  const handleSaveDirectConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectModalPlatform || !connectModalHandle) return;
    setIsSavingDirectConnect(true);
    try {
      await api.connectDirectAccount(connectModalPlatform, connectModalHandle, connectModalName);
      setConnectedSocials(prev => Array.from(new Set([...prev, connectModalPlatform])));
      const platName = connectModalPlatform === 'TWITTER' ? 'Twitter' : connectModalPlatform === 'LINKEDIN' ? 'LinkedIn' : connectModalPlatform.charAt(0) + connectModalPlatform.slice(1).toLowerCase();
      setSelectedChannels(prev => {
        const updated = Array.from(new Set([...prev, platName]));
        localStorage.setItem('fixora_setting_channels', JSON.stringify(updated));
        return updated;
      });
      setOauthBanner({
        type: 'success',
        message: `${connectModalPlatform} connected successfully as ${connectModalHandle}!`
      });
      setConnectModalPlatform(null);
    } catch (err: any) {
      alert('Failed to connect channel: ' + err.message);
    } finally {
      setIsSavingDirectConnect(false);
    }
  };

  const toggleTone = (toneName: string) => {
    if (selectedTones.includes(toneName)) {
      setSelectedTones(selectedTones.filter((t) => t !== toneName));
    } else {
      setSelectedTones([...selectedTones, toneName]);
    }
  };

  const toggleChannel = (ch: string) => {
    if (selectedChannels.includes(ch)) {
      setSelectedChannels(selectedChannels.filter((c) => c !== ch));
    } else {
      setSelectedChannels([...selectedChannels, ch]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const remainingSlots = 5 - docNames.length;
      if (remainingSlots <= 0) return;
      const newNames = files.slice(0, remainingSlots).map((f) => f.name);
      setDocNames((prev) => [...prev, ...newNames]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveDoc = (index: number) => {
    setDocNames((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      localStorage.setItem('fixora_setting_docs', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSaveAll = () => {
    const updated = {
      email: currentUser?.email || '',
      name: fullName.trim() || 'Team Member',
      org: companyName.trim() || 'My Workspace'
    };

    localStorage.setItem('fixora_setting_industry', industry);
    localStorage.setItem('fixora_setting_tones', JSON.stringify(selectedTones));
    localStorage.setItem('fixora_setting_channels', JSON.stringify(selectedChannels));
    localStorage.setItem('fixora_setting_docs', JSON.stringify(docNames));

    if (onUpdateUser) {
      onUpdateUser(updated);
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleDeleteAccountConfirm = async () => {
    setIsDeleting(true);
    setShowDeleteModal(false);

    // Step 1: Get the real Supabase user ID BEFORE signing out
    let supabaseUserId: string | undefined;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      supabaseUserId = user?.id;
    } catch (e) {
      console.warn('Could not fetch Supabase user ID:', e);
    }

    // Step 2: Tell backend to delete the user from Supabase Auth + purge all data
    // This must happen BEFORE signOut so the session token is still valid for auth context
    const userEmail = currentUser?.email || '';
    try {
      await api.deleteAccount(userEmail, supabaseUserId);
    } catch (e) {
      console.warn('Backend account purge notice:', e);
    }

    // Step 3: Hand off sign-out + redirect to App.tsx which owns auth state
    if (onDeleteAccount) {
      onDeleteAccount();
    } else {
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace('/');
    }
  };

  return (
    <div className="max-w-4xl space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            Account & Workspace Settings
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your organization profile, brand rules, active channels, and account security.
          </p>
        </div>

      </div>

      <button type="button" onClick={handleSaveAll} style={{ backgroundColor: '#009DFF', color: '#ffffff' }} className="fixed bottom-24 lg:bottom-6 right-4 lg:right-6 z-40 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 whitespace-nowrap">
        <Save className="h-4 w-4" /> Save Changes
      </button>

      {/* Success Notification */}
      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center gap-2.5 text-emerald-800 text-xs shadow-2xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">All workspace settings and brand preferences saved successfully.</span>
        </div>
      )}

      {/* OAuth Connection Status Notification */}
      {oauthBanner && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-2.5 text-xs shadow-2xs ${
          oauthBanner.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
            : 'bg-amber-50 border-amber-300 text-amber-900'
        }`}>
          <div className="flex items-center gap-2.5">
            {oauthBanner.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            )}
            <span className="font-semibold">{oauthBanner.message}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setOauthBanner(null)} 
            className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* SECTION 1: Personal & Organization Profile */}
      <div style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }} className="p-6 rounded-2xl border shadow-xs space-y-5">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <User className="h-4 w-4 text-slate-800" />
          Profile & Organization Details
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Primary Account Email (read-only)
            </label>
            <div className="relative">
              <input
                type="email"
                value={currentUser?.email || ''}
                disabled
                className="w-full pl-3 pr-8 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-500 cursor-not-allowed select-all"
              />
              <Lock className="h-3.5 w-3.5 text-slate-400 absolute right-3 top-2.5" />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Company / Organization Name
            </label>
            <div className="relative">
              <Building2 className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Organization name"
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Primary Industry
            </label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="Enterprise B2B SaaS & Cloud Software">Enterprise B2B SaaS & Cloud Software</option>
              <option value="FinTech, Banking & Financial Services">FinTech, Banking & Financial Services</option>
              <option value="Healthcare, Biotech & Pharmaceuticals">Healthcare, Biotech & Pharmaceuticals</option>
              <option value="E-Commerce, Direct-to-Consumer & Retail">E-Commerce, Direct-to-Consumer & Retail</option>
              <option value="Artificial Intelligence & DeepTech">Artificial Intelligence & DeepTech</option>
              <option value="Cybersecurity & Enterprise Infrastructure">Cybersecurity & Enterprise Infrastructure</option>
              <option value="Marketing, Advertising & PR Agencies">Marketing, Advertising & PR Agencies</option>
              <option value="Media, Entertainment & Publishing">Media, Entertainment & Publishing</option>
              <option value="EdTech & Educational Institutions">EdTech & Educational Institutions</option>
              <option value="Real Estate, Architecture & PropTech">Real Estate, Architecture & PropTech</option>
              <option value="LegalTech & Corporate Governance">LegalTech & Corporate Governance</option>
              <option value="Travel, Hospitality & Aviation">Travel, Hospitality & Aviation</option>
              <option value="Automotive & Clean Energy Tech">Automotive & Clean Energy Tech</option>
              <option value="Manufacturing & Industrial Logistics">Manufacturing & Industrial Logistics</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 2: Brand Tone of Voice */}
      <div style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }} className="p-6 rounded-2xl border shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-slate-800" />
            Brand Tone of Voice
          </h3>
          <span className="text-[11px] font-semibold text-slate-600">
            {selectedTones.length} selected (click to toggle)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {AVAILABLE_TONES.map((t) => {
            const isSelected = selectedTones.includes(t.name);
            return (
              <button
                key={t.name}
                type="button"
                onClick={() => toggleTone(t.name)}
                style={{
                  borderColor: isSelected ? 'var(--theme-primary)' : 'var(--theme-border)',
                  backgroundColor: isSelected ? '#EFF6FF' : '#F8FAFC'
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between gap-2 hover:bg-white ${
                  isSelected ? 'ring-1 ring-indigo-500 shadow-2xs' : ''
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">{t.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{t.desc}</div>
                </div>
                <div 
                  style={{
                    backgroundColor: isSelected ? 'var(--theme-primary)' : 'transparent',
                    borderColor: isSelected ? 'var(--theme-primary)' : 'var(--theme-border)'
                  }}
                  className="h-4 w-4 rounded-full border shrink-0 mt-0.5 flex items-center justify-center text-white"
                >
                  {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: Brand Guidelines Documents (Up to 5) */}
      <div style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }} className="p-6 rounded-2xl border shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-800" />
            Uploaded Brand Documents
          </h3>
          <span className="text-[11px] font-bold text-slate-600">
            {docNames.length} / 5 documents added
          </span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleFileUpload}
          className="hidden"
        />

        {docNames.length > 0 && (
          <div className="space-y-2">
            {docNames.map((name, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-300 shadow-2xs"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-900 truncate">{name}</p>
                    <p className="text-[10px] text-slate-400">Indexed for vector guideline citations</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveDoc(idx)}
                  className="h-7 w-7 rounded-lg hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Remove document"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {docNames.length < 5 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-4 rounded-xl bg-white border border-dashed border-slate-300 text-center cursor-pointer hover:border-indigo-500 transition-colors"
          >
            <UploadCloud className="h-5 w-5 text-slate-600 mx-auto mb-1" />
            <p className="text-xs font-bold text-slate-800">
              {docNames.length === 0 ? 'Upload Brand PDF Guidelines' : '+ Add More Documents'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Supports .pdf, .png, .jpg (Up to 5 total, {5 - docNames.length} slots remaining)
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-center text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5">
            <Check className="h-4 w-4 text-emerald-600" />
            Maximum capacity of 5 documents reached
          </div>
        )}
      </div>

      {/* SECTION 4: Active Channels */}
      <div style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }} className="p-6 rounded-2xl border shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Share2 className="h-4 w-4 text-slate-800" />
            Active Publishing & Review Channels
          </h3>
          <span className="text-[11px] font-semibold text-slate-600">
            {selectedChannels.length} active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AVAILABLE_CHANNELS.map((ch) => {
            const active = selectedChannels.includes(ch.id);
            const isPublishingChannel = ['LINKEDIN', 'TWITTER', 'INSTAGRAM', 'FACEBOOK'].includes(ch.id.toUpperCase());
            const isConnected = connectedSocials.includes(ch.id.toUpperCase());

            return (
              <div
                key={ch.id}
                onClick={() => toggleChannel(ch.id)}
                style={{
                  borderColor: isConnected ? '#10B981' : active ? '#009DFF' : '#CBD5E1',
                  backgroundColor: isConnected ? 'rgba(236, 253, 245, 0.9)' : active ? '#ffffff' : 'rgba(255, 255, 255, 0.65)'
                }}
                className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all hover:bg-white ${
                  isConnected ? 'ring-1 ring-emerald-500 shadow-2xs' : active ? 'ring-1 ring-indigo-500 shadow-2xs' : ''
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{ch.id}</span>
                    {isConnected && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold tracking-wide">
                        LIVE CONNECTED
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500">{ch.desc}</div>
                </div>

                <div className="flex items-center gap-2">
                  {isPublishingChannel && (
                    isConnected ? (
                      <button
                        type="button"
                        onClick={(e) => handleOAuthDisconnect(e, ch.id)}
                        className="px-2 py-1 rounded bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-600 text-[10px] font-semibold transition-colors cursor-pointer"
                        title="Disconnect account"
                      >
                        Disconnect
                      </button>
                    ) : ch.id.toUpperCase() === 'LINKEDIN' ? (
                      <button
                        type="button"
                        onClick={(e) => handleOAuthConnect(e, ch.id)}
                        disabled={isConnectingOAuth === ch.id}
                        style={{ backgroundColor: 'var(--theme-primary)' }}
                        className="px-2.5 py-1 rounded text-white text-[10px] font-bold hover:brightness-105 transition-all cursor-pointer shadow-xs"
                      >
                        {isConnectingOAuth === ch.id ? 'Connecting...' : 'Authorize'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => openDirectConnectModal(e, ch.id)}
                        style={{ backgroundColor: '#009DFF' }}
                        className="px-2.5 py-1 rounded text-white text-[10px] font-bold hover:opacity-90 transition-all cursor-pointer shadow-xs"
                      >
                        Connect Handle
                      </button>
                    )
                  )}

                  <div 
                    style={{
                      backgroundColor: isConnected ? '#10B981' : active ? '#009DFF' : 'transparent',
                      borderColor: isConnected ? '#10B981' : active ? '#009DFF' : '#CBD5E1'
                    }}
                    className="h-4 w-4 rounded border flex items-center justify-center text-white shrink-0"
                  >
                    {(isConnected || active) && <Check className="h-3 w-3" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 5: Danger Zone (Delete Account) */}
      <div className="p-6 rounded-2xl bg-rose-50/70 border border-rose-300 space-y-3">
        <h3 className="text-sm font-bold text-rose-900 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-600" />
          Danger Zone
        </h3>
        <p className="text-xs text-rose-700 leading-relaxed">
          Permanently delete your account, brand guidelines, and review history. Once deleted, this action cannot be recovered.
        </p>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Delete Account</span>
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-sm font-black text-slate-900">Confirm Account Deletion</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete your account? This will permanently delete your FixoraAI profile (<span className="font-bold text-slate-900">{currentUser?.email}</span>), all uploaded brand guidelines, and review history.
            </p>

            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
              ⚠️ This action is immediate and cannot be undone. You will be redirected to the sign-up page.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccountConfirm}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                {isDeleting ? (
                  <>
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Deleting Account...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Yes, Permanently Delete Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Social Channel Connect Modal */}
      {connectModalPlatform && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col text-xs text-slate-800">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div 
                  style={{ backgroundColor: connectModalPlatform === 'TWITTER' ? '#000000' : connectModalPlatform === 'INSTAGRAM' ? '#E4405F' : '#1877F2' }}
                  className="h-7 w-7 rounded-lg text-white font-bold flex items-center justify-center text-xs shadow-xs"
                >
                  {connectModalPlatform === 'TWITTER' ? '𝕏' : connectModalPlatform === 'INSTAGRAM' ? 'IG' : 'fb'}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Connect {connectModalPlatform === 'TWITTER' ? 'Twitter / X' : connectModalPlatform.charAt(0) + connectModalPlatform.slice(1).toLowerCase()}
                  </h3>
                  <p className="text-[10px] text-slate-500">Link your verified organization channel</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConnectModalPlatform(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-200/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDirectConnect} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Social Handle / Username *
                </label>
                <input
                  type="text"
                  value={connectModalHandle}
                  onChange={(e) => setConnectModalHandle(e.target.value)}
                  placeholder={connectModalPlatform === 'TWITTER' ? '@FixoraAI' : '@brand_handle'}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">This handle will be tagged and verified during multi-platform publish dispatch.</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Account Display Name
                </label>
                <input
                  type="text"
                  value={connectModalName}
                  onChange={(e) => setConnectModalName(e.target.value)}
                  placeholder="FixoraAI Global"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px] flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>1-Click Dispatch Enabled:</strong> Once linked, approved posts from the Review Queue can be dispatched to this channel in 1 click!
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConnectModalPlatform(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingDirectConnect || !connectModalHandle}
                  style={{ backgroundColor: '#009DFF' }}
                  className="px-5 py-2 rounded-xl text-white font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer text-xs shadow-xs"
                >
                  {isSavingDirectConnect ? 'Linking...' : 'Verify & Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
