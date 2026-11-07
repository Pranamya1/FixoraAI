from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field

class ReviewChannel(str, Enum):
    GMAIL = "GMAIL"
    WHATSAPP = "WHATSAPP"
    SLACK = "SLACK"
    TEAMS = "TEAMS"

class SendReviewRequest(BaseModel):
    post_id: str
    channels: List[ReviewChannel] = Field(
        default=[ReviewChannel.GMAIL, ReviewChannel.SLACK, ReviewChannel.TEAMS, ReviewChannel.WHATSAPP],
        description="Notification channels to dispatch review request to higher-ups"
    )
    recipient_emails: Optional[List[str]] = Field(
        default=["manager@fixora.ai", "compliance-head@fixora.ai"],
        description="List of manager/higher-up email addresses for Gmail"
    )
    recipient_phones: Optional[List[str]] = Field(
        default=["+15550192834"],
        description="List of recipient phone numbers (E.164 format) for WhatsApp"
    )
    reviewer_notes: Optional[str] = Field(
        default=None,
        description="Optional notes from creator to reviewer"
    )

class ChannelDispatchResult(BaseModel):
    channel: ReviewChannel
    status: str = Field(..., description="'SENT', 'SIMULATED', or 'FAILED'")
    recipient: str
    message_id: Optional[str] = None
    preview_url: Optional[str] = None
    details: Optional[str] = None
    payload_preview: Optional[Dict[str, Any]] = None

class SendReviewResponse(BaseModel):
    post_id: str
    post_title: str
    compliance_score: Optional[float]
    total_dispatched: int
    results: List[ChannelDispatchResult]
    review_url: str
