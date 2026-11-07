from typing import Optional, List
from enum import Enum
from pydantic import BaseModel
from datetime import datetime

class PublishPlatform(str, Enum):
    LINKEDIN = "LINKEDIN"
    TWITTER = "TWITTER"
    INSTAGRAM = "INSTAGRAM"
    FACEBOOK = "FACEBOOK"

class PublishStatus(str, Enum):
    QUEUED = "QUEUED"
    PUBLISHED = "PUBLISHED"
    FAILED = "FAILED"

class PublishRequest(BaseModel):
    post_id: str
    platforms: List[PublishPlatform]
    scheduled_for: Optional[datetime] = None

class PublishHistoryResponse(BaseModel):
    id: str
    post_id: str
    platform: PublishPlatform
    status: PublishStatus
    published_at: Optional[datetime] = None
    scheduled_for: Optional[datetime] = None
    external_url: Optional[str] = None
    error_message: Optional[str] = None
