import uuid
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from app.models.post import PostCreate, PostUpdate, PostResponse, PostStatus
from app.core.database import db_manager
from app.core.security import get_current_user, UserContext

logger = logging.getLogger("fixora.api.posts")
router = APIRouter(prefix="/posts", tags=["Draft Posts & Intent"])


@router.get("", response_model=List[PostResponse])
async def list_posts(
    status: Optional[PostStatus] = None,
    channel: Optional[str] = None,
    user: UserContext = Depends(get_current_user)
):
    """List posts with optional filtering by status or channel — reads from Supabase."""
    return await db_manager.get_posts(
        org_id=user.org_id,
        status=status.value if status else None,
        channel=channel
    )


@router.post("", response_model=PostResponse)
async def create_post(
    post_in: PostCreate,
    user: UserContext = Depends(get_current_user)
):
    """Create a new draft post — persisted to Supabase immediately."""
    post_id = str(uuid.uuid4())
    now = datetime.utcnow()

    post_record = {
        "id": post_id,
        "org_id": user.org_id,
        "author_id": user.id,
        "title": post_in.title,
        "body": post_in.body,
        "image_url": post_in.image_url,
        "intent_tags": post_in.intent_tags.model_dump(),
        "status": PostStatus.DRAFT.value,
        "compliance_score": None,
        "created_at": now,
        "updated_at": now
    }

    await db_manager.save_post(post_record)
    logger.info(f"Created and persisted draft post '{post_id}' ('{post_in.title}').")
    return post_record


@router.get("/{post_id}", response_model=PostResponse)
async def get_post(post_id: str, user: UserContext = Depends(get_current_user)):
    """Retrieve post details by ID."""
    post = await db_manager.get_post_by_id(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.put("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: str,
    post_in: PostUpdate,
    user: UserContext = Depends(get_current_user)
):
    """Update post body, title, image, intent tags, or status — persisted to Supabase."""
    post = await db_manager.get_post_by_id(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    update_data = post_in.model_dump(exclude_unset=True)
    cleaned: dict = {}

    for key, val in update_data.items():
        if val is None:
            continue
        if key == "intent_tags":
            cleaned["intent_tags"] = val if isinstance(val, dict) else val.model_dump()
        elif key == "status":
            cleaned["status"] = val.value if hasattr(val, "value") else val
        else:
            cleaned[key] = val

    updated = await db_manager.update_post(post_id, cleaned)
    return updated


@router.delete("/{post_id}")
async def delete_post(post_id: str, user: UserContext = Depends(get_current_user)):
    """Delete draft post from Supabase."""
    deleted = await db_manager.delete_post(post_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"message": "Post deleted successfully", "id": post_id}
