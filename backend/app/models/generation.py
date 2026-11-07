from typing import List, Optional
from enum import Enum
from pydantic import BaseModel, Field

class ContentFormat(str, Enum):
    TEXT = "text"
    POSTER = "poster"
    PDF = "pdf"

class PosterRatio(str, Enum):
    SQUARE = "square"              # 1080x1080 (Instagram / LinkedIn)
    PORTRAIT = "portrait"          # 1080x1350 (Poster / Feed)
    LANDSCAPE = "landscape"        # 1200x675 (Twitter / LinkedIn banner)
    STORY = "story"                # 1080x1920 (Story / Reel cover)

class GenerateContentRequest(BaseModel):
    topic: str = Field(..., description="Topic or prompt for the content (e.g. 'Launching FixoraAI 2.0')")
    campaign_goal: str = Field(default="Brand Awareness", description="e.g. Product Launch, Thought Leadership, Lead Gen")
    target_channel: str = Field(default="LinkedIn", description="e.g. LinkedIn, X / Twitter, Instagram")
    target_audience: str = Field(default="B2B Enterprise", description="e.g. B2B Enterprise, Tech Leads, Marketers")
    intended_tone: str = Field(default="Authoritative & Professional", description="Tone of voice")
    formats: List[ContentFormat] = Field(default=[ContentFormat.TEXT, ContentFormat.POSTER, ContentFormat.PDF], description="What to generate")
    poster_ratio: PosterRatio = Field(default=PosterRatio.PORTRAIT, description="Aspect ratio for poster graphic")
    save_as_draft: bool = Field(default=True, description="Whether to automatically register as a post in drafts")

class GenerateContentResponse(BaseModel):
    title: str
    generated_text: str
    headline: str
    key_points: List[str]
    poster_url: Optional[str] = None
    pdf_url: Optional[str] = None
    post_id: Optional[str] = None
    compliance_score: int = 100
    applied_rules: List[str] = []
    generated_at: str
