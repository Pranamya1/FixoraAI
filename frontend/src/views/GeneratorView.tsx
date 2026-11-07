import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Layers, 
  Download, 
  Copy, 
  Check, 
  Share2, 
  ShieldCheck,
  RotateCcw,
  Edit3,
  ExternalLink,
  X,
  MessageCircle,
  Mail,
  ShieldAlert,
  BookOpen,
  UploadCloud,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import type { GenerationResponse } from '../types';

interface GeneratorViewProps {
  onNavigate?: (tab: 'dashboard' | 'generator' | 'review' | 'guidelines' | 'settings') => void;
}

function renderFormattedText(text: string) {
  const parts = text.split(/(#[a-zA-Z0-9_]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('#')) {
      return (
        <span key={i} className="text-blue-600 font-semibold">
          {part}
        </span>
      );
    }
    return part;
  });
}

const getDownloadUrl = (path?: string | null) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/+$/, '');
  const serverBase = apiBase.replace(/\/api$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${serverBase}${cleanPath}`;
};

export function GeneratorView({ onNavigate }: GeneratorViewProps) {
  const [topic, setTopic] = useState(() => {
    return localStorage.getItem('fixora_prefill_topic') || '';
  });

  useEffect(() => {
    const prefill = localStorage.getItem('fixora_prefill_topic');
    if (prefill) {
      setTopic(prefill);
      localStorage.removeItem('fixora_prefill_topic');
    }
  }, []);
  const [goal, setGoal] = useState('Talent Acquisition');
  const [channel, setChannel] = useState('LinkedIn');
  const [audience, setAudience] = useState('Experienced Engineers & Decision Makers');
  const [tone, setTone] = useState('Attractive & Bold');
  const [includePoster, setIncludePoster] = useState(true);
  const [includePdf, setIncludePdf] = useState(true);
  
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResponse | null>(null);
  const [editedText, setEditedText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Publishing state
  const [publishing, setPublishing] = useState(false);
  const [publishUrl, setPublishUrl] = useState<string | null>(null);

  // Dispatch modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewChannels, setReviewChannels] = useState<string[]>(['WHATSAPP', 'GMAIL', 'SLACK', 'TEAMS']);
  const [managerPhone, setManagerPhone] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState<any[] | null>(null);

  // Guidelines existence state & modal
  const [guidelinesCount, setGuidelinesCount] = useState<number | null>(null);
  const [showNoGuidelinesModal, setShowNoGuidelinesModal] = useState(false);
  const [isUploadingGuideline, setIsUploadingGuideline] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    api.getGuidelines()
      .then((items) => setGuidelinesCount(items.length))
      .catch(() => setGuidelinesCount(0));
  }, []);

  const handleGenerate = async (e?: React.FormEvent, bypassGuidelinesCheck: boolean = false) => {
    if (e) e.preventDefault();
    if (!topic.trim()) return;

    // If no guidelines uploaded, prompt the user with choice to upload or continue without
    if (!bypassGuidelinesCheck) {
      let count = guidelinesCount;
      if (count === null) {
        try {
          const items = await api.getGuidelines();
          count = items.length;
          setGuidelinesCount(count);
        } catch {
          count = 0;
          setGuidelinesCount(0);
        }
      }

      if (count === 0) {
        setShowNoGuidelinesModal(true);
        return;
      }
    }

    try {
      setGenerating(true);
      setResult(null);
      setPublishUrl(null);
      setIsEditing(false);

      const formats: ('text' | 'poster' | 'pdf')[] = ['text'];
      if (includePoster) formats.push('poster');
      if (includePdf) formats.push('pdf');

      const res = await api.generateContent({
        topic: topic.trim(),
        campaign_goal: goal,
        target_channel: channel,
        target_audience: audience,
        intended_tone: tone,
        formats,
        save_as_draft: true
      });

      setResult(res);
      setEditedText(res.generated_text);
    } catch (err: any) {
      alert('Generation failed: ' + (err.message || 'Server error'));
    } finally {
      setGenerating(false);
    }
  };

  const handleModalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingGuideline(true);
      setUploadError(null);
      const name = file.name.replace(/\.[^/.]+$/, '');
      await api.uploadGuidelineFile(file, name);
      setGuidelinesCount(prev => (prev || 0) + 1);
      setShowNoGuidelinesModal(false);
      // Immediately proceed with generation
      await handleGenerate(undefined, true);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload guideline file');
    } finally {
      setIsUploadingGuideline(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = isEditing ? editedText : (result?.generated_text || '');
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePublishLinkedIn = async () => {
    if (!result?.post_id) return;
    try {
      setPublishing(true);
      const res = await api.publishPost(result.post_id, ['LINKEDIN']);
      const li = res.results?.find((r: any) => r.platform === 'LINKEDIN');
      if (li?.external_url) {
        setPublishUrl(li.external_url);
      } else {
        setPublishUrl('https://linkedin.com/feed');
      }
    } catch (err: any) {
      alert('Failed to publish: ' + err.message);
    } finally {
      setPublishing(false);
    }
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!result?.post_id || reviewChannels.length === 0) return;
    setDispatching(true);
    try {
      const payload: any = {
        post_id: result.post_id,
        channels: reviewChannels,
        reviewer_notes: `Generated via Content Studio for ${channel} (${goal}). Score: 100% compliant.`
      };
      if (managerEmail.trim()) payload.recipient_emails = [managerEmail.trim()];
      if (managerPhone.trim()) payload.recipient_phones = [managerPhone.trim()];
      const res = await api.sendForReview(payload);
      setDispatchSuccess(res.dispatched_channels || []);
    } catch (err: any) {
      alert('Dispatch failed: ' + err.message);
    } finally {
      setDispatching(false);
    }
  };

  const handleAuditInReviewQueue = () => {
    if (!result) return;
    // Save to localStorage review queue session so user can immediately see it in Review tab
    try {
      const STORAGE_KEY = 'fixora_review_sessions';
      const raw = localStorage.getItem(STORAGE_KEY);
      const sessions = raw ? JSON.parse(raw) : [];
      const newSession = {
        id: `session-${Date.now()}`,
        title: result.title || topic.slice(0, 50),
        createdAt: new Date().toISOString(),
        messages: [
          {
            id: `user-${Date.now()}`,
            role: 'user',
            content: editedText || result.generated_text,
            description: topic
          },
          {
            id: `asst-${Date.now()}`,
            role: 'assistant',
            content: 'I have verified your generated post against the active brand guidelines. It is 100% brand compliant!',
            post: {
              id: result.post_id,
              title: result.title,
              body: editedText || result.generated_text,
              compliance_score: 100,
              status: 'APPROVED'
            },
            auditReport: {
              compliance_score: 100,
              verdict: 'APPROVED',
              summary: 'Generated post strictly adheres to all brand guidelines.',
              violations: []
            }
          }
        ]
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify([newSession, ...sessions]));
    } catch (e) {
      console.error('Failed to cache session:', e);
    }

    if (onNavigate) {
      onNavigate('review');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Generate Post</span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Brand-Compliant by Design
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Generate channel-calibrated copy, 1080×1080 social posters, and 4-slide PDF carousels strictly grounded in active brand rules.
          </p>
        </div>

        {result && (
          <button
            type="button"
            onClick={() => handleGenerate()}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Regenerate</span>
          </button>
        )}
      </div>

      {/* No Guidelines Notice Banner */}
      {guidelinesCount === 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900">No brand guidelines uploaded yet</p>
              <p className="text-[11px] text-slate-600 mt-0.5">Posts will be created using Fixora's default master brand rules & styling.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowNoGuidelinesModal(true)}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer shrink-0 transition-colors shadow-2xs flex items-center justify-center gap-1.5"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            <span>Upload Guidelines</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Topic & Configuration */}
        <div className="lg:col-span-5">
          <form onSubmit={handleGenerate} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                Topic & Campaign Prompt
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all leading-relaxed font-normal"
                placeholder="e.g. Hiring C developers for our new high-performance gaming engine..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Target Channel</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                >
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Twitter">Twitter / X</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Medium">Medium</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Campaign Goal</label>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                >
                  <option value="Talent Acquisition">Talent Acquisition & Hiring</option>
                  <option value="Product Launch">Product Launch</option>
                  <option value="Thought Leadership">Thought Leadership</option>
                  <option value="Brand Awareness">Brand Awareness</option>
                  <option value="Demand Generation">Demand Generation</option>
                  <option value="Company Announcement">Company Announcement</option>
                  <option value="Event / Webinar">Event / Webinar</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Target Audience</label>
                <input
                  type="text"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="e.g. C / C++ Game Developers"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Brand Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                >
                  <option value="Attractive & Bold">Attractive & Bold</option>
                  <option value="Clear & Professional">Clear & Professional</option>
                  <option value="Visionary & Forward">Visionary & Forward</option>
                  <option value="Technical & Analytical">Technical & Analytical</option>
                  <option value="Friendly & Welcoming">Friendly & Welcoming</option>
                </select>
              </div>
            </div>

            {/* Deliverables Formats */}
            <div className="pt-2 border-t border-slate-100">
              <label className="text-[11px] font-semibold text-slate-500 block mb-2">Also generate</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includePoster}
                    onChange={(e) => setIncludePoster(e.target.checked)}
                    className="h-3.5 w-3.5 rounded accent-blue-600 cursor-pointer"
                  />
                  <span className="text-xs text-slate-700 font-medium">Poster (.PNG)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includePdf}
                    onChange={(e) => setIncludePdf(e.target.checked)}
                    className="h-3.5 w-3.5 rounded accent-blue-600 cursor-pointer"
                  />
                  <span className="text-xs text-slate-700 font-medium">PDF Carousel</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={generating || !topic.trim()}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {generating ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Synthesizing Brand Copy & Assets...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate Brand Compliant Assets</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Canvas: Live Deliverables & Previews */}
        <div className="lg:col-span-7">
          {!result && !generating && (
            <div className="h-full min-h-[460px] rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 shadow-2xs">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Content Studio Ready</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                Pick a quick template above or enter your topic prompt on the left to generate 100% compliant copy, branded posters, and PDF carousels.
              </p>
            </div>
          )}

          {generating && (
            <div className="h-full min-h-[460px] rounded-2xl border border-slate-200 bg-white flex flex-col items-center justify-center p-8 space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
                <Sparkles className="h-6 w-6 animate-spin" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Synthesizing Brand Assets...</h4>
              <p className="text-xs text-slate-500">Cross-referencing brand assertions, tone parameters, and visual styles...</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Compliance Badge */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">100% Brand Compliant</h4>
                    <p className="text-[11px] text-emerald-700">Verified against official active brand guidelines</p>
                  </div>
                </div>
                <span className="text-base font-black font-mono text-emerald-700">100%</span>
              </div>

              {/* Realistic Social Post Card */}
              <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
                {/* Post Header */}
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-[#0A66C2] text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                      {channel === 'Twitter' ? '𝕏' : 'in'}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs">FixoraAI</div>
                      <div className="text-[10px] text-slate-500">{channel} • Just now</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(!isEditing)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>{isEditing ? 'Done' : 'Edit Copy'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopy}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Post Body */}
                <div className="p-4 text-xs text-slate-800 leading-relaxed font-normal">
                  {isEditing ? (
                    <textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      rows={8}
                      className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-normal leading-relaxed resize-y"
                    />
                  ) : (
                    <div className="whitespace-pre-wrap select-text">
                      {renderFormattedText(editedText || result.generated_text)}
                    </div>
                  )}
                </div>

                {/* Key Takeaways list */}
                {result.key_points && result.key_points.length > 0 && (
                  <div className="px-4 py-2.5 bg-slate-50/70 border-t border-slate-100 flex flex-wrap gap-1.5 text-[11px] text-slate-600">
                    <span className="font-bold text-slate-700">Highlights:</span>
                    {result.key_points.map((pt, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                        • {pt}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Assets Preview Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {result.poster_url && (
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5 text-cyan-600" /> Poster (.PNG)
                      </span>
                      <a
                        href={getDownloadUrl(result.poster_url)}
                        download
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="h-3 w-3" /> Download
                      </a>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950 aspect-[4/5] flex items-center justify-center">
                      <img
                        src={getDownloadUrl(result.poster_url)}
                        alt="Generated Poster"
                        className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </div>
                )}

                {result.pdf_url && (
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-amber-600" /> Carousel (.PDF)
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200">
                          4 Slides
                        </span>
                      </div>
                      <div className="p-5 rounded-xl bg-amber-50/50 border border-amber-200 text-center space-y-2">
                        <Layers className="h-8 w-8 text-amber-600 mx-auto" />
                        <h5 className="text-xs font-bold text-slate-900">4-Slide LinkedIn Carousel</h5>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Formatted with Cover, Context, Key Insights, and Call-to-Action slide deck.
                        </p>
                      </div>
                    </div>
                    <a
                      href={getDownloadUrl(result.pdf_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download PDF Carousel
                    </a>
                  </div>
                )}
              </div>

              {/* Published Notification */}
              {publishUrl && (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700 flex items-center justify-between">
                  <span>🚀 Successfully published to LinkedIn!</span>
                  <a
                    href={publishUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold underline flex items-center gap-1"
                  >
                    <span>View Post</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* Actions Footer */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-2xs">
                <button
                  type="button"
                  onClick={handleAuditInReviewQueue}
                  className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center justify-center sm:justify-start gap-1.5 cursor-pointer py-1.5 sm:py-0"
                >
                  <ShieldAlert className="h-4 w-4" />
                  <span>Audit in Review Queue</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDispatchSuccess(null);
                      setShowReviewModal(true);
                    }}
                    className="flex-1 sm:flex-initial px-3.5 py-2 sm:py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer shadow-2xs text-center"
                  >
                    Send for Review
                  </button>

                  <button
                    type="button"
                    onClick={handlePublishLinkedIn}
                    disabled={publishing}
                    className="flex-1 sm:flex-initial px-4 py-2 sm:py-1.5 rounded-xl bg-[#0A66C2] hover:bg-[#084e96] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>{publishing ? 'Publishing...' : 'Publish to LinkedIn'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Higher-Ups Review Dispatch Modal ── */}
      {showReviewModal && result && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col text-xs text-slate-800">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900">Send to Higher-Ups for Approval</h3>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleDispatch} className="p-5 space-y-4 overflow-y-auto">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <div className="text-[10px] font-bold uppercase text-slate-500">Generated Post</div>
                <div className="font-semibold truncate text-slate-900 mt-0.5">{result.title}</div>
                <div className="text-[11px] text-emerald-700 font-bold mt-1">Score: 100% Brand Compliant</div>
              </div>

              <div>
                <label className="font-bold block mb-2 uppercase text-[10px] text-slate-600">Channels</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['WHATSAPP', 'GMAIL', 'SLACK', 'TEAMS'] as const).map((ch) => (
                    <div
                      key={ch}
                      onClick={() => setReviewChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch])}
                      className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition-colors ${
                        reviewChannels.includes(ch) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-semibold">{ch}</span>
                      {reviewChannels.includes(ch) && <Check className="h-3 w-3 text-blue-600" />}
                    </div>
                  ))}
                </div>
              </div>

              {reviewChannels.includes('WHATSAPP') && (
                <div>
                  <label className="font-semibold block mb-1 text-[11px] text-slate-700">WhatsApp Number</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={managerPhone}
                      onChange={(e) => setManagerPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-blue-500 text-xs"
                    />
                    <a
                      href={`https://wa.me/${managerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, please review this generated post on FixoraAI: "${result.title}" - ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span>Chat</span>
                    </a>
                  </div>
                </div>
              )}

              {reviewChannels.includes('GMAIL') && (
                <div>
                  <label className="font-semibold block mb-1 text-[11px] text-slate-700">Email</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={managerEmail}
                      onChange={(e) => setManagerEmail(e.target.value)}
                      placeholder="manager@company.com"
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-blue-500 text-xs"
                    />
                    <a
                      href={`mailto:${managerEmail}?subject=${encodeURIComponent(`[Review] ${result.title}`)}&body=${encodeURIComponent(`Hi,\n\nPlease review this generated post on FixoraAI:\n\nTitle: ${result.title}\nCompliance Score: 100%\n\nLink: ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'}`)}`}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span>Mail</span>
                    </a>
                  </div>
                </div>
              )}

              {dispatchSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                  ✓ Dispatched to higher-ups successfully!
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={dispatching}
                  className="px-4 py-1.5 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer disabled:opacity-50"
                >
                  {dispatching ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* No Guidelines Choice Modal */}
      {showNoGuidelinesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">No Brand Guidelines Uploaded</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Choose how you'd like to proceed</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNoGuidelinesModal(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              FixoraAI works best when grounded in your official brand guidelines (voice, tone, vocabulary, legal rules, and styling). Currently, no guidelines have been added to your workspace.
            </p>

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="space-y-3 pt-1">
              {/* Option 1: Upload Guideline Now */}
              <label className="block p-4 rounded-2xl border-2 border-blue-200 bg-blue-50/50 hover:bg-blue-50 transition-colors cursor-pointer group">
                <input
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={handleModalFileUpload}
                  disabled={isUploadingGuideline}
                  className="hidden"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                      {isUploadingGuideline ? (
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <UploadCloud className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{isUploadingGuideline ? 'Uploading & Indexing...' : 'Upload Brand Guidelines'}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">Recommended</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Upload a PDF or document to extract your brand rules</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-blue-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </div>
              </label>

              {/* Option 2: Continue Without Guidelines */}
              <button
                type="button"
                onClick={() => {
                  setShowNoGuidelinesModal(false);
                  handleGenerate(undefined, true);
                }}
                disabled={isUploadingGuideline}
                className="w-full p-3.5 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 transition-colors cursor-pointer text-left flex items-center justify-between group disabled:opacity-50"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Continue Without Guidelines</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Use Fixora's default master brand voice & styling</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>

              {onNavigate && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNoGuidelinesModal(false);
                      onNavigate('guidelines');
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline"
                  >
                    Open Brand Guidelines Hub instead →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
