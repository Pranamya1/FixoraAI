from typing import Optional, Dict, Any, List
from enum import Enum
from pydantic import BaseModel, Field
from datetime import datetime

class PostStatus(str, Enum):
    DRAFT = "DRAFT"
    AUDITING = "AUDITING"
    ACTION_REQUIRED = "ACTION_REQUIRED"
    APPROVED = "APPROVED"
    PUBLISHED = "PUBLISHED"

class IntentTags(BaseModel):
    category: str = Field(default="Social Media", description="e.g. Social Media, Blog, Ad, Press Release")
    target_audience: str = Field(default="General B2B", description="e.g. B2B Enterprise, Tech Developers, Gen Z, FinTech")
    campaign_goal: str = Field(default="Brand Awareness", description="e.g. Product Launch, Thought Leadership, Conversion")
    intended_tone: str = Field(default="Professional", description="e.g. Professional, Bold, Conversational, Friendly")
    target_channel: str = Field(default="LinkedIn", description="e.g. LinkedIn, X / Twitter, Instagram, Facebook")

class PostBase(BaseModel):
    title: str
    body: str
    image_url: Optional[str] = None
    intent_tags: IntentTags = Field(default_factory=IntentTags)

class PostCreate(PostBase):
    pass

class PostUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    image_url: Optional[str] = None
    intent_tags: Optional[IntentTags] = None
    status: Optional[PostStatus] = None

class PostResponse(PostBase):
    id: str
    org_id: str
    author_id: Optional[str] = None
    status: PostStatus = PostStatus.DRAFT
    compliance_score: Optional[int] = None
    created_at: datetime
    updated_at: datetime
