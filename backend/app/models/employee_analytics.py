from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class ComplianceTimePoint(BaseModel):
    date: str = Field(..., description="Date string (YYYY-MM-DD) for X-axis on charts")
    average_score: float = Field(..., description="Average team compliance score")
    total_mistakes: int = Field(..., description="Number of mistakes flagged that day")
    critical_mistakes: int = Field(..., description="Critical severity violations")

class CategoryDistributionPoint(BaseModel):
    category: str = Field(..., description="Rule category (e.g. LEGAL_CLAIMS, TONE_OF_VOICE)")
    count: int = Field(..., description="Total mistakes in this category")
    percentage: float = Field(..., description="Percentage of total team mistakes")

class EmployeeMistakeStats(BaseModel):
    user_id: str
    employee_name: str
    email: str
    role: str
    total_posts: int
    total_mistakes: int
    average_compliance_score: float
    critical_mistakes: int
    warning_mistakes: int
    suggestions_count: int
    top_mistake_category: str
    risk_level: str = Field(..., description="'LOW_RISK', 'MODERATE', 'ATTENTION_REQUIRED'")
    resolution_rate: float = Field(..., description="% of mistakes resolved with 1-click fixes")

class EmployeeDetailAnalytics(BaseModel):
    employee: EmployeeMistakeStats
    mistake_history: List[Dict[str, Any]]
    compliance_timeline: List[ComplianceTimePoint]
    ai_training_recommendation: str

class EmployeeAnalyticsDashboardResponse(BaseModel):
    summary: Dict[str, Any]
    timeline_graph: List[ComplianceTimePoint]
    category_distribution_graph: List[CategoryDistributionPoint]
    employee_leaderboard: List[EmployeeMistakeStats]
    ai_coaching_insights: List[str]
