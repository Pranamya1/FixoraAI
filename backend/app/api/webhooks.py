import uuid
import logging
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from app.models.webhook import WebhookCreate, WebhookResponse, WebhookDispatchLogResponse
from app.services.webhooks.dispatcher import webhook_dispatcher
from app.core.database import db_manager
from app.core.security import get_current_user, UserContext

logger = logging.getLogger("fixora.api.webhooks")
router = APIRouter(prefix="/webhooks", tags=["Fast-Track Webhooks"])

@router.get("", response_model=List[WebhookResponse])
async def list_webhooks(user: UserContext = Depends(get_current_user)):
    """List configured sign-off webhooks (Slack, Teams, WhatsApp)."""
    return [w for w in db_manager._memory_store["webhooks"] if w.get("org_id") == user.org_id]

@router.post("", response_model=WebhookResponse)
async def create_webhook(
    hook_in: WebhookCreate,
    user: UserContext = Depends(get_current_user)
):
    """Register a new sign-off webhook URL."""
    hook_id = f"hook-{uuid.uuid4().hex[:8]}"
    record = {
        "id": hook_id,
        "org_id": user.org_id,
        "name": hook_in.name,
        "platform": hook_in.platform.value,
        "webhook_url": hook_in.webhook_url,
        "trigger_threshold": hook_in.trigger_threshold,
        "is_active": hook_in.is_active,
        "created_at": datetime.utcnow()
    }
    db_manager._memory_store["webhooks"].append(record)
    logger.info(f"Registered webhook '{hook_in.name}' for {hook_in.platform.value}.")
    return record

@router.get("/logs", response_model=List[WebhookDispatchLogResponse])
async def get_dispatch_logs(user: UserContext = Depends(get_current_user)):
    """Retrieve history of webhook dispatch notifications."""
    return db_manager._memory_store["webhook_dispatch_logs"]

@router.delete("/{hook_id}")
async def delete_webhook(hook_id: str, user: UserContext = Depends(get_current_user)):
    """Delete configured webhook."""
    orig = len(db_manager._memory_store["webhooks"])
    db_manager._memory_store["webhooks"] = [w for w in db_manager._memory_store["webhooks"] if w.get("id") != hook_id]
    if len(db_manager._memory_store["webhooks"]) == orig:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return {"message": "Webhook deleted"}
