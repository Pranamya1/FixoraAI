from typing import List, Optional
from enum import Enum
from pydantic import BaseModel, Field
from datetime import datetime

class RuleCategory(str, Enum):
    TONE_OF_VOICE = "TONE_OF_VOICE"
    LOGO_SPECIFICATION = "LOGO_SPECIFICATION"
    COLOR_PALETTE = "COLOR_PALETTE"
    TYPOGRAPHY = "TYPOGRAPHY"
    LEGAL_CLAIMS = "LEGAL_CLAIMS"
    COMPETITOR_POLICY = "COMPETITOR_POLICY"
    GENERAL = "GENERAL"

class SeverityLevel(str, Enum):
    CRITICAL = "CRITICAL"
    WARNING = "WARNING"
    SUGGESTION = "SUGGESTION"

class GuidelineChunkBase(BaseModel):
    page_num: int = 1
    rule_category: RuleCategory = RuleCategory.GENERAL
    rule_title: str
    chunk_text: str
    severity_default: SeverityLevel = SeverityLevel.WARNING
    target_channels: List[str] = ["all"]
    target_audiences: List[str] = ["all"]

class GuidelineChunkCreate(GuidelineChunkBase):
    guideline_id: str
    org_id: str
    embedding: Optional[List[float]] = None

class GuidelineChunkResponse(GuidelineChunkBase):
    id: str
    guideline_id: str
    similarity: Optional[float] = None
    created_at: Optional[datetime] = None

class BrandGuidelineBase(BaseModel):
    name: str
    version: str = "v1.0"

class BrandGuidelineCreate(BrandGuidelineBase):
    file_url: Optional[str] = None
    file_type: Optional[str] = None

class GuidelineTextCreate(BaseModel):
    name: str = Field(..., description="Brand guideline or policy title")
    content: str = Field(..., description="Raw text or markdown content containing brand rules")
    version: str = Field(default="v1.0", description="Version string (e.g. v1.0)")

class BrandGuidelineResponse(BrandGuidelineBase):
    id: str
    org_id: str
    file_url: Optional[str] = None
    file_type: Optional[str] = None
    status: str = "ready"
    total_rules_extracted: int = 0
    created_at: datetime
    chunks: Optional[List[GuidelineChunkResponse]] = None
