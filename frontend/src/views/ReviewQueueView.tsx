import { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Plus, 
  X, 
  ShieldCheck, 
  AlertTriangle, 
  Check, 
  Wand2, 
  Share2, 
  Mail, 
  MessageCircle, 
  MessageSquare, 
  CheckCircle2, 
  ExternalLink,
  RefreshCw,
  Copy,
  FileText,
  Sliders,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api';
import type { Post, AuditReport, Violation } from '../types';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  attachmentName?: string;
  channel?: string;
  post?: Post;
  auditReport?: AuditReport;
  isEvaluating?: boolean;
}

export function ReviewQueueView() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'ai',
      text: "👋 Hello! I am your AI Brand Governance Copilot. Paste any LinkedIn post, social caption, or article below, and I'll audit it against your Kalambe Devs guidelines (Attractive & Bold + Clear & Professional). I'll cite specific rules, provide 1-click fixes, and help you publish to LinkedIn or dispatch to higher-ups for approval.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<'LinkedIn' | 'Twitter' | 'Facebook' | 'Instagram'>('LinkedIn');
  const [selectedTone, setSelectedTone] = useState('Attractive & Bold');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [applyingFixId, setApplyingFixId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishUrl, setPublishUrl] = useState<string | null>(null);

  // Modal for higher-up review dispatch
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [modalPost, setModalPost] = useState<Post | null>(null);
  const [reviewChannels, setReviewChannels] = useState<string[]>(['WHATSAPP', 'GMAIL', 'SLACK', 'TEAMS']);
  const [managerPhone, setManagerPhone] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerNotes, setManagerNotes] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResults, setDispatchResults] = useState<any[] | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isEvaluating]);

  // Sample prompt helpers
  const handleLoadSample = (sampleType: 'b2b' | 'claims' | 'tone') => {
    if (sampleType === 'b2b') {
      setInputMessage(
        "Please review this draft for LinkedIn:\n\n" +
        "We just benchmarked our new custom microservices engine at Kalambe Devs.\n\n" +
        "Result: 43ms global latency under 100k concurrent requests. Our proprietary optimization pipeline reduces database read overhead by 68% while maintaining 99.99% uptime.\n\n" +
        "When building for enterprise B2B SaaS, architecture isn't just an implementation detail — it's your company's foundation.\n\n" +
        "#SaaS #B2B #Engineering #SoftwareArchitecture"
      );
    } else if (sampleType === 'claims') {
      setInputMessage(
        "Audit this draft:\n\n" +
        "Kalambe Devs is 100% the best development company in the world! Unlike AWS and Vercel who constantly have outages, our apps never ever crash. Switch to us today for unbeatable prices and guaranteed 10x revenue in 30 days.\n\n" +
        "#BestTech #CrushingCompetitors #EasyMoney"
      );
    } else {
      setInputMessage(
        "Review this tone:\n\n" +
        "Hey everyone, maybe check out our website building stuff if you have some time? We kind of build web apps and saas things, hope you guys like it. Let us know what you think.\n\n" +
        "#code #web"
      );
    }
    textareaRef.current?.focus();
  };

  const handleSendMessage = async () => {
    const rawText = inputMessage.trim();
    if (!rawText && !attachment) return;

    const userMsgId = `user-${Date.now()}`;
    const aiMsgId = `ai-${Date.now()}`;
    const userText = rawText || (attachment ? `Uploaded file: ${attachment.name}` : '');

    // Add user message to stream
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        text: userText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        attachmentName: attachment?.name,
        channel: selectedChannel
      }
    ]);

    setInputMessage('');
    const currentAttachment = attachment;
    setAttachment(null);
    setIsEvaluating(true);

    try {
      // 1. Create the post in backend
      const title = userText.slice(0, 50).replace(/\n/g, ' ') + (userText.length > 50 ? '...' : '');
      const postPayload = {
        title,
        body: userText,
        intent_tags: {
          target_channel: selectedChannel,
          target_audience: 'B2B Enterprise Decision Makers & Founders',
          campaign_goal: 'Thought Leadership',
          intended_tone: selectedTone,
          category: 'Social Content'
        }
      };

      const createdPost = await api.createPost(postPayload as any);

      // 2. Evaluate compliance with Gemini RAG
      const report = await api.evaluatePost(createdPost.id);

      const updatedPost: Post = {
        ...createdPost,
        compliance_score: report.compliance_score,
        status: report.verdict === 'APPROVED' ? 'APPROVED' : 'ACTION_REQUIRED'
      };

      // 3. Add AI response to stream
      setMessages((prev) => [
        ...prev,
        {
          id: aiMsgId,
          sender: 'ai',
          text: report.summary || "I have reviewed your post against Kalambe Devs brand rules. Here is the detailed compliance breakdown:",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          post: updatedPost,
          auditReport: report
        }
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: aiMsgId,
          sender: 'ai',
          text: `⚠️ Evaluation failed: ${err.message || 'Could not connect to audit service'}. Please ensure the backend is running.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsEvaluating(false);
    }
  };

  // 1-Click Fix handler inside the AI stream
  const handleApplyFix = async (msgId: string, violation: Violation) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg?.post) return;

    setApplyingFixId(violation.id);
    try {
      const res = await api.applyOneClickFix({
        post_id: msg.post.id,
        violation_id: violation.id,
        suggested_fix: violation.suggested_fix,
        offending_fragment: violation.offending_fragment
      });

      if (res.post) {
        // Fetch re-evaluated report
        const updatedReport = await api.getLatestAuditReport(msg.post.id);
        const newScore = updatedReport?.compliance_score ?? 100;
        const newVerdict = updatedReport?.verdict ?? 'APPROVED';

        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === msgId) {
              return {
                ...m,
                post: {
                  ...res.post,
                  compliance_score: newScore,
                  status: newVerdict === 'APPROVED' ? 'APPROVED' : 'ACTION_REQUIRED'
                },
                auditReport: updatedReport || undefined
              };
            }
            return m;
          })
        );
      }
    } catch (err: any) {
      alert('Failed to apply fix: ' + err.message);
    } finally {
      setApplyingFixId(null);
    }
  };

  // 1-Click Publish to LinkedIn
  const handlePublishLinkedIn = async (post: Post) => {
    setPublishingId(post.id);
    setPublishUrl(null);
    try {
      const res = await api.publishPost(post.id, ['LINKEDIN']);
      const li = res.results?.find((r: any) => r.platform === 'LINKEDIN');
      if (li?.external_url) {
        setPublishUrl(li.external_url);
      }
      // Update local state to published
      setMessages((prev) =>
        prev.map((m) => {
          if (m.post?.id === post.id) {
            return {
              ...m,
              post: { ...m.post, status: 'PUBLISHED' }
            };
          }
          return m;
        })
      );
    } catch (err: any) {
      alert('LinkedIn publish failed: ' + err.message);
    } finally {
      setPublishingId(null);
    }
  };

  // Open Higher-Up Review Modal
  const openReviewModal = (post: Post) => {
    setModalPost(post);
    setDispatchResults(null);
    setShowReviewModal(true);
  };

  const handleDispatchReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalPost || reviewChannels.length === 0) return;
    setDispatching(true);
    try {
      const payload: any = {
        post_id: modalPost.id,
        channels: reviewChannels,
        reviewer_notes: managerNotes.trim() || `Executive review requested for "${modalPost.title}". Compliance score: ${modalPost.compliance_score || 100}%`
      };
      if (managerEmail.trim()) payload.recipient_emails = [managerEmail.trim()];
      if (managerPhone.trim()) payload.recipient_phones = [managerPhone.trim()];

      const res = await api.sendForReview(payload);
      setDispatchResults(res.dispatched_channels || []);
    } catch (err: any) {
      alert('Failed to dispatch review: ' + err.message);
    } finally {
      setDispatching(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div 
      style={{
        backgroundColor: 'var(--theme-bg)',
        color: 'var(--theme-text)'
      }}
      className="flex flex-col h-[calc(100vh-100px)] rounded-xl border border-[var(--theme-border)] overflow-hidden"
    >
      {/* 1. AI Copilot Top Bar */}
      <div 
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)'
        }}
        className="px-5 py-3 border-b flex items-center justify-between shrink-0"
      >
        <div className="flex items-center gap-3">
          <div 
            style={{
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              color: 'var(--theme-primary)'
            }}
            className="h-8 w-8 rounded-lg flex items-center justify-center font-bold"
          >
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight">AI Post Review Copilot</h2>
              <span 
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--theme-success)',
                  borderColor: 'rgba(16, 185, 129, 0.3)'
                }}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
              >
                Kalambe Devs Engine Active
              </span>
            </div>
            <p style={{ color: 'var(--theme-text-secondary)' }} className="text-[11px]">
              Grounded in official B2B guidelines • Attractive & Bold + Clear & Professional
            </p>
          </div>
        </div>

        {/* Clear chat / New audit session */}
        <button
          type="button"
          onClick={() => setMessages([
            {
              id: 'welcome',
              sender: 'ai',
              text: "👋 Brand Review Copilot reset. Paste a new post below to run an instant audit!",
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ])}
          style={{ borderColor: 'var(--theme-border)' }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity"
          title="Start fresh audit session"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>New Session</span>
        </button>
      </div>

      {/* 2. Chat Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {messages.map((msg) => {
          const isAi = msg.sender === 'ai';

          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-4xl mx-auto ${isAi ? 'items-start' : 'items-start flex-row-reverse'}`}
            >
              {/* Avatar */}
              <div 
                style={{
                  backgroundColor: isAi ? 'rgba(99, 102, 241, 0.2)' : 'var(--theme-primary)',
                  color: isAi ? 'var(--theme-primary)' : '#ffffff'
                }}
                className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs shadow-xs"
              >
                {isAi ? <Sparkles className="h-4 w-4" /> : 'You'}
              </div>

              {/* Message Content */}
              <div className={`space-y-3 max-w-[85%] ${isAi ? 'w-full' : ''}`}>
                {/* Text Bubble */}
                <div
                  style={{
                    backgroundColor: isAi ? 'var(--theme-surface)' : 'var(--theme-primary)',
                    color: isAi ? 'var(--theme-text)' : '#ffffff',
                    borderColor: isAi ? 'var(--theme-border)' : 'transparent'
                  }}
                  className={`p-4 rounded-2xl border shadow-xs text-xs leading-relaxed whitespace-pre-wrap ${
                    isAi ? 'rounded-tl-xs' : 'rounded-tr-xs'
                  }`}
                >
                  {/* Meta tags for user messages */}
                  {!isAi && msg.channel && (
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/20 text-[10px] font-bold">
                      <span>Channel: {msg.channel}</span>
                      <span>•</span>
                      <span>Tone: Attractive & Bold</span>
                    </div>
                  )}

                  {msg.text}

                  {msg.attachmentName && (
                    <div className="mt-2 pt-2 border-t border-white/20 flex items-center gap-1.5 text-[11px] font-semibold">
                      <FileText className="h-3.5 w-3.5" />
                      <span>{msg.attachmentName}</span>
                    </div>
                  )}
                </div>

                {/* AI Interactive Audit Card */}
                {isAi && msg.post && (
                  <div 
                    style={{
                      backgroundColor: 'var(--theme-surface)',
                      borderColor: 'var(--theme-border)'
                    }}
                    className="p-4 sm:p-5 rounded-2xl border shadow-md space-y-4 animate-in fade-in duration-300"
                  >
                    {/* Header Score & Verdict */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--theme-border)]">
                      <div className="flex items-center gap-3">
                        <div 
                          style={{
                            backgroundColor: (msg.post.compliance_score || 0) >= 90 
                              ? 'rgba(16, 185, 129, 0.15)' 
                              : 'rgba(245, 158, 11, 0.15)',
                            borderColor: (msg.post.compliance_score || 0) >= 90 
                              ? 'rgba(16, 185, 129, 0.3)' 
                              : 'rgba(245, 158, 11, 0.3)',
                            color: (msg.post.compliance_score || 0) >= 90 
                              ? 'var(--theme-success)' 
                              : 'var(--theme-warning)'
                          }}
                          className="h-12 w-12 rounded-xl border flex flex-col items-center justify-center font-bold font-mono shrink-0"
                        >
                          <span className="text-sm">{msg.post.compliance_score || 100}%</span>
                          <span className="text-[8px] uppercase tracking-tighter">Score</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span 
                              style={{
                                backgroundColor: (msg.post.compliance_score || 0) >= 90 
                                  ? 'rgba(16, 185, 129, 0.15)' 
                                  : 'rgba(245, 158, 11, 0.15)',
                                color: (msg.post.compliance_score || 0) >= 90 
                                  ? 'var(--theme-success)' 
                                  : 'var(--theme-warning)'
                              }}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            >
                              {msg.post.status === 'PUBLISHED' ? '🚀 LIVE ON LINKEDIN' : (msg.post.compliance_score || 0) >= 90 ? '✅ 100% BRAND COMPLIANT' : '⚠️ ACTION REQUIRED'}
                            </span>
                            <span style={{ color: 'var(--theme-text-secondary)' }} className="text-[11px]">
                              {msg.post.intent_tags?.target_channel || 'LinkedIn'}
                            </span>
                          </div>
                          <h4 style={{ color: 'var(--theme-text)' }} className="text-xs font-bold mt-1">
                            {msg.post.title}
                          </h4>
                        </div>
                      </div>

                      {/* Top Action Pills */}
                      <div className="flex items-center gap-1.5 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(msg.post?.body || '', msg.id)}
                          style={{ borderColor: 'var(--theme-border)' }}
                          className="p-2 rounded-lg border text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          title="Copy post body"
                        >
                          {copiedId === msg.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Cited Violations Breakdown */}
                    {msg.auditReport?.violations && msg.auditReport.violations.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-amber-500">
                          <span>Rule Violations Detected ({msg.auditReport.violations.length})</span>
                          <span>Click to auto-correct</span>
                        </div>

                        <div className="space-y-2.5">
                          {msg.auditReport.violations.map((violation) => {
                            const isCritical = violation.severity === 'CRITICAL';
                            const badgeColor = isCritical
                              ? 'bg-red-500/10 text-red-400 border-red-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30';

                            return (
                              <div
                                key={violation.id}
                                style={{ borderColor: 'var(--theme-border)' }}
                                className="p-3.5 rounded-xl border bg-black/20 space-y-2"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
                                      {violation.category.replace('_', ' ')}
                                    </span>
                                    <span style={{ color: 'var(--theme-text-secondary)' }} className="text-[10px]">
                                      {violation.document_name} • Page {violation.page_ref}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    Rule: {violation.rule_title}
                                  </span>
                                </div>

                                {/* Offending text fragment */}
                                <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400">
                                  <span className="font-bold text-red-300">Offending fragment: </span>
                                  &ldquo;{violation.offending_fragment}&rdquo;
                                </div>

                                <p style={{ color: 'var(--theme-text-secondary)' }} className="text-[11px] leading-relaxed">
                                  {violation.violation_explanation}
                                </p>

                                {/* 1-Click Fix Button */}
                                <div className="flex items-center justify-between pt-1">
                                  <div className="text-[11px] text-emerald-400 font-medium truncate max-w-[70%]">
                                    <span className="font-bold text-emerald-300">Fix: </span>
                                    &ldquo;{violation.suggested_fix}&rdquo;
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleApplyFix(msg.id, violation)}
                                    disabled={applyingFixId === violation.id}
                                    style={{
                                      backgroundColor: 'rgba(99, 102, 241, 0.2)',
                                      color: 'var(--theme-primary)',
                                      borderColor: 'rgba(99, 102, 241, 0.4)'
                                    }}
                                    className="px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
                                  >
                                    {applyingFixId === violation.id ? (
                                      <div className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                    ) : (
                                      <Wand2 className="h-3 w-3" />
                                    )}
                                    <span>1-Click Apply</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>Zero violations! This post is 100% compliant with Kalambe Devs guidelines and ready to post.</span>
                      </div>
                    )}

                    {/* Published Link Notification */}
                    {publishUrl && (
                      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-400 flex items-center justify-between">
                        <span>🚀 Successfully published to your LinkedIn profile!</span>
                        <a
                          href={publishUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold underline flex items-center gap-1"
                        >
                          <span>View on LinkedIn</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}

                    {/* Action Hub */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--theme-border)]">
                      <div className="flex items-center gap-2">
                        {/* Higher-Up Review Dispatch */}
                        <button
                          type="button"
                          onClick={() => openReviewModal(msg.post!)}
                          style={{ borderColor: 'var(--theme-border)' }}
                          className="px-3.5 py-2 rounded-lg border text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <Send className="h-3.5 w-3.5 text-indigo-400" />
                          <span>Send to Higher-Ups (WhatsApp, Gmail, Teams)</span>
                        </button>
                      </div>

                      {/* 1-Click Publish to LinkedIn */}
                      <button
                        type="button"
                        onClick={() => handlePublishLinkedIn(msg.post!)}
                        disabled={publishingId === msg.post.id}
                        style={{ backgroundColor: '#0A66C2', color: '#ffffff' }}
                        className="px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {publishingId === msg.post.id ? (
                          <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        ) : (
                          <Share2 className="h-3.5 w-3.5" />
                        )}
                        <span>{publishingId === msg.post.id ? 'Publishing...' : 'Publish to LinkedIn'}</span>
                      </button>
                    </div>
                  </div>
                )}

                <div 
                  style={{ color: 'var(--theme-text-secondary)' }}
                  className={`text-[10px] px-1 ${isAi ? 'text-left' : 'text-right'}`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {/* Evaluating Thinking Bubble */}
        {isEvaluating && (
          <div className="flex gap-3 max-w-4xl mx-auto items-start animate-in fade-in duration-200">
            <div 
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                color: 'var(--theme-primary)'
              }}
              className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs"
            >
              <Sparkles className="h-4 w-4 animate-spin" />
            </div>
            <div 
              style={{
                backgroundColor: 'var(--theme-surface)',
                borderColor: 'var(--theme-border)'
              }}
              className="p-4 rounded-2xl rounded-tl-xs border shadow-xs space-y-2 text-xs"
            >
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                <span className="font-bold text-indigo-400">Auditing with Gemini 3.8 Flash & Kalambe Devs pgvector...</span>
              </div>
              <p style={{ color: 'var(--theme-text-secondary)' }} className="text-[11px]">
                Checking brand tone (Attractive & Bold + Clear & Professional), claims substantiation, and competitor policy.
              </p>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* 3. Quick Prompt Chips */}
      <div 
        style={{
          borderColor: 'var(--theme-border)'
        }}
        className="px-4 py-2 border-t flex flex-wrap items-center gap-2 shrink-0 bg-black/10"
      >
        <span style={{ color: 'var(--theme-text-secondary)' }} className="text-[11px] font-bold">Quick test prompts:</span>
        <button
          type="button"
          onClick={() => handleLoadSample('b2b')}
          style={{ borderColor: 'var(--theme-border)' }}
          className="px-2.5 py-1 rounded-md border text-[11px] font-semibold cursor-pointer hover:border-indigo-500 transition-colors"
        >
          ⚡ Kalambe Devs B2B Architecture
        </button>
        <button
          type="button"
          onClick={() => handleLoadSample('claims')}
          style={{ borderColor: 'var(--theme-border)' }}
          className="px-2.5 py-1 rounded-md border text-[11px] font-semibold cursor-pointer hover:border-amber-500 transition-colors"
        >
          ⚠️ Test Competitor & Overclaim Policy
        </button>
        <button
          type="button"
          onClick={() => handleLoadSample('tone')}
          style={{ borderColor: 'var(--theme-border)' }}
          className="px-2.5 py-1 rounded-md border text-[11px] font-semibold cursor-pointer hover:border-purple-500 transition-colors"
        >
          ✍️ Test Weak Tone
        </button>
      </div>

      {/* 4. Chat Input Section */}
      <div 
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)'
        }}
        className="p-3 sm:p-4 border-t shrink-0 space-y-2.5 shadow-lg"
      >
        {/* Attachment Pill */}
        {attachment && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-300 w-fit">
            <FileText className="h-3.5 w-3.5" />
            <span className="font-semibold truncate max-w-xs">{attachment.name}</span>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Text Input Row */}
        <div className="flex items-end gap-2">
          {/* File attach button */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.docx,.pdf,.png,.jpg"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setAttachment(e.target.files[0]);
              }
            }}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              backgroundColor: 'var(--theme-bg)',
              borderColor: 'var(--theme-border)'
            }}
            className="h-10 w-10 rounded-xl border flex items-center justify-center shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
            title="Attach draft file or image creative"
          >
            <Plus className="h-5 w-5 text-slate-400" />
          </button>

          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              rows={2}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Paste draft post or ask FixoraAI to audit your content… (Press Enter to audit, Shift+Enter for newline)"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] text-[var(--theme-text)] placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 resize-none max-h-36"
            />
          </div>

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSendMessage}
            disabled={(!inputMessage.trim() && !attachment) || isEvaluating}
            style={{ backgroundColor: 'var(--theme-primary)', color: '#ffffff' }}
            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Run AI Review"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        {/* Channel & Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5">
            <span style={{ color: 'var(--theme-text-secondary)' }} className="text-[10px] font-bold uppercase tracking-wider">
              Channel:
            </span>
            {(['LinkedIn', 'Twitter', 'Facebook', 'Instagram'] as const).map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setSelectedChannel(ch)}
                style={{
                  backgroundColor: selectedChannel === ch ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  borderColor: selectedChannel === ch ? 'var(--theme-primary)' : 'var(--theme-border)',
                  color: selectedChannel === ch ? 'var(--theme-primary)' : 'var(--theme-text-secondary)'
                }}
                className="px-2.5 py-1 rounded-md border text-[10px] font-bold cursor-pointer transition-colors"
              >
                {ch}
              </button>
            ))}
          </div>

          <div style={{ color: 'var(--theme-text-secondary)' }} className="text-[10px] font-semibold">
            Tone: <span className="text-indigo-400 font-bold">Attractive & Bold + Clear & Professional</span>
          </div>
        </div>
      </div>

      {/* 5. Higher-Up Multi-Channel Review Modal */}
      {showReviewModal && modalPost && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
            className="rounded-2xl border shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div 
              style={{ borderColor: 'var(--theme-border)' }}
              className="p-4 border-b flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div 
                  style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: 'var(--theme-primary)' }}
                  className="h-8 w-8 rounded-lg flex items-center justify-center"
                >
                  <Send className="h-4 w-4" />
                </div>
                <div>
                  <h3 style={{ color: 'var(--theme-text)' }} className="text-sm font-bold">Send to Higher-Ups for Approval</h3>
                  <p style={{ color: 'var(--theme-text-secondary)' }} className="text-[11px]">Dispatch draft & citations via WhatsApp, Gmail, Slack & Teams</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleDispatchReview} className="p-5 overflow-y-auto space-y-4">
              {/* Draft info */}
              <div 
                style={{ borderColor: 'var(--theme-border)' }}
                className="p-3 rounded-xl border bg-black/20"
              >
                <div style={{ color: 'var(--theme-text-secondary)' }} className="text-[10px] font-bold uppercase tracking-wider">
                  Post to Dispatch
                </div>
                <div style={{ color: 'var(--theme-text)' }} className="text-xs font-bold truncate mt-0.5">
                  {modalPost.title}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                    Score: {modalPost.compliance_score || 100}%
                  </span>
                  <span style={{ color: 'var(--theme-text-secondary)' }} className="text-[10px]">
                    Channel: {modalPost.intent_tags?.target_channel || 'LinkedIn'}
                  </span>
                </div>
              </div>

              {/* Channels Selector */}
              <div>
                <label style={{ color: 'var(--theme-text)' }} className="text-[11px] font-bold uppercase tracking-wider block mb-2">
                  Select Dispatch Channels ({reviewChannels.length} active)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {/* WhatsApp */}
                  <div
                    onClick={() => {
                      setReviewChannels((prev) =>
                        prev.includes('WHATSAPP') ? prev.filter((c) => c !== 'WHATSAPP') : [...prev, 'WHATSAPP']
                      );
                    }}
                    style={{
                      borderColor: reviewChannels.includes('WHATSAPP') ? '#10B981' : 'var(--theme-border)',
                      backgroundColor: reviewChannels.includes('WHATSAPP') ? 'rgba(16, 185, 129, 0.1)' : 'transparent'
                    }}
                    className="p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-emerald-500" />
                      <div>
                        <div style={{ color: 'var(--theme-text)' }} className="text-xs font-bold">WhatsApp</div>
                        <div style={{ color: 'var(--theme-text-secondary)' }} className="text-[9px]">Direct mobile alert</div>
                      </div>
                    </div>
                    {reviewChannels.includes('WHATSAPP') && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                  </div>

                  {/* Gmail */}
                  <div
                    onClick={() => {
                      setReviewChannels((prev) =>
                        prev.includes('GMAIL') ? prev.filter((c) => c !== 'GMAIL') : [...prev, 'GMAIL']
                      );
                    }}
                    style={{
                      borderColor: reviewChannels.includes('GMAIL') ? '#EF4444' : 'var(--theme-border)',
                      backgroundColor: reviewChannels.includes('GMAIL') ? 'rgba(239, 68, 68, 0.1)' : 'transparent'
                    }}
                    className="p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-rose-500" />
                      <div>
                        <div style={{ color: 'var(--theme-text)' }} className="text-xs font-bold">Gmail</div>
                        <div style={{ color: 'var(--theme-text-secondary)' }} className="text-[9px]">Executive HTML card</div>
                      </div>
                    </div>
                    {reviewChannels.includes('GMAIL') && <Check className="h-3.5 w-3.5 text-rose-500" />}
                  </div>

                  {/* Slack */}
                  <div
                    onClick={() => {
                      setReviewChannels((prev) =>
                        prev.includes('SLACK') ? prev.filter((c) => c !== 'SLACK') : [...prev, 'SLACK']
                      );
                    }}
                    style={{
                      borderColor: reviewChannels.includes('SLACK') ? '#8B5CF6' : 'var(--theme-border)',
                      backgroundColor: reviewChannels.includes('SLACK') ? 'rgba(139, 92, 246, 0.1)' : 'transparent'
                    }}
                    className="p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-purple-500" />
                      <div>
                        <div style={{ color: 'var(--theme-text)' }} className="text-xs font-bold">Slack</div>
                        <div style={{ color: 'var(--theme-text-secondary)' }} className="text-[9px]">Block Kit Review</div>
                      </div>
                    </div>
                    {reviewChannels.includes('SLACK') && <Check className="h-3.5 w-3.5 text-purple-500" />}
                  </div>

                  {/* Teams */}
                  <div
                    onClick={() => {
                      setReviewChannels((prev) =>
                        prev.includes('TEAMS') ? prev.filter((c) => c !== 'TEAMS') : [...prev, 'TEAMS']
                      );
                    }}
                    style={{
                      borderColor: reviewChannels.includes('TEAMS') ? '#3B82F6' : 'var(--theme-border)',
                      backgroundColor: reviewChannels.includes('TEAMS') ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                    }}
                    className="p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-blue-500" />
                      <div>
                        <div style={{ color: 'var(--theme-text)' }} className="text-xs font-bold">MS Teams</div>
                        <div style={{ color: 'var(--theme-text-secondary)' }} className="text-[9px]">Adaptive Card</div>
                      </div>
                    </div>
                    {reviewChannels.includes('TEAMS') && <Check className="h-3.5 w-3.5 text-blue-500" />}
                  </div>
                </div>
              </div>

              {/* Direct WhatsApp & Email shortcuts */}
              {reviewChannels.includes('WHATSAPP') && (
                <div>
                  <label style={{ color: 'var(--theme-text)' }} className="text-[11px] font-bold block mb-1">
                    Manager WhatsApp Phone Number
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={managerPhone}
                      onChange={(e) => setManagerPhone(e.target.value)}
                      placeholder="+91 98765 43210 or +1..."
                      className="flex-1 px-3 py-2 text-xs rounded-lg border focus:outline-none focus:border-indigo-500"
                    />
                    <a
                      href={`https://wa.me/${managerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, please review this draft post: "${modalPost.title}" on FixoraAI - http://localhost:5173`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shrink-0"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span>Chat</span>
                    </a>
                  </div>
                </div>
              )}

              {reviewChannels.includes('GMAIL') && (
                <div>
                  <label style={{ color: 'var(--theme-text)' }} className="text-[11px] font-bold block mb-1">
                    Manager Email Address
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={managerEmail}
                      onChange={(e) => setManagerEmail(e.target.value)}
                      placeholder="executive@company.com"
                      className="flex-1 px-3 py-2 text-xs rounded-lg border focus:outline-none focus:border-indigo-500"
                    />
                    <a
                      href={`mailto:${managerEmail}?subject=${encodeURIComponent(`[Fixora Review] ${modalPost.title}`)}&body=${encodeURIComponent(`Hi,\n\nPlease review and approve this draft:\n\nTitle: ${modalPost.title}\nCompliance Score: ${modalPost.compliance_score || 100}%\n\nReview link: http://localhost:5173\n\nThanks!`)}`}
                      className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold flex items-center gap-1 shrink-0"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span>Mail</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Confirmation */}
              {dispatchResults && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Dispatched successfully to higher-ups!</span>
                  </div>
                  {dispatchResults.map((r, i) => (
                    <div key={i} className="text-[10px] text-emerald-300">
                      • {r.channel}: {r.status} ({r.recipient})
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div 
                style={{ borderColor: 'var(--theme-border)' }}
                className="flex items-center justify-end gap-2 pt-3 border-t"
              >
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={dispatching || reviewChannels.length === 0}
                  style={{ backgroundColor: 'var(--theme-primary)', color: '#ffffff' }}
                  className="px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs hover:opacity-90 cursor-pointer disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{dispatching ? 'Dispatching...' : 'Dispatch Review'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
