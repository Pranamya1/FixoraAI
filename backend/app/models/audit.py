from typing import List, Optional
from enum import Enum
from pydantic import BaseModel, Field
from datetime import datetime
from app.models.guideline import SeverityLevel

class AuditVerdict(str, Enum):
    APPROVED = "APPROVED"
    ACTION_REQUIRED = "ACTION_REQUIRED"
    REJECTED = "REJECTED"

class ViolationBase(BaseModel):
    rule_title: str
    category: str
    severity: SeverityLevel
    page_ref: int = 1
    document_name: str = "Brand Guidelines"
    offending_fragment: str = Field(..., description="Exact word, phrase, or visual detail violating the rule")
    violation_explanation: str = Field(..., description="Explanation of why this violates brand rules")
    suggested_fix: str = Field(..., description="Actionable replacement text or fix")

class ViolationCreate(ViolationBase):
    post_id: str
    chunk_id: Optional[str] = None

class ViolationResponse(ViolationBase):
    id: str
    post_id: str
    chunk_id: Optional[str] = None
    is_resolved: bool = False
    created_at: Optional[datetime] = None

class VisualAuditDetails(BaseModel):
    palette_compliance: Optional[str] = "Compliant"
    typography_legibility: Optional[str] = "High"
    layout_balance: Optional[str] = "Balanced"
    image_text_alignment: Optional[str] = "Aligned"
    visual_summary: Optional[str] = None

class AuditReportResponse(BaseModel):
    id: str
    post_id: str
    compliance_score: int = Field(..., ge=0, le=100)
    verdict: AuditVerdict
    summary: str
    violations: List[ViolationResponse] = []
    visual_audit: Optional[VisualAuditDetails] = None
    fast_tracked: bool = False
    evaluated_at: datetime

class AuditTriggerRequest(BaseModel):
    post_id: str
    force_refresh: bool = False
