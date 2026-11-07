import type {
  Post,
  AuditReport,
  EmployeeAnalyticsDashboardResponse,
  EmployeeDetailAnalytics,
  GenerationRequest,
  GenerationResponse,
  ConnectedAccount
} from '../types';

const API_BASE = 'http://localhost:8000/api';
const LOCAL_GUIDELINES_KEY = 'fixora_local_guidelines';

function rememberGuideline(item: any) {
  try {
    const items = JSON.parse(localStorage.getItem(LOCAL_GUIDELINES_KEY) || '[]');
    localStorage.setItem(LOCAL_GUIDELINES_KEY, JSON.stringify([item, ...items.filter((existing: any) => existing.id !== item.id)]));
  } catch { /* local cache is optional */ }
}

async function requestError(res: Response, fallback: string): Promise<Error> {
  let detail = '';
  try {
    const body = await res.json();
    detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail || body);
  } catch { detail = res.statusText; }
  return new Error(`${fallback} (${res.status})${detail ? `: ${detail}` : ''}`);
}

export const api = {
  // --- Analytics & Employee Mistake Tracker ---
  async getEmployeeAnalytics(): Promise<EmployeeAnalyticsDashboardResponse> {
    const res = await fetch(`${API_BASE}/analytics/employees`);
    if (!res.ok) throw new Error('Failed to load employee analytics');
    return res.json();
  },

  async getEmployeeDetail(userId: string): Promise<EmployeeDetailAnalytics> {
    const res = await fetch(`${API_BASE}/analytics/employees/${userId}`);
    if (!res.ok) throw new Error('Failed to load employee details');
    return res.json();
  },

  async getOverviewAnalytics(): Promise<any> {
    const res = await fetch(`${API_BASE}/analytics/overview`);
    if (!res.ok) throw new Error('Failed to load overview analytics');
    return res.json();
  },

  // --- Posts & Drafts ---
  async getPosts(status?: string, channel?: string): Promise<Post[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (channel) params.append('channel', channel);
    const res = await fetch(`${API_BASE}/posts?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to load posts');
    return res.json();
  },

  async getPost(postId: string): Promise<Post> {
    const res = await fetch(`${API_BASE}/posts/${postId}`);
    if (!res.ok) throw new Error('Failed to load post');
    return res.json();
  },

  async createPost(postData: Partial<Post>): Promise<Post> {
    const res = await fetch(`${API_BASE}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData)
    });
    if (!res.ok) throw new Error('Failed to create post');
    return res.json();
  },

  // --- Audit & AI Compliance ---
  async evaluatePost(postId: string): Promise<AuditReport> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(`${API_BASE}/audit/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('Failed to evaluate compliance');
      return res.json();
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Compliance evaluation timed out. Please try again.');
      }
      throw err;
    }
  },

  async getLatestAuditReport(postId: string): Promise<AuditReport | null> {
    const res = await fetch(`${API_BASE}/audit/reports/${postId}`);
    if (!res.ok) return null;
    return res.json();
  },

  async applyOneClickFix(payload: {
    post_id: string;
    violation_id: string;
    suggested_fix: string;
    offending_fragment: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/audit/apply-fix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to apply fix');
    return res.json();
  },

  async sendForReview(payload: {
    post_id: string;
    channels?: string[];
    recipient_emails?: string[];
    recipient_phones?: string[];
    reviewer_notes?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/audit/send-for-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to send review request');
    return res.json();
  },

  async approvePost(postId: string, approverName = 'Executive Reviewer'): Promise<any> {
    const res = await fetch(`${API_BASE}/audit/actions/approve?post_id=${postId}&approver_name=${encodeURIComponent(approverName)}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to approve post');
    return res.json();
  },

  // --- Multimodal Generator ---
  async generateContent(payload: GenerationRequest): Promise<GenerationResponse> {
    const res = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to generate content');
    return res.json();
  },

  // --- Connected Accounts & Channels ---
  async getConnectedAccounts(): Promise<{ connected_accounts: ConnectedAccount[]; available_platforms: string[]; review_channels: any }> {
    const res = await fetch(`${API_BASE}/channels`);
    if (!res.ok) throw new Error('Failed to load connected accounts');
    return res.json();
  },

  async initiateConnect(platform: string): Promise<{ auth_url: string }> {
    const res = await fetch(`${API_BASE}/channels/connect/${platform}`);
    if (!res.ok) throw new Error('Failed to initiate account connection');
    return res.json();
  },

  async disconnectAccount(platform: string): Promise<any> {
    const res = await fetch(`${API_BASE}/channels/${platform}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to disconnect account');
    return res.json();
  },

  async publishPost(postId: string, platforms: string[]): Promise<any> {
    const res = await fetch(`${API_BASE}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: postId, platforms })
    });
    if (!res.ok) throw new Error('Failed to publish post');
    return res.json();
  },

  // --- Guidelines Ingestion ---
  async getGuidelines(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/guidelines`);
      if (res.ok) {
        const serverItems = await res.json();
        // Server is primary source of truth for RAG indexed guidelines
        return serverItems || [];
      }
    } catch (e) {
      console.warn('Backend guidelines fetch failed, falling back to local storage:', e);
    }
    const localItems = JSON.parse(localStorage.getItem(LOCAL_GUIDELINES_KEY) || '[]');
    return localItems;
  },

  async uploadGuidelineFile(file: File, name: string, version = 'v1.0'): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('version', version);

    const res = await fetch(`${API_BASE}/guidelines/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw await requestError(res, 'Failed to upload guideline file');
    const item = await res.json(); rememberGuideline(item); return item;
  },

  async uploadRawGuideline(name: string, content: string, version = 'v1.0'): Promise<any> {
    const res = await fetch(`${API_BASE}/guidelines/raw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, content, version })
    });
    if (!res.ok) throw await requestError(res, 'Failed to index raw guidelines');
    const item = await res.json(); rememberGuideline(item); return item;
  },

  async deleteGuideline(id: string): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/guidelines/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok && res.status !== 404) {
        throw await requestError(res, 'Failed to delete guideline');
      }
    } catch (err) {
      console.warn('Backend guideline delete notice:', err);
    }
    try {
      const items = JSON.parse(localStorage.getItem(LOCAL_GUIDELINES_KEY) || '[]');
      localStorage.setItem(LOCAL_GUIDELINES_KEY, JSON.stringify(items.filter((existing: any) => existing.id !== id)));
    } catch { /* local cache is optional */ }
  },

  async analyzeTextRules(content: string, companyName: string): Promise<{ rules: Array<{title: string; category: string; rule_text: string; severity: string}>; needs_clarification?: boolean; message?: string }> {
    const res = await fetch(`${API_BASE}/guidelines/analyze-text-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, company_name: companyName })
    });
    if (!res.ok) throw new Error(`Rule analysis failed (${res.status})`);
    return res.json();
  },

  async deleteAccount(email: string, userId?: string): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (email) params.append('email', email);
      if (userId) params.append('user_id', userId);
      const res = await fetch(`${API_BASE}/account?${params.toString()}`, {
        method: 'DELETE'
      });
      return res.ok ? res.json() : null;
    } catch (e) {
      console.warn('Backend delete account error:', e);
      return null;
    }
  }
};
