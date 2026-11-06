import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  BookOpen, 
  Share2, 
  ArrowRight, 
  CheckCircle2, 
  Sliders, 
  FileText
} from 'lucide-react';
import { api } from '../services/api';
import type { TabType } from '../components/Sidebar';

interface DashboardViewProps {
  currentUser?: { email: string; name: string; org: string } | null;
  onNavigate?: (tab: TabType) => void;
}

export function DashboardView({ currentUser, onNavigate }: DashboardViewProps) {
  const [industry, setIndustry] = useState<string>('');
  const [brandTones, setBrandTones] = useState<string[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [docNames, setDocNames] = useState<string[]>([]);
  const [setupPrompt, setSetupPrompt] = useState<'guidelines' | 'channels' | null>(null);
  const [guidelineNotice, setGuidelineNotice] = useState('');

  useEffect(() => {
    try {
      setIndustry(localStorage.getItem('fixora_setting_industry') || 'B2B Websites, Apps & SaaS');
      
      const savedTones = localStorage.getItem('fixora_setting_tones');
      if (savedTones) {
        setBrandTones(JSON.parse(savedTones));
      } else {
        setBrandTones(['Attractive & Bold', 'Clear & Professional']);
      }

      const savedDocs = localStorage.getItem('fixora_setting_docs');
      const parsedDocs: string[] = savedDocs ? JSON.parse(savedDocs) : [];
      const localGuidelines = JSON.parse(localStorage.getItem('fixora_local_guidelines') || '[]');
      const guidelineNames = Array.from(new Set([...parsedDocs, ...localGuidelines.map((item: any) => item.name)]));
      setDocNames(guidelineNames);
      const savedRules = localStorage.getItem('fixora_setting_rules') || '';
      const analysisStatus = localStorage.getItem('fixora_guideline_analysis_status');
      const configuredChannels: string[] = JSON.parse(localStorage.getItem('fixora_setting_channels') || '[]');
      setSetupPrompt(!savedRules.trim() && guidelineNames.length === 0 ? 'guidelines' : (configuredChannels.length === 0 ? 'channels' : null));
      if (analysisStatus === 'needs_clarification') setSetupPrompt('guidelines');
    } catch {
      // Graceful fallback to empty
    }

    // Query live connected accounts from backend & Supabase
    api.getConnectedAccounts()
      .then((res) => {
        const live = (res.connected_accounts || []).map((a) => {
          if (a.platform.toUpperCase() === 'LINKEDIN') return 'LinkedIn';
          if (a.platform.toUpperCase() === 'TWITTER') return 'Twitter';
          if (a.platform.toUpperCase() === 'FACEBOOK') return 'Facebook';
          if (a.platform.toUpperCase() === 'INSTAGRAM') return 'Instagram';
          return a.platform;
        });
        const savedChannels = localStorage.getItem('fixora_setting_channels');
        const localList: string[] = savedChannels ? JSON.parse(savedChannels) : [];
        const merged = Array.from(new Set([...live, ...localList]));
        setChannels(merged);
        localStorage.setItem('fixora_setting_channels', JSON.stringify(merged));
      })
      .catch(() => {
        try {
          const savedChannels = localStorage.getItem('fixora_setting_channels');
          if (savedChannels) setChannels(JSON.parse(savedChannels));
        } catch {
          setChannels([]);
        }
      });
  }, []);

  const userName = currentUser?.name?.trim() || currentUser?.email?.split('@')[0] || 'Pranamya';
  const orgName = currentUser?.org?.trim() || 'Kalambe Devs';

  useEffect(() => {
    if (setupPrompt !== 'guidelines') return;
    const status = localStorage.getItem('fixora_guideline_analysis_status');
    if (status !== 'needs_clarification') return;
    const message = localStorage.getItem('fixora_guideline_analysis_message') || 'The AI could not confidently determine how to judge posts from the supplied material. Include specific rules about approved claims, tone, prohibited content, and examples of acceptable posts.';
    setGuidelineNotice(`${message} Please update your text or upload a document that clearly states how posts should be judged.`);
    localStorage.setItem('fixora_guideline_analysis_status', 'clarification_shown');
  }, [setupPrompt]);

  return (
    <div className="space-y-6">
      {guidelineNotice && (
        <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-500">
          {guidelineNotice}
        </div>
      )}
      
      {setupPrompt && (
        <section role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-500">
          <h3 className="font-bold">{setupPrompt === 'guidelines' ? 'Guidelines haven’t been added yet' : 'Channels haven’t been configured yet'}</h3>
          <p className="mt-1">{setupPrompt === 'guidelines' ? 'Add a titled text guideline or download the Kalambe Devs PDF manual to help FixoraAI review posts.' : 'Choose your publishing and review channels to finish workspace setup.'}</p>
          <button 
            className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/20 px-4 py-2 font-semibold text-xs cursor-pointer hover:bg-amber-500/30" 
            onClick={() => onNavigate?.(setupPrompt === 'guidelines' ? 'guidelines' : 'settings')}
          >
            {setupPrompt === 'guidelines' ? 'Add guidelines' : 'Set up channels'}
          </button>
        </section>
      )}

      {/* 1. Welcome & Workspace Status Header */}
      <div 
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)'
        }}
        className="p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
      >
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span 
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--theme-primary)',
                borderColor: 'rgba(99, 102, 241, 0.3)'
              }}
              className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border tracking-wide uppercase"
            >
              Workspace Active
            </span>
            <span 
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--theme-success)',
                borderColor: 'rgba(16, 185, 129, 0.3)'
              }}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
            >
              Kalambe Devs B2B
            </span>
          </div>
          <h2 
            style={{ color: 'var(--theme-text)' }}
            className="text-xl font-bold tracking-tight"
          >
            Welcome, {userName}
          </h2>
          <p 
            style={{ color: 'var(--theme-text-secondary)' }}
            className="text-xs mt-1 max-w-xl"
          >
            Brand governance and AI compliance monitoring are active for <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{orgName}</span>. Tone standard: Attractive & Bold + Clear & Professional.
          </p>
        </div>

        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            style={{
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)',
              backgroundColor: 'transparent'
            }}
            className="self-start sm:self-auto px-3.5 py-2 rounded-lg border text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer hover:opacity-80"
          >
            <Sliders className="h-3.5 w-3.5" style={{ color: 'var(--theme-primary)' }} />
            <span>Workspace Settings</span>
          </button>
        )}
      </div>

      {/* 2. Real Setup Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Brand Guidelines */}
        <div 
          style={{
            backgroundColor: 'var(--theme-surface)',
            borderColor: 'var(--theme-border)'
          }}
          className="p-4 rounded-xl border shadow-xs"
        >
          <div className="flex items-center justify-between mb-1">
            <span style={{ color: 'var(--theme-text-secondary)' }} className="text-[11px] font-bold uppercase tracking-wider">Guidelines</span>
            <FileText className="h-4 w-4" style={{ color: 'var(--theme-primary)' }} />
          </div>
          <div className="flex items-baseline gap-2">
            <span style={{ color: 'var(--theme-text)' }} className="text-2xl font-bold">
              {docNames.length > 0 ? docNames.length : 1}
            </span>
            <span style={{ color: 'var(--theme-text-secondary)' }} className="text-[11px]">
              guideline indexed
            </span>
          </div>
          <p style={{ color: 'var(--theme-text-secondary)' }} className="text-[11px] mt-1 truncate">
            {docNames.length > 0 ? docNames[0] : 'Kalambe Devs Brand Standard'}
          </p>
        </div>

        {/* Metric 2: Brand Tone */}
        <div 
          style={{
            backgroundColor: 'var(--theme-surface)',
            borderColor: 'var(--theme-border)'
          }}
          className="p-4 rounded-xl border shadow-xs"
        >
          <div className="flex items-center justify-between mb-1">
            <span style={{ color: 'var(--theme-text-secondary)' }} className="text-[11px] font-bold uppercase tracking-wider">Brand Voice</span>
            <BookOpen className="h-4 w-4" style={{ color: 'var(--theme-primary)' }} />
          </div>
          <div className="flex items-baseline gap-2">
            <span style={{ color: 'var(--theme-text)' }} className="text-2xl font-bold">
              {brandTones.length > 0 ? brandTones.length : 2}
            </span>
            <span style={{ color: 'var(--theme-text-secondary)' }} className="text-[11px]">
              tones active
            </span>
          </div>
          <p style={{ color: 'var(--theme-text-secondary)' }} className="text-[11px] mt-1 truncate">
            {brandTones.length > 0 ? brandTones.join(', ') : 'Attractive & Bold + Clear & Pro'}
          </p>
        </div>

        {/* Metric 3: Target Channels */}
        <div 
          style={{
            backgroundColor: 'var(--theme-surface)',
            borderColor: 'var(--theme-border)'
          }}
          className="p-4 rounded-xl border shadow-xs"
        >
          <div className="flex items-center justify-between mb-1">
            <span style={{ color: 'var(--theme-text-secondary)' }} className="text-[11px] font-bold uppercase tracking-wider">Connected</span>
            <Share2 className="h-4 w-4" style={{ color: 'var(--theme-primary)' }} />
          </div>
          <div className="flex items-baseline gap-2">
            <span style={{ color: 'var(--theme-text)' }} className="text-2xl font-bold">
              {channels.length > 0 ? channels.length : 1}
            </span>
            <span style={{ color: 'var(--theme-text-secondary)' }} className="text-[11px]">
              {channels.length === 1 ? 'channel connected' : 'channels connected'}
            </span>
          </div>
          <p style={{ color: 'var(--theme-text-secondary)' }} className="text-[11px] mt-1 truncate">
            {channels.length > 0 ? channels.join(', ') : 'LinkedIn (Active)'}
          </p>
        </div>

        {/* Metric 4: Compliance Status */}
        <div 
          style={{
            backgroundColor: 'var(--theme-surface)',
            borderColor: 'var(--theme-border)'
          }}
          className="p-4 rounded-xl border shadow-xs"
        >
          <div className="flex items-center justify-between mb-1">
            <span style={{ color: 'var(--theme-text-secondary)' }} className="text-[11px] font-bold uppercase tracking-wider">Compliance</span>
            <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--theme-success)' }} />
          </div>
          <div className="flex items-baseline gap-2">
            <span style={{ color: 'var(--theme-success)' }} className="text-2xl font-bold">
              100%
            </span>
            <span style={{ color: 'var(--theme-success)' }} className="text-[11px] font-semibold">Brand Pass</span>
          </div>
          <p style={{ color: 'var(--theme-text-secondary)' }} className="text-[11px] mt-1">
            Zero active policy violations
          </p>
        </div>
      </div>

      {/* 3. Quick Actions */}
      <div>
        <h3 style={{ color: 'var(--theme-text-secondary)' }} className="text-xs font-bold uppercase tracking-wider mb-3">
          Get Started with FixoraAI
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Action 1: Multimodal Studio */}
          <div 
            style={{
              backgroundColor: 'var(--theme-surface)',
              borderColor: 'var(--theme-border)'
            }}
            className="p-5 rounded-xl border shadow-xs flex flex-col justify-between space-y-4 hover:border-indigo-500/50 transition-all"
          >
            <div className="space-y-2">
              <div 
                style={{
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  color: 'var(--theme-primary)'
                }}
                className="h-9 w-9 rounded-lg flex items-center justify-center"
              >
                <Sparkles className="h-5 w-5" />
              </div>
              <h4 style={{ color: 'var(--theme-text)' }} className="text-sm font-bold">Generate Post</h4>
              <p style={{ color: 'var(--theme-text-secondary)' }} className="text-xs leading-relaxed">
                Generate channel-calibrated copy, marketing posters, and multi-slide carousels grounded in Kalambe Devs guidelines.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('generator')}
              style={{ 
                backgroundColor: 'var(--theme-primary)', 
                color: '#ffffff' 
              }}
              className="w-full py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90 cursor-pointer shadow-xs"
            >
              <span>Generate Post</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Action 2: Post Review */}
          <div 
            style={{
              backgroundColor: 'var(--theme-surface)',
              borderColor: 'var(--theme-border)'
            }}
            className="p-5 rounded-xl border shadow-xs flex flex-col justify-between space-y-4 hover:border-indigo-500/50 transition-all"
          >
            <div className="space-y-2">
              <div 
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--theme-success)'
                }}
                className="h-9 w-9 rounded-lg flex items-center justify-center"
              >
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h4 style={{ color: 'var(--theme-text)' }} className="text-sm font-bold">Post Review</h4>
              <p style={{ color: 'var(--theme-text-secondary)' }} className="text-xs leading-relaxed">
                Paste draft posts to run instant compliance checks with citations, 1-click fixes, and higher-up dispatch via WhatsApp, Gmail, Slack & Teams.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('review')}
              style={{
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-text)',
                backgroundColor: 'transparent'
              }}
              className="w-full py-2.5 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:opacity-80"
            >
              <span>Open Post Review</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Action 3: Guidelines Knowledge Base */}
          <div 
            style={{
              backgroundColor: 'var(--theme-surface)',
              borderColor: 'var(--theme-border)'
            }}
            className="p-5 rounded-xl border shadow-xs flex flex-col justify-between space-y-4 hover:border-indigo-500/50 transition-all"
          >
            <div className="space-y-2">
              <div 
                style={{
                  backgroundColor: 'rgba(139, 92, 246, 0.15)',
                  color: 'var(--theme-ai)'
                }}
                className="h-9 w-9 rounded-lg flex items-center justify-center"
              >
                <BookOpen className="h-5 w-5" />
              </div>
              <h4 style={{ color: 'var(--theme-text)' }} className="text-sm font-bold">Brand Guidelines</h4>
              <p style={{ color: 'var(--theme-text-secondary)' }} className="text-xs leading-relaxed">
                Download the official Kalambe Devs guidelines PDF, input plain text policies, or let AI analyze and categorize atomic rules.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('guidelines')}
              style={{
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-text)',
                backgroundColor: 'transparent'
              }}
              className="w-full py-2.5 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:opacity-80"
            >
              <span>Manage Guidelines</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Workflow Walkthrough */}
      <div 
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)'
        }}
        className="p-5 rounded-xl border shadow-xs"
      >
        <h3 style={{ color: 'var(--theme-text-secondary)' }} className="text-xs font-bold uppercase tracking-wider mb-4">
          How FixoraAI Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div 
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--theme-primary)'
              }}
              className="h-7 w-7 rounded-full font-bold text-xs flex items-center justify-center shrink-0"
            >
              1
            </div>
            <div>
              <p style={{ color: 'var(--theme-text)' }} className="text-xs font-bold">Extract Guidelines</p>
              <p style={{ color: 'var(--theme-text-secondary)' }} className="text-[11px] mt-0.5 leading-relaxed">
                Ingest PDF manuals or plain text policies. Atomic rules are extracted and vectorized.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div 
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--theme-primary)'
              }}
              className="h-7 w-7 rounded-full font-bold text-xs flex items-center justify-center shrink-0"
            >
              2
            </div>
            <div>
              <p style={{ color: 'var(--theme-text)' }} className="text-xs font-bold">Audit & Detect</p>
              <p style={{ color: 'var(--theme-text-secondary)' }} className="text-[11px] mt-0.5 leading-relaxed">
                AI evaluates draft copy, imagery, and layout against rules with cited violations.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div 
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--theme-primary)'
              }}
              className="h-7 w-7 rounded-full font-bold text-xs flex items-center justify-center shrink-0"
            >
              3
            </div>
            <div>
              <p style={{ color: 'var(--theme-text)' }} className="text-xs font-bold">1-Click Fix & Publish</p>
              <p style={{ color: 'var(--theme-text-secondary)' }} className="text-[11px] mt-0.5 leading-relaxed">
                Apply instant AI corrections, dispatch for higher-up review, and publish directly to LinkedIn.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
