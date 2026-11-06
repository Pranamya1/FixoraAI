export type PostStatus = 'DRAFT' | 'IN_REVIEW' | 'ACTION_REQUIRED' | 'APPROVED' | 'PUBLISHED';

export interface IntentTags {
  category?: string;
  target_audience?: string;
  campaign_goal?: string;
  intended_tone?: string;
  target_channel?: string;
}

export interface Post {
  id: string;
  org_id?: string;
  author_id?: string;
  title: string;
  body: string;
  image_url?: string;
  intent_tags?: IntentTags;
  status: PostStatus;
  compliance_score?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Violation {
  id: string;
  post_id: string;
  audit_report_id?: string;
  rule_title: string;
  category: string;
  severity: 'CRITICAL' | 'WARNING' | 'SUGGESTION';
  page_ref: number;
  document_name: string;
  offending_fragment: string;
  violation_explanation: string;
  suggested_fix: string;
  is_resolved: boolean;
  created_at?: string;
}

export interface AuditReport {
  id: string;
  post_id: string;
  compliance_score: number;
  verdict: 'APPROVED' | 'ACTION_REQUIRED';
  summary: string;
  violations: Violation[];
  fast_tracked: boolean;
  evaluated_at: string;
}

export interface ComplianceTimePoint {
  date: string;
  average_score: number;
  total_mistakes: number;
  critical_mistakes: number;
}

export interface CategoryDistributionPoint {
  category: string;
  count: number;
  percentage: number;
}

export interface EmployeeMistakeStats {
  user_id: string;
  employee_name: string;
  email: string;
  role: string;
  total_posts: number;
  total_mistakes: number;
  average_compliance_score: number;
  critical_mistakes: number;
  warning_mistakes: number;
  suggestions_count: number;
  top_mistake_category: string;
  risk_level: 'LOW_RISK' | 'MODERATE' | 'ATTENTION_REQUIRED';
  resolution_rate: number;
}

export interface EmployeeDetailAnalytics {
  employee: EmployeeMistakeStats;
  mistake_history: Violation[];
  compliance_timeline: ComplianceTimePoint[];
  ai_training_recommendation: string;
}

export interface EmployeeAnalyticsDashboardResponse {
  summary: {
    total_team_members: number;
    total_posts_reviewed: number;
    total_mistakes_caught: number;
    overall_team_score: number;
    attention_required_count: number;
    top_violated_category: string;
    one_click_fix_adoption_rate: string;
  };
  timeline_graph: ComplianceTimePoint[];
  category_distribution_graph: CategoryDistributionPoint[];
  employee_leaderboard: EmployeeMistakeStats[];
  ai_coaching_insights: string[];
}

export interface GenerationRequest {
  topic: string;
  campaign_goal?: string;
  target_channel?: string;
  target_audience?: string;
  intended_tone?: string;
  formats?: ('text' | 'poster' | 'pdf')[];
  poster_ratio?: string;
  save_as_draft?: boolean;
}

export interface GenerationResponse {
  title: string;
  headline: string;
  generated_text: string;
  key_points: string[];
  poster_url?: string;
  pdf_url?: string;
  post_id?: string;
  compliance_score: number;
  applied_rules: string[];
  generated_at: string;
}

export interface ConnectedAccount {
  id: string;
  platform: 'LINKEDIN' | 'TWITTER' | 'FACEBOOK' | 'INSTAGRAM';
  account_name: string;
  handle: string;
  connected_at: string;
  status: string;
  avatar_url?: string;
}
