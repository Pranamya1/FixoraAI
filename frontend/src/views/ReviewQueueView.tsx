import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  Send, 
  Plus, 
  X, 
  Share2, 
  Copy, 
  Check, 
  RotateCcw, 
  FileText, 
  CheckCircle2, 
  ExternalLink,
  MessageCircle,
  Mail,
  Mic,
  Clock,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  FileUp,
  BookOpen,
  UploadCloud,
  ShieldAlert,
  ArrowRight,
  Image as ImageIcon
} from 'lucide-react';
import { api } from '../services/api';
import type { Post, AuditReport } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  description?: string;
  attachmentName?: string;
  imageUrl?: string;
  post?: Post;
  auditReport?: AuditReport;
  fixedContent?: string;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string; // ISO
  messages: Message[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'fixora_review_sessions';

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: ChatSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // ignore storage quota errors
  }
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function renderFormattedPost(content: string) {
  const parts = content.split(/(#[a-zA-Z0-9_]+)/g);
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

// ─── Component ───────────────────────────────────────────────────────────────

interface ReviewQueueViewProps {
  onNavigate?: (tab: 'dashboard' | 'generator' | 'review' | 'guidelines' | 'settings') => void;
}

export function ReviewQueueView({ onNavigate }: ReviewQueueViewProps = {}) {
  // ── Session state ──
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions());
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    () => loadSessions()[0]?.id ?? null
  );
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && window.innerWidth < 640) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Active chat state ──
  const [messages, setMessages] = useState<Message[]>(() => {
    const ss = loadSessions();
    const active = ss[0];
    return active ? active.messages : [];
  });
  const [input, setInput] = useState('');
  const [draftText, setDraftText] = useState('');
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [tempDraftInput, setTempDraftInput] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview((ev.target?.result as string) || null);
    };
    reader.readAsDataURL(file);
  };
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishUrl, setPublishUrl] = useState<string | null>(null);

  // ── Guidelines existence state & modal ──
  const [guidelinesCount, setGuidelinesCount] = useState<number | null>(null);
  const [showNoGuidelinesModal, setShowNoGuidelinesModal] = useState(false);
  const [isUploadingGuideline, setIsUploadingGuideline] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingSendText, setPendingSendText] = useState<string | undefined>(undefined);

  useEffect(() => {
    api.getGuidelines()
      .then(items => setGuidelinesCount(items.length))
      .catch(() => setGuidelinesCount(0));
  }, []);

  // ── Dispatch Modal state ──
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [modalPost, setModalPost] = useState<Post | null>(null);
  const [reviewChannels, setReviewChannels] = useState<string[]>(['WHATSAPP', 'GMAIL', 'SLACK', 'TEAMS']);
  const [managerPhone, setManagerPhone] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState<any[] | null>(null);

  // ── Multi-Platform Social Publishing state ──
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishPostItem, setPublishPostItem] = useState<Post | null>(null);
  const [selectedPublishChannels, setSelectedPublishChannels] = useState<string[]>(['LINKEDIN', 'TWITTER', 'SLACK']);
  const [publishResults, setPublishResults] = useState<any[] | null>(null);

  // ── Refs ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const viewContainerRef = useRef<HTMLDivElement>(null);
  const [availableHeight, setAvailableHeight] = useState<number>(0);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  useEffect(() => {
    if (!viewContainerRef.current) return;
    const updateSize = () => {
      if (viewContainerRef.current) {
        setAvailableHeight(viewContainerRef.current.clientHeight);
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(viewContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const pillHeight = availableHeight > 0 ? Math.max(72, Math.round(availableHeight * 0.10)) : 80;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Persist messages → session on every change ──
  const persistMessages = useCallback((msgs: Message[], sessionId: string | null) => {
    if (!sessionId) return;
    setSessions(prev => {
      const updated = prev.map(s =>
        s.id === sessionId
          ? {
              ...s,
              messages: msgs,
              title: msgs.find(m => m.role === 'user')?.content.slice(0, 50) || s.title
            }
          : s
      );
      saveSessions(updated);
      return updated;
    });
  }, []);

  // ── Switch to a session ──
  const switchSession = (id: string) => {
    const sess = sessions.find(s => s.id === id);
    if (!sess) return;
    setActiveSessionId(id);
    setMessages(sess.messages);
    setInput('');
    setAttachment(null);
    setPublishUrl(null);
  };

  // ── New chat — only create a session if the current one already has messages ──
  const startNewChat = () => {
    // If the current active session is already empty, just clear input — don't add a duplicate
    if (activeSessionId) {
      const current = sessions.find(s => s.id === activeSessionId);
      if (current && current.messages.length === 0) {
        setInput('');
        setAttachment(null);
        return;
      }
    }

    const id = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id,
      title: 'New Review',
      createdAt: new Date().toISOString(),
      messages: []
    };
    setSessions(prev => {
      const updated = [newSession, ...prev];
      saveSessions(updated);
      return updated;
    });
    setActiveSessionId(id);
    setMessages([]);
    setInput('');
    setAttachment(null);
    setPublishUrl(null);
  };

  // ── Delete a session ──
  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== id);
      saveSessions(updated);
      return updated;
    });
    if (activeSessionId === id) {
      const remaining = sessions.filter(s => s.id !== id);
      if (remaining.length > 0) {
        switchSession(remaining[0].id);
      } else {
        setActiveSessionId(null);
        setMessages([]);
      }
    }
  };

  // ── Send ──
  const handleSend = async (overrideText?: string, bypassGuidelinesCheck: boolean = false) => {
    const rawInput = (overrideText || input).trim();
    let postCopy = draftText.trim();
    let descriptionText = '';

    if (postCopy && rawInput) {
      descriptionText = rawInput;
    } else if (!postCopy && rawInput) {
      // Auto-extract trailing or leading goal instructions from single chat box input
      const lines = rawInput.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const goalRegex = /^(?:this\s+)?(?:post\s+(?:is\s+)?for|campaign\s+goal[:\s]|goal[:\s]|instruction[:\s]|prompt[:\s]|target[:\s]|audit\s+(?:this\s+)?for|for\s+hir(?:ing|eing)|hir(?:ing|eing)\b)(.*)$/i;

      if (lines.length > 1 && goalRegex.test(lines[lines.length - 1])) {
        descriptionText = lines[lines.length - 1];
        postCopy = rawInput.slice(0, rawInput.lastIndexOf(lines[lines.length - 1])).trim();
      } else if (lines.length > 1 && goalRegex.test(lines[0])) {
        descriptionText = lines[0];
        postCopy = rawInput.slice(lines[0].length).trim();
      } else {
        postCopy = rawInput;
        descriptionText = '';
      }
    }

    if (!postCopy && !attachment && !imageFile) return;

    // Check if guidelines exist, unless user explicitly chose to continue without
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
        setPendingSendText(overrideText);
        setShowNoGuidelinesModal(true);
        return;
      }
    }

    // Ensure we have an active session
    let sessionId = activeSessionId;
    if (!sessionId) {
      const id = `session-${Date.now()}`;
      const newSession: ChatSession = {
        id,
        title: (descriptionText || postCopy || imageFile?.name || 'New Review').slice(0, 50),
        createdAt: new Date().toISOString(),
        messages: []
      };
      setSessions(prev => {
        const updated = [newSession, ...prev];
        saveSessions(updated);
        return updated;
      });
      sessionId = id;
      setActiveSessionId(id);
    }

    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now()}`;
    const displayContent = postCopy || (imageFile ? `Attached creative graphic: ${imageFile.name}` : (attachment ? `Uploaded file: ${attachment.name}` : ''));

    // Upload image if present to obtain server URL & base64 preview
    let uploadedImageUrl: string | undefined = undefined;
    let imagePreviewUri: string | undefined = imagePreview || undefined;

    if (imageFile) {
      try {
        const uploadRes = await api.uploadAuditImage(imageFile);
        uploadedImageUrl = uploadRes.image_url;
        if (uploadRes.data_uri) {
          imagePreviewUri = uploadRes.data_uri;
        }
      } catch (e) {
        console.warn('Image upload error, fallback to local data URI:', e);
      }
    }

    const userMsg: Message = {
      id: userMessageId,
      role: 'user',
      content: displayContent,
      description: descriptionText || undefined,
      attachmentName: imageFile ? imageFile.name : attachment?.name,
      imageUrl: imagePreviewUri
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    persistMessages(nextMessages, sessionId);

    setInput('');
    setDraftText('');
    setAttachment(null);
    setImageFile(null);
    setImagePreview(null);
    setLoading(true);

    try {
      const title = displayContent.slice(0, 50).replace(/\n/g, ' ') + (displayContent.length > 50 ? '...' : '');
      const createdPost = await api.createPost({
        title,
        body: displayContent,
        image_url: uploadedImageUrl || (imagePreviewUri?.startsWith('data:') ? imagePreviewUri : undefined),
        intent_tags: {
          target_channel: 'LinkedIn',
          target_audience: 'B2B Decision Makers',
          campaign_goal: descriptionText || 'Campaign Content',
          user_description: descriptionText || '',
          intended_tone: 'Attractive & Bold',
          category: 'Social Content'
        } as any
      });

      const report = await api.evaluatePost(createdPost.id);

      const updatedPost: Post = {
        ...createdPost,
        compliance_score: report.compliance_score,
        status: report.verdict === 'APPROVED' ? 'APPROVED' : 'ACTION_REQUIRED'
      };

      let polished = displayContent;
      if (report.violations && report.violations.length > 0) {
        for (const v of report.violations) {
          if (v.offending_fragment && v.suggested_fix) {
            polished = polished.replace(v.offending_fragment, v.suggested_fix);
          }
        }
      }

      const assistantMsg: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: report.summary || "I've reviewed your post against the brand guidelines.",
        imageUrl: imagePreviewUri,
        post: updatedPost,
        auditReport: report,
        fixedContent: polished !== displayContent ? polished : undefined
      };

      const finalMessages = [...nextMessages, assistantMsg];
      setMessages(finalMessages);
      persistMessages(finalMessages, sessionId);

    } catch (err: any) {
      const errMsg: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: `Sorry, I couldn't audit the post right now: ${err.message || 'Server error'}. Please verify the backend is running.`
      };
      const finalMessages = [...nextMessages, errMsg];
      setMessages(finalMessages);
      persistMessages(finalMessages, sessionId);
    } finally {
      setLoading(false);
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
      // Immediately proceed with audit
      await handleSend(pendingSendText, true);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload guideline file');
    } finally {
      setIsUploadingGuideline(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openPublishModal = (post: Post) => {
    setPublishPostItem(post);
    setPublishResults(null);
    setShowPublishModal(true);
  };

  const handleTogglePublishChannel = (ch: string) => {
    setSelectedPublishChannels(prev => 
      prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]
    );
  };

  const handleExecutePublish = async () => {
    if (!publishPostItem || selectedPublishChannels.length === 0) return;
    setPublishingId(publishPostItem.id);
    try {
      if (publishPostItem.body) {
        navigator.clipboard.writeText(publishPostItem.body);
      }
      const res = await api.publishPost(publishPostItem.id, selectedPublishChannels);
      const items = Array.isArray(res) ? res : (res.results || []);
      setPublishResults(items);
      const li = items.find((r: any) => r.platform === 'LINKEDIN');
      if (li?.external_url) {
        setPublishUrl(li.external_url);
      }
    } catch (err: any) {
      alert('Failed to publish post: ' + err.message);
    } finally {
      setPublishingId(null);
    }
  };

  const openDispatchModal = (post: Post) => {
    setModalPost(post);
    setDispatchSuccess(null);
    setShowReviewModal(true);
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalPost || reviewChannels.length === 0) return;
    setDispatching(true);
    try {
      const payload: any = {
        post_id: modalPost.id,
        channels: reviewChannels,
        reviewer_notes: `Manager review requested for "${modalPost.title}". Score: ${modalPost.compliance_score || 100}%`
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

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div ref={viewContainerRef} className="relative flex h-full w-full bg-white text-slate-900 overflow-hidden">

      {/* ── Mobile History Drawer Backdrop ── */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* ── History Sidebar ── */}
      <aside
        style={{
          width: sidebarOpen ? (isMobile ? '260px' : '220px') : '0px',
          minWidth: sidebarOpen ? (isMobile ? '260px' : '220px') : '0px',
          transition: 'width 0.2s ease, min-width 0.2s ease',
          overflow: 'hidden',
          borderRight: sidebarOpen ? '1px solid #E2E8F0' : 'none',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0
        }}
        className={isMobile && sidebarOpen ? 'fixed inset-y-0 left-0 z-40 shadow-2xl h-full' : 'relative'}
      >
        {/* Sidebar Header — same height as main chat header */}
        <div className="h-[49px] flex items-center justify-between px-3 border-b border-slate-200 shrink-0 bg-[#F8FAFC]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            History
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={startNewChat}
              title="New Chat"
              className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            {isMobile && (
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                title="Close History"
                className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto py-1.5 space-y-0.5 px-1.5">
          {sessions.length === 0 ? (
            <div className="px-2 py-6 text-center">
              <Clock className="h-5 w-5 text-slate-300 mx-auto mb-2" />
              <p className="text-[11px] text-slate-400">No history yet</p>
            </div>
          ) : (
            sessions.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => switchSession(s.id)}
                className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors cursor-pointer group flex items-start justify-between gap-1.5 ${
                  s.id === activeSessionId
                    ? 'bg-blue-50 text-blue-900'
                    : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold truncate leading-tight">
                    {s.title}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {formatRelative(s.createdAt)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => deleteSession(s.id, e)}
                  className="opacity-0 group-hover:opacity-100 h-5 w-5 shrink-0 rounded flex items-center justify-center hover:text-rose-600 transition-all cursor-pointer mt-0.5"
                  title="Delete session"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* ── Main Chat Area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-white">

        {/* Header — fixed height matches sidebar header exactly */}
        <header className="h-[49px] px-3 sm:px-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Toggle sidebar button */}
            <button
              type="button"
              onClick={() => setSidebarOpen(o => !o)}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              title={sidebarOpen ? 'Hide history' : 'Show history'}
            >
              {sidebarOpen
                ? <PanelLeftClose className="h-4 w-4" />
                : <PanelLeftOpen className="h-4 w-4" />
              }
            </button>
            <span className="font-bold text-sm text-slate-900 tracking-tight whitespace-nowrap">FixoraAI</span>
            <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full border border-slate-200 text-slate-500 font-medium whitespace-nowrap">
              Post Review
            </span>
          </div>

          <button
            type="button"
            onClick={startNewChat}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 whitespace-nowrap shrink-0"
            title="New Review Session"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            <span>New Chat</span>
          </button>
        </header>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-6 bg-white">
          {messages.length === 0 ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-16">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs mx-auto">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  What would you like to review?
                </h2>
                <p className="text-xs text-slate-500 mt-1.5 max-w-md leading-relaxed mx-auto">
                  Upload or paste your post draft below, then specify your campaign goal to audit tone, legal compliance, and goal alignment.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTempDraftInput(draftText);
                  setShowDraftModal(true);
                }}
                className="mt-2 px-4 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
              >
                <FileText className="h-4 w-4" />
                <span>{draftText ? 'Edit Attached Post Draft' : 'Attach Post Draft to Audit'}</span>
              </button>
            </div>
          ) : (
            /* Message Thread */
            <div className="w-full space-y-6">
              {messages.map((m) => {
                const isUser = m.role === 'user';

                return (
                  <div key={m.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                      <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold shadow-xs">
                        <Sparkles className="h-4 w-4" />
                      </div>
                    )}

                    <div className={`space-y-3 ${isUser ? 'max-w-[85%] w-full' : 'max-w-[90%] w-full'}`}>
                      {isUser ? (
                        <div className="space-y-2">
                          {/* Goal / Description prompt chip */}
                          {m.description && (
                            <div className="flex items-start gap-2 text-xs bg-slate-100 border border-slate-300 px-3.5 py-2 rounded-xl text-slate-700 w-fit ml-auto shadow-2xs">
                              <span className="font-bold text-slate-900 shrink-0">🎯 Goal:</span>
                              <span className="italic text-slate-800">&ldquo;{m.description}&rdquo;</span>
                            </div>
                          )}

                          {/* Styled Social Post Card */}
                          <div className="rounded-2xl border border-slate-300 bg-white shadow-xs overflow-hidden text-left">
                          {/* Post Card Header */}
                          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-md bg-[#0A66C2] text-white font-bold text-[10px] flex items-center justify-center">
                                in
                              </div>
                              <span className="font-bold text-slate-900 text-xs">Draft Post</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                                LinkedIn
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500">
                              <span>
                                {m.content.trim().split(/\s+/).filter(Boolean).length} words • {m.content.length} chars
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(m.content, m.id)}
                                className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                title="Copy post text"
                              >
                                {copiedId === m.id ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Post Body with multi-line paragraph formatting */}
                          <div className="p-4 text-xs leading-relaxed text-slate-800 whitespace-pre-wrap select-text font-normal">
                            {renderFormattedPost(m.content)}
                          </div>

                          {/* Attached Visual Creative */}
                          {m.imageUrl && (
                            <div className="border-t border-slate-200 p-3 bg-slate-50/80 flex items-center gap-3">
                              <img
                                src={m.imageUrl}
                                alt="Attached Creative"
                                className="h-16 w-16 rounded-lg object-cover border border-slate-300 shadow-2xs shrink-0"
                              />
                              <div className="text-xs min-w-0">
                                <span className="font-bold text-slate-800 block truncate">
                                  {m.attachmentName || 'Visual Brand Graphic'}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[10px] text-indigo-700 font-semibold mt-0.5">
                                  <Sparkles className="h-3 w-3" /> Audited with Gemini Vision
                                </span>
                              </div>
                            </div>
                          )}

                          {m.attachmentName && !m.imageUrl && (
                            <div className="px-4 py-2 bg-slate-50/70 border-t border-slate-200 flex items-center gap-1.5 text-[11px] text-blue-700 font-medium">
                              <FileText className="h-3.5 w-3.5" />
                              <span>{m.attachmentName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                        <div className="pt-1 pb-1 text-slate-800 text-xs leading-relaxed whitespace-pre-wrap">
                          {m.content}
                        </div>
                      )}

                      {/* AI Assessment Card */}
                      {!isUser && m.post && (
                        <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 shadow-xs space-y-4">
                          {/* Score & Verdict */}
                          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                            <div className="flex items-center gap-2">
                              <span 
                                className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                                  (m.post.compliance_score || 0) >= 90
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : (m.post.compliance_score || 0) >= 70
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                              >
                                <span>{m.post.compliance_score || 0}%</span>
                                <span>•</span>
                                <span>
                                  {(m.post.compliance_score || 0) >= 90 
                                    ? 'Brand Compliant' 
                                    : (m.post.compliance_score || 0) >= 70
                                      ? 'Action Required'
                                      : 'Rejected'}
                                </span>
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopy(m.fixedContent || m.post?.body || '', m.id)}
                              className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer text-xs flex items-center gap-1"
                              title="Copy text"
                            >
                              {copiedId === m.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                              <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>

                          {/* Violations */}
                          {m.auditReport?.violations && m.auditReport.violations.length > 0 ? (
                            <div className="space-y-2.5">
                              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                                Points to improve ({m.auditReport.violations.length}):
                              </div>
                              {m.auditReport.violations.map((v) => (
                                <div 
                                  key={v.id} 
                                  className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 space-y-1.5 text-xs text-slate-800"
                                >
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-bold text-amber-900">{v.rule_title}</span>
                                    <span className="text-slate-500 font-medium">
                                      {v.document_name} • p.{v.page_ref}
                                    </span>
                                  </div>
                                  <div className="text-rose-700 font-semibold text-[11px]">
                                    &ldquo;{v.offending_fragment}&rdquo;
                                  </div>
                                  <div className="text-slate-600 text-[11px] leading-relaxed">
                                    {v.violation_explanation}
                                  </div>
                                  <div className="text-emerald-700 font-bold text-[11px]">
                                    Suggestion: &ldquo;{v.suggested_fix}&rdquo;
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 py-1">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              <span>This post meets all your brand guidelines!</span>
                            </div>
                          )}

                          {/* Multimodal Gemini Vision Visual Inspection Card */}
                          {m.auditReport?.visual_audit && (
                            <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/70 space-y-2.5 text-xs shadow-2xs">
                              <div className="flex items-center justify-between text-[11px] font-bold">
                                <span className="flex items-center gap-1.5 text-indigo-950">
                                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                                  Multimodal Visual Brand Inspection (Gemini Vision)
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold border border-indigo-200">
                                  {m.auditReport.visual_audit.image_text_alignment || 'Aligned'}
                                </span>
                              </div>

                              <div className="flex gap-3 items-start">
                                {(m.imageUrl || m.post?.image_url) && (
                                  <img
                                    src={m.imageUrl || m.post?.image_url}
                                    alt="Audited creative"
                                    className="h-14 w-14 rounded-lg object-cover border border-indigo-200 shrink-0 shadow-2xs"
                                  />
                                )}
                                {m.auditReport.visual_audit.visual_summary && (
                                  <p className="text-[11px] text-slate-700 leading-relaxed italic bg-white/90 p-2.5 rounded-lg border border-indigo-100 flex-1">
                                    &ldquo;{m.auditReport.visual_audit.visual_summary}&rdquo;
                                  </p>
                                )}
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[10px]">
                                <div className="p-2 rounded-lg bg-white border border-indigo-100">
                                  <span className="text-slate-400 block font-medium">Brand Palette</span>
                                  <span className={`font-bold ${m.auditReport.visual_audit.palette_compliance === 'Compliant' ? 'text-emerald-700' : 'text-amber-700'}`}>
                                    {m.auditReport.visual_audit.palette_compliance || 'Compliant'}
                                  </span>
                                </div>
                                <div className="p-2 rounded-lg bg-white border border-indigo-100">
                                  <span className="text-slate-400 block font-medium">Typography</span>
                                  <span className="font-bold text-slate-800">
                                    {m.auditReport.visual_audit.typography_legibility || 'High'}
                                  </span>
                                </div>
                                <div className="p-2 rounded-lg bg-white border border-indigo-100">
                                  <span className="text-slate-400 block font-medium">Layout Balance</span>
                                  <span className="font-bold text-slate-800">
                                    {m.auditReport.visual_audit.layout_balance || 'Balanced'}
                                  </span>
                                </div>
                                <div className="p-2 rounded-lg bg-white border border-indigo-100">
                                  <span className="text-slate-400 block font-medium">Copy Alignment</span>
                                  <span className="font-bold text-indigo-700">
                                    {m.auditReport.visual_audit.image_text_alignment || 'Aligned'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Polished Version */}
                          {m.fixedContent && (
                            <div className="pt-2 border-t border-slate-200 space-y-1.5">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                                Polished Compliant Version:
                              </span>
                              <div className="p-3.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 whitespace-pre-wrap leading-relaxed select-all">
                                {m.fixedContent}
                              </div>
                            </div>
                          )}

                          {/* Published notification */}
                          {publishUrl && (
                            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700 flex items-center justify-between">
                              <span>🚀 Published to LinkedIn!</span>
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

                            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200">
                              <button
                                type="button"
                                onClick={() => openDispatchModal(m.post!)}
                                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0"
                              >
                                Send for Review
                              </button>

                              <button
                                type="button"
                                onClick={() => openPublishModal(m.post!)}
                                disabled={publishingId === m.post.id}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-[#0A66C2] hover:bg-[#084e96] flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                              >
                                <Share2 className="h-3.5 w-3.5 shrink-0" />
                                <span>{publishingId === m.post.id ? 'Publishing...' : 'Publish to Channels'}</span>
                              </button>
                            </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex gap-3 items-center text-xs text-slate-500">
                  <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 animate-spin" />
                  </div>
                  <span>Auditing post against brand guidelines...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="w-full px-3 sm:px-6 pb-20 lg:pb-4 pt-1 shrink-0 bg-white flex flex-col justify-end space-y-2">
          
          {/* Post Draft Dock: Attached State or Call to Action */}
          {draftText ? (
            <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-blue-50/80 border border-blue-200 text-xs text-slate-800 shadow-2xs gap-2">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="h-7 w-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-950 text-xs">Attached Post Draft</span>
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-blue-100 text-blue-800 font-medium">
                      {draftText.trim().split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 truncate mt-0.5">
                    {draftText.replace(/\n+/g, ' ')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setTempDraftInput(draftText);
                    setShowDraftModal(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setDraftText('')}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Remove attached draft"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between px-3 sm:px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs gap-2">
              <div className="flex items-center gap-1.5 text-slate-600 truncate min-w-0">
                <span className="text-[11px] font-bold text-slate-700 shrink-0">Post Draft:</span>
                <span className="text-[11px] text-slate-500 truncate hidden sm:inline">Attach post copy to audit against rules</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTempDraftInput('');
                  setShowDraftModal(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-white border border-blue-300 hover:bg-blue-50 text-blue-700 font-bold text-[11px] sm:text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Attach / Paste Draft</span>
              </button>
            </div>
          )}

          {attachment && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs text-blue-700 w-fit">
              <FileText className="h-3.5 w-3.5" />
              <span className="font-medium truncate max-w-xs">{attachment.name}</span>
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="hover:text-rose-600 transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Creative Image Attached Chip */}
          {imagePreview && (
            <div className="flex items-center justify-between px-3 sm:px-4 py-2 rounded-2xl bg-indigo-50/90 border border-indigo-200 text-xs text-slate-800 shadow-2xs gap-2">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <img
                  src={imagePreview}
                  alt="Creative graphic preview"
                  className="h-8 w-8 rounded-lg object-cover border border-indigo-200 shadow-2xs shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-950 text-xs">Attached Creative Graphic</span>
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-indigo-100 text-indigo-800 font-bold border border-indigo-200">
                      Gemini Vision
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 truncate mt-0.5">
                    {imageFile?.name} {imageFile ? `(${(imageFile.size / 1024).toFixed(0)} KB)` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(null);
                }}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                title="Remove attached image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Gemini Pill – Multi-line Auto-expanding Goal / Prompt Input */}
          <div
            style={{ 
              minHeight: `${pillHeight}px`,
              backgroundColor: '#F0F4F9'
            }}
            className="w-full rounded-3xl border border-slate-300 shadow-xs flex items-center px-5 py-2.5 gap-3.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all"
          >
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.docx,.pdf,.png,.jpg"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  const file = e.target.files[0];
                  if (file.name.endsWith('.txt') || file.type.includes('text')) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const text = (ev.target?.result as string) || '';
                      setDraftText(text);
                      setTempDraftInput(text);
                    };
                    reader.readAsText(file);
                  } else if (file.type.startsWith('image/')) {
                    handleImageSelect(file);
                  } else {
                    setAttachment(file);
                  }
                }
              }}
              className="hidden"
            />

            {/* Hidden image input for direct graphic attachment */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/jpg"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleImageSelect(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            {/* + button opens Post Draft Modal */}
            <button
              type="button"
              onClick={() => {
                setTempDraftInput(draftText);
                setShowDraftModal(true);
              }}
              className="h-10 w-10 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 transition-colors cursor-pointer shrink-0 self-center"
              title="Attach post draft or upload file"
            >
              <Plus className="h-6 w-6" strokeWidth={1.75} />
            </button>

            {/* Image attachment button for Gemini Vision audit */}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 self-center ${
                imagePreview ? 'text-indigo-600 bg-indigo-100' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
              }`}
              title="Attach post graphic / banner (.png, .jpg) for Gemini Vision audit"
            >
              <ImageIcon className="h-5 w-5" strokeWidth={1.75} />
            </button>

            {/* Multi-line auto-expanding Textarea for Description / Campaign Goal */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                draftText
                  ? "Enter campaign goal or description (e.g. 'this post is for hiring C developers for our new game')..."
                  : "Enter campaign goal or description (or attach a draft post above)..."
              }
              rows={1}
              style={{
                backgroundColor: 'transparent',
                outline: 'none',
                border: 'none',
                boxShadow: 'none',
                resize: 'none',
                maxHeight: '180px'
              }}
              className="flex-1 transparent-input text-[15px] leading-relaxed text-slate-900 placeholder:text-slate-500 font-normal py-1.5 focus:outline-none focus:ring-0 focus:border-none"
            />

            {/* Mic & Send */}
            <div className="flex items-center gap-2 shrink-0 self-center">
              <button
                type="button"
                className="h-10 w-10 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 transition-colors cursor-pointer"
                title="Voice Input"
              >
                <Mic className="h-5 w-5" strokeWidth={1.75} />
              </button>

              {(input.trim() || draftText.trim() || attachment) && (
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={loading}
                  className="h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  title="Send (Enter)"
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <p className="text-[10px] text-center text-slate-400 mt-1.5">
            FixoraAI audits posts against official brand rules. Always review before publishing.
          </p>
        </div>
      </div>

      {/* ── Add / Edit Post Draft Modal ── */}
      {showDraftModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col text-xs text-slate-800">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Upload or Paste Post Draft</h3>
                  <p className="text-[11px] text-slate-500">
                    FixoraAI will preserve all lines, emojis, and hashtags for auditing
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDraftModal(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="font-bold block mb-1 text-[11px] uppercase tracking-wider text-slate-600">
                  Post Copy
                </label>
                <textarea
                  value={tempDraftInput}
                  onChange={(e) => setTempDraftInput(e.target.value)}
                  placeholder="Paste your full LinkedIn post, tweet, or draft here...&#10;&#10;🚀 We're Hiring at FixoraAI!&#10;&#10;We're looking for:&#10;🧠 AI/ML Engineers&#10;..."
                  rows={10}
                  className="w-full p-3.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs text-slate-900 placeholder:text-slate-400 leading-relaxed font-normal resize-y select-text"
                />
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                  <span>
                    {tempDraftInput.trim().split(/\s+/).filter(Boolean).length} words • {tempDraftInput.length} characters
                  </span>
                  {tempDraftInput && (
                    <button
                      type="button"
                      onClick={() => setTempDraftInput('')}
                      className="text-slate-500 hover:text-rose-600 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* File upload option */}
              <div className="p-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileUp className="h-5 w-5 text-slate-500" />
                  <div>
                    <div className="font-semibold text-slate-800 text-[11px]">Upload from document</div>
                    <div className="text-[10px] text-slate-500">Supports .txt, .docx, .pdf, or images</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
                >
                  Choose File
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2.5 p-4 border-t border-slate-200 bg-slate-50/60">
              <button
                type="button"
                onClick={() => setShowDraftModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 font-semibold cursor-pointer text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftText(tempDraftInput);
                  setShowDraftModal(false);
                }}
                disabled={!tempDraftInput.trim() && !attachment}
                className="px-5 py-2 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 cursor-pointer text-xs shadow-xs transition-colors"
              >
                Attach Post Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dispatch Modal ── */}
      {showReviewModal && modalPost && (
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
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                <div className="text-[10px] font-bold uppercase text-slate-500">Post</div>
                <div className="font-semibold truncate text-slate-900 mt-0.5">{modalPost.title}</div>
                <div className="text-[11px] text-emerald-700 font-bold mt-1">Score: {modalPost.compliance_score || 100}%</div>
              </div>

              <div>
                <label className="font-bold block mb-2 uppercase text-[10px] text-slate-600 tracking-wider">
                  Select Higher-Up Review Channels
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { id: 'GMAIL', name: 'Gmail / Executive Email', badge: 'Responsive HTML Card', color: '#EA4335', icon: '✉️' },
                    { id: 'WHATSAPP', name: 'WhatsApp Alert', badge: 'Instant Mobile Link', color: '#25D366', icon: '💬' },
                    { id: 'SLACK', name: 'Slack Review Hub', badge: 'Block Kit Card', color: '#4A154B', icon: '#' },
                    { id: 'TEAMS', name: 'Microsoft Teams', badge: 'Connector Card', color: '#6264A7', icon: 'T' }
                  ].map((ch) => {
                    const selected = reviewChannels.includes(ch.id as any);
                    return (
                      <div
                        key={ch.id}
                        onClick={() => setReviewChannels((prev) => selected ? prev.filter((c) => c !== ch.id) : [...prev, ch.id as any])}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          selected
                            ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500/30'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div 
                            style={{ backgroundColor: ch.color }}
                            className="h-7 w-7 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs"
                          >
                            {ch.icon}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-900">{ch.name}</div>
                            <div className="text-[10px] text-slate-500">{ch.badge}</div>
                          </div>
                        </div>
                        <div className={`h-4 w-4 rounded border flex items-center justify-center ${
                          selected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
                        }`}>
                          {selected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
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
                      href={`https://wa.me/${managerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, please review this draft on FixoraAI: "${modalPost.title}" - ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'}`)}`}
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
                      href={`mailto:${managerEmail}?subject=${encodeURIComponent(`[Review] ${modalPost.title}`)}&body=${encodeURIComponent(`Hi,\n\nPlease review this draft on FixoraAI:\n\nTitle: ${modalPost.title}\nScore: ${modalPost.compliance_score || 100}%\n\nLink: ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'}`)}`}
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
                  <p className="text-xs text-slate-500 mt-0.5">Choose how you'd like to proceed with audit</p>
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
              FixoraAI audits your posts against your official brand guidelines (voice, claims, competitor rules, and formatting). Currently, no guidelines have been added to your workspace.
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
                      <p className="text-[11px] text-slate-500 mt-0.5">Upload a PDF or document to index your official rules</p>
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
                  handleSend(pendingSendText, true);
                }}
                disabled={isUploadingGuideline}
                className="w-full p-3.5 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 transition-colors cursor-pointer text-left flex items-center justify-between group disabled:opacity-50"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Continue Without Guidelines</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Audit using universal baseline brand policies & legal checks</p>
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

      {/* ── Multi-Platform Social Publishing Modal ── */}
      {showPublishModal && publishPostItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col text-xs text-slate-800">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#009DFF] text-white flex items-center justify-center shadow-xs">
                  <Share2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Publish to Social Channels</h3>
                  <p className="text-[11px] text-slate-500">
                    Direct automated dispatch to connected enterprise channels
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-200/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Post Preview Card */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Draft Content</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                    {publishPostItem.compliance_score || 100}% Brand Compliant
                  </span>
                </div>
                <div className="font-bold text-slate-900 truncate text-xs">{publishPostItem.title}</div>
                <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed">
                  {publishPostItem.body}
                </p>
                {publishPostItem.image_url && (
                  <div className="flex items-center gap-2 pt-1 text-[10px] text-indigo-700 font-semibold">
                    <ImageIcon className="h-3.5 w-3.5" />
                    <span>Visual banner asset attached & verified</span>
                  </div>
                )}
              </div>

              {/* Channels Selector */}
              <div>
                <label className="font-bold block mb-2 uppercase text-[10px] text-slate-600 tracking-wider">
                  Select Target Channels
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'LINKEDIN', name: 'LinkedIn Company & Personal Feed', badge: '1-Click UGC Share', color: '#0A66C2' },
                    { id: 'TWITTER', name: 'Twitter / X Feed', badge: 'Direct Tweet Dispatch', color: '#000000' },
                    { id: 'INSTAGRAM', name: 'Instagram Creative Feed', badge: 'Visual Creative Broadcast', color: '#E4405F' },
                    { id: 'FACEBOOK', name: 'Facebook Enterprise Page', badge: 'Page Feed & Stories', color: '#1877F2' },
                    { id: 'SLACK', name: 'Slack Marketing Channel', badge: 'Instant Webhook Broadcast', color: '#4A154B' }
                  ].map((ch) => {
                    const selected = selectedPublishChannels.includes(ch.id);
                    return (
                      <div
                        key={ch.id}
                        onClick={() => handleTogglePublishChannel(ch.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          selected
                            ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500/30'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div 
                            style={{ backgroundColor: ch.color }}
                            className="h-7 w-7 rounded-lg text-white font-bold text-[10px] flex items-center justify-center shrink-0"
                          >
                            {ch.id === 'LINKEDIN' ? 'in' : ch.id === 'TWITTER' ? '𝕏' : ch.id === 'INSTAGRAM' ? 'IG' : ch.id === 'FACEBOOK' ? 'fb' : '#'}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-900">{ch.name}</div>
                            <div className="text-[10px] text-slate-500">{ch.badge}</div>
                          </div>
                        </div>
                        <div className={`h-4 w-4 rounded border flex items-center justify-center ${
                          selected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
                        }`}>
                          {selected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Success Result View */}
              {publishResults && (
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 space-y-2.5 animate-in fade-in">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Post Successfully Dispatched & Published!</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Content was copied to your clipboard. Click below to view on each platform:
                  </p>
                  <div className="space-y-1.5 pt-1">
                    {publishResults.map((r, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white border border-emerald-100 text-[11px]">
                        <span className="font-bold text-slate-800">{r.platform}</span>
                        {r.external_url ? (
                          <a
                            href={r.external_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline font-semibold flex items-center gap-1"
                          >
                            <span>Open on {r.platform}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-emerald-700 font-semibold">Dispatched</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2.5 p-4 border-t border-slate-200 bg-slate-50/60">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 font-semibold cursor-pointer text-xs transition-colors"
              >
                {publishResults ? 'Close' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleExecutePublish}
                disabled={publishingId === publishPostItem.id || selectedPublishChannels.length === 0}
                style={{ backgroundColor: '#009DFF' }}
                className="px-5 py-2 rounded-xl font-bold text-white hover:opacity-90 disabled:opacity-50 cursor-pointer text-xs shadow-xs transition-all flex items-center gap-1.5"
              >
                {publishingId === publishPostItem.id ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5" />
                    <span>{publishResults ? 'Re-Publish' : `Publish (${selectedPublishChannels.length})`}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
