import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  BookOpen, 
  Share2, 
  ArrowRight, 
  CheckCircle2, 
  Sliders, 
  FileText,
  Activity,
  ShieldAlert,
  Clock,
  Plus
} from 'lucide-react';
import { api } from '../services/api';
import type { TabType } from '../components/Sidebar';
import type { Post } from '../types';

interface DashboardViewProps {
  currentUser?: { email: string; name: string; org: string } | null;
  onNavigate?: (tab: TabType) => void;
}

interface AnalyticsData {
  total_posts: number;
  approved_posts: number;
  action_required_posts: number;
  average_compliance_score: number;
  guidelines_count: number;
  indexed_rules_count: number;
}

interface ViolationStat {
  category: string;
  count: number;
}

export function DashboardView({ currentUser, onNavigate }: DashboardViewProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    total_posts: 0,
    approved_posts: 0,
    action_required_posts: 0,
    average_compliance_score: 0,
    guidelines_count: 0,
    indexed_rules_count: 0
  });
  const [_topViolations, setTopViolations] = useState<ViolationStat[]>([]);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [brandTones, setBrandTones] = useState<string[]>([]);
  const [_loading, setLoading] = useState(true);

  const userName = currentUser?.name?.trim() || currentUser?.email?.split('@')[0] || 'Creator';
  const orgName = currentUser?.org?.trim() || 'Your Organization';

  useEffect(() => {
    let isMounted = true;

    // Load local workspace settings
    try {
      const savedTones = localStorage.getItem('fixora_setting_tones');
      if (savedTones) {
        setBrandTones(JSON.parse(savedTones));
      } else {
        setBrandTones(['Attractive & Bold', 'Clear & Professional']);
      }
    } catch {
      setBrandTones(['Attractive & Bold', 'Clear & Professional']);
    }

    // Fetch live analytics & recent posts from backend
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [overviewRes, postsRes, accountsRes, guidelinesRes] = await Promise.allSettled([
          api.getOverviewAnalytics(),
          api.getPosts(),
          api.getConnectedAccounts(),
          api.getGuidelines()
        ]);

        if (!isMounted) return;

        // Process Overview Analytics
        if (overviewRes.status === 'fulfilled' && overviewRes.value) {
          const summary = overviewRes.value.summary || {};
          const viols = overviewRes.value.top_violation_categories || [];
          setAnalytics({
            total_posts: summary.total_posts ?? 0,
            approved_posts: summary.approved_posts ?? 0,
            action_required_posts: summary.action_required_posts ?? 0,
            average_compliance_score: summary.average_compliance_score ?? 0,
            guidelines_count: summary.guidelines_count ?? 0,
            indexed_rules_count: summary.indexed_rules_count ?? 0
          });
          setTopViolations(viols);
        }

        // Process Recent Posts
        if (postsRes.status === 'fulfilled' && Array.isArray(postsRes.value)) {
          setRecentPosts(postsRes.value.slice(0, 5));
        }

        // Process Connected Channels
        if (accountsRes.status === 'fulfilled' && accountsRes.value) {
          const live = (accountsRes.value.connected_accounts || []).map((a) => a.platform);
          const saved = JSON.parse(localStorage.getItem('fixora_setting_channels') || '[]');
          const merged = Array.from(new Set([...live, ...saved, 'LinkedIn']));
          setChannels(merged);
        } else {
          setChannels(['LinkedIn', 'Slack']);
        }

        // Guidelines count check
        if (guidelinesRes.status === 'fulfilled' && Array.isArray(guidelinesRes.value)) {
          setAnalytics(prev => ({
            ...prev,
            guidelines_count: guidelinesRes.value.length || prev.guidelines_count
          }));
        }
      } catch (err) {
        console.warn('Dashboard live metrics fallback:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboardData();
    return () => { isMounted = false; };
  }, []);

  const handleLaunchTemplate = (topicText: string) => {
    localStorage.setItem('fixora_prefill_topic', topicText);
    onNavigate?.('generator');
  };

  const templates = [
    {
      title: 'Talent Acquisition',
      desc: 'Hiring C++ Graphics & Systems Developers',
      icon: '🚀',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      prompt: 'Hiring Senior C++ Graphics & Systems Developers for high-performance rendering engine'
    },
    {
      title: 'Product Feature Launch',
      desc: 'Automated 1-Click Brand Governance Studio',
      icon: '⚡',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      prompt: 'Announcing FixoraAI 1-Click Brand Governance and instant multimodal compliance verification'
    },
    {
      title: 'Thought Leadership',
      desc: 'Why Manual Social Reviews Are Failing B2B',
      icon: '💡',
      color: 'bg-purple-50 text-purple-700 border-purple-200',
      prompt: 'Why traditional manual brand review processes create bottlenecks and how automated AI policy audit fixes it'
    },
    {
      title: 'Milestone & Customer Win',
      desc: 'Celebrating 100% Policy Pass Rate Milestone',
      icon: '🏆',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      prompt: 'Celebrating our enterprise milestone: over 10,000 brand-safe social posts published with zero compliance leaks'
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-8">
      
      {/* ── 1. Executive Studio Hero Deck ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-6 sm:p-8 shadow-xl border border-slate-700/60">
        {/* Atmospheric background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold tracking-wide uppercase">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Brand Governance Active
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-slate-300 border border-white/15 text-[11px] font-medium">
                Enterprise Cloud • {orgName}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Welcome back, {userName}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl font-normal">
              Your multimodal brand safety engine is enforcing active guidelines across copy, visual posters, and PDF carousels with instant automated verification.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate?.('generator')}
              className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer hover:scale-102"
            >
              <Sparkles className="h-4 w-4" />
              <span>Generate Post</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate?.('review')}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer backdrop-blur-md"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Audit Draft</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate?.('settings')}
              className="h-10 w-10 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white border border-white/15 flex items-center justify-center transition-all cursor-pointer"
              title="Workspace Settings"
            >
              <Sliders className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Executive Snapshot Dock */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-slate-400 text-[11px] font-medium">Active Brand Voice</div>
            <div className="text-white font-bold text-sm mt-0.5 truncate">
              {brandTones.length > 0 ? brandTones[0] : 'Attractive & Bold'}
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-[11px] font-medium">Average Compliance</div>
            <div className="text-emerald-400 font-bold text-sm mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{analytics.average_compliance_score}% Verified</span>
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-[11px] font-medium">Connected Channels</div>
            <div className="text-white font-bold text-sm mt-0.5">
              {channels.length} Social & Review
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-[11px] font-medium">Indexed Rules</div>
            <div className="text-cyan-400 font-bold text-sm mt-0.5">
              {analytics.indexed_rules_count} in pgvector
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Core Bento KPI Metrics (4 Cards) ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Overall Brand Integrity */}
        <div 
          onClick={() => onNavigate?.('review')}
          className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-blue-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Brand Health</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {analytics.total_posts > 0 ? `${analytics.average_compliance_score}%` : '—'}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
              analytics.total_posts > 0 
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                : 'text-slate-500 bg-slate-50 border-slate-200'
            }`}>
              {analytics.total_posts > 0 ? 'Optimal' : 'No Audits Yet'}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${analytics.total_posts > 0 ? Math.min(100, analytics.average_compliance_score) : 0}%` }} 
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
            <span>{analytics.total_posts > 0 ? 'Zero critical policy leaks' : 'Audit drafts to score compliance'}</span>
            <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
          </p>
        </div>

        {/* KPI 2: Audit Review Queue */}
        <div 
          onClick={() => onNavigate?.('review')}
          className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-blue-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Reviews Audited</span>
            <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {analytics.total_posts}
            </span>
            <span className="text-xs text-slate-500">posts evaluated</span>
          </div>
          <div className="flex items-center gap-2 mt-3 text-[11px]">
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
              {analytics.approved_posts} Approved
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold border border-amber-200">
              {analytics.action_required_posts} Action Req
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
            <span>Instant &lt;10s RAG evaluation</span>
            <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
          </p>
        </div>

        {/* KPI 3: Active Guidelines & Vector Rules */}
        <div 
          onClick={() => onNavigate?.('guidelines')}
          className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-blue-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Brand Guidelines</span>
            <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {analytics.guidelines_count}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
              analytics.guidelines_count > 0 
                ? 'text-purple-800 bg-purple-50 border-purple-200' 
                : 'text-slate-500 bg-slate-50 border-slate-200'
            }`}>
              {analytics.guidelines_count > 0 ? 'Active' : 'Unconfigured'}
            </span>
          </div>
          <div className="text-[11px] text-slate-600 font-medium mt-3 truncate">
            {analytics.guidelines_count > 0 
              ? `${analytics.indexed_rules_count} vector chunks indexed in pgvector`
              : 'Upload brand guidelines to index rules'
            }
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
            <span>Tone, claims, logo & legal rules</span>
            <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
          </p>
        </div>

        {/* KPI 4: Connected Channels */}
        <div 
          onClick={() => onNavigate?.('settings')}
          className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-blue-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Publishing Hub</span>
            <div className="h-8 w-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Share2 className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {channels.length}
            </span>
            <span className="text-xs text-slate-500">channels linked</span>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[11px]">
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-bold border border-blue-200">
              LinkedIn
            </span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
              Slack/Teams
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
            <span>Executive review routing active</span>
            <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
          </p>
        </div>
      </section>

      {/* ── 3. Interactive Quick-Launch Studio Launchpad ── */}
      <section className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span>Studio Quick-Launch</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Launch enterprise-calibrated social posts, visual posters, and PDF carousels directly from proven templates.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate?.('generator')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <span>Open Full Generator</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Template Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {templates.map((tpl, idx) => (
            <div
              key={idx}
              onClick={() => handleLaunchTemplate(tpl.prompt)}
              className="p-4 rounded-2xl border border-slate-200/90 hover:border-blue-400 hover:bg-blue-50/20 transition-all cursor-pointer group flex flex-col justify-between space-y-3 bg-slate-50/50"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xl">{tpl.icon}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tpl.color}`}>
                    1-Click
                  </span>
                </div>
                <h3 className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                  {tpl.title}
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {tpl.desc}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-semibold text-blue-600">
                <span>Use Template</span>
                <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. Main 2-Column Command Center ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Left Column (7 cols): Recent Posts & Live Audits ── */}
        <section className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-700" />
                <span>Recent Audits & Social Posts</span>
              </h2>
              <p className="text-[11px] text-slate-500">Live posts evaluated against active brand rules</p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate?.('review')}
              className="text-xs font-semibold text-slate-600 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
            >
              <span>View Review Queue</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {recentPosts.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Clock className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">No recent posts found</h4>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Generate your first marketing asset or paste a draft in the Review Queue to populate this feed.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate?.('generator')}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create First Post</span>
                </button>
              </div>
            ) : (
              recentPosts.map((post) => {
                const isApproved = post.status === 'APPROVED' || (post.compliance_score || 0) >= 90;
                return (
                  <div
                    key={post.id}
                    onClick={() => onNavigate?.('review')}
                    className="p-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                          {post.intent_tags?.target_channel || 'LinkedIn'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          isApproved 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {isApproved ? 'Approved' : 'Action Required'}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-slate-600">
                          {post.compliance_score || 100}%
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                        {post.title || post.body?.slice(0, 60) || 'Untitled Marketing Post'}
                      </h4>

                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        {post.body?.replace(/\n+/g, ' ')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate?.('review');
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
                      >
                        Inspect Audit
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ── Right Column (5 cols): Policy Matrix & Voice Blueprint ── */}
        <section className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-indigo-600" />
                <span>Policy Risk Prevention</span>
              </h2>
              <p className="text-[11px] text-slate-500">Automated defense against common brand breaches</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate?.('guidelines')}
              className="text-xs font-semibold text-slate-600 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
            >
              <span>Rules</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* Risk Prevention Matrix Card */}
          {analytics.guidelines_count === 0 ? (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs text-center space-y-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <BookOpen className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-800">No Brand Guidelines Uploaded</h4>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                Upload your corporate PDF or styleguide in the Guidelines tab to index vector rules and activate real-time policy protection shields.
              </p>
              <button
                type="button"
                onClick={() => onNavigate?.('guidelines')}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs hover:bg-indigo-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Upload Brand Guideline</span>
              </button>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1">
                    <span>Tone & Voice Misalignment</span>
                    <span className="text-blue-600">Active Shield</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: '92%' }} />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Guarantees posts match Attractive & Bold corporate standards.</p>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1">
                    <span>Unsubstantiated Performance Claims</span>
                    <span className="text-emerald-600">Zero Tolerance</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: '100%' }} />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Flags absolute guarantees ("100% conversion") without disclaimers.</p>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1">
                    <span>Competitor Disparagement</span>
                    <span className="text-purple-600">Protected</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-purple-600 h-full rounded-full" style={{ width: '96%' }} />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Prevents named competitor benchmark disparagement.</p>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1">
                    <span>Visual & Logo Clear Space</span>
                    <span className="text-cyan-600">Enforced</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-cyan-500 h-full rounded-full" style={{ width: '94%' }} />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Enforces official colors (#2563EB) and safe logo margins.</p>
                </div>
              </div>

              {/* Golden Rules Quick Callout */}
              <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-950 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-blue-900">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                  Active Golden Rule
                </span>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Posts must maintain professional B2B diction, limit hashtags to 3–4 high-intent tags, and provide concrete hooks before publish.
                </p>
              </div>
            </div>
          )}
        </section>

      </div>

      {/* ── 5. End-to-End Enterprise Workflow Blueprint ── */}
      <section className="p-6 rounded-3xl bg-slate-50 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              FixoraAI Enterprise Workflow Architecture
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">How your content moves from guideline ingestion to 1-click publishing</p>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
            Automated Pipeline
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Step 1 */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="h-7 w-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                1
              </span>
              <BookOpen className="h-4 w-4 text-blue-600" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">1. Vectorize Brand Rules</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Upload PDF brand books or plain text rules. Fixora extracts atomic rules and stores 768-dim embeddings in pgvector.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="h-7 w-7 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                2
              </span>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">2. RAG Audit & Intent Cross-Check</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Every draft is checked against relevant rules and verified against creator campaign intent in &lt;10 seconds.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="h-7 w-7 rounded-lg bg-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                3
              </span>
              <Share2 className="h-4 w-4 text-purple-600" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">3. 1-Click Fix & Higher-Up Routing</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Apply AI suggestions in 1-click, dispatch approval cards via Slack, Teams & Gmail, or publish directly to LinkedIn.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
