from typing import Optional, Dict, Any, List
from enum import Enum
from pydantic import BaseModel, HttpUrl
from datetime import datetime

class WebhookPlatform(str, Enum):
    SLACK = "SLACK"
    TEAMS = "TEAMS"
    WHATSAPP = "WHATSAPP"
    GENERIC = "GENERIC"

class WebhookCreate(BaseModel):
    name: str
    platform: WebhookPlatform
    webhook_url: str
    trigger_threshold: int = 100
    is_active: bool = True

class WebhookResponse(WebhookCreate):
    id: str
    org_id: str
    created_at: datetime

class WebhookDispatchLogResponse(BaseModel):
    id: str
    webhook_id: str
    post_id: str
    status: str
    response_code: Optional[int] = None
    sent_at: datetime
