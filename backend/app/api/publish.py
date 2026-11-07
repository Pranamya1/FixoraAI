import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from app.models.publish import PublishRequest, PublishHistoryResponse
from app.services.publish.hub import publishing_hub
from app.core.config import settings
from app.core.security import get_current_user, UserContext

logger = logging.getLogger("fixora.api.publish")
router = APIRouter(prefix="/publish", tags=["Direct Publishing Hub"])

@router.get("/channels")
async def get_connected_channels(user: UserContext = Depends(get_current_user)):
    """
    Returns configured status for connected social platforms:
    - LinkedIn (UGC API v2)
    - Twitter / X (API v2)
    - Facebook (Meta Graph API Page Feed)
    - Instagram (Meta Graph Content Publishing API)
    """
    return {
        "channels": [
            {
                "platform": "LINKEDIN",
                "name": "LinkedIn Organization & Personal Pages",
                "is_live_configured": bool(settings.LINKEDIN_ACCESS_TOKEN),
                "author_urn": settings.LINKEDIN_AUTHOR_URN or "urn:li:organization:100234891 (Default Org)",
                "status": "CONNECTED"
            },
            {
                "platform": "TWITTER",
                "name": "Twitter / X Corporate Account",
                "is_live_configured": bool(settings.TWITTER_BEARER_TOKEN),
                "handle": "@FixoraAI",
                "status": "CONNECTED"
            },
            {
                "platform": "FACEBOOK",
                "name": "Facebook Official Brand Page",
                "is_live_configured": bool(settings.FACEBOOK_PAGE_ACCESS_TOKEN),
                "page_id": settings.FACEBOOK_PAGE_ID or "109283746592834 (Default Page)",
                "status": "CONNECTED"
            },
            {
                "platform": "INSTAGRAM",
                "name": "Instagram Professional Brand Account",
                "is_live_configured": bool(settings.INSTAGRAM_ACCESS_TOKEN),
                "account_id": settings.INSTAGRAM_ACCOUNT_ID or "17841400234891 (Default Account)",
                "status": "CONNECTED"
            }
        ]
    }


@router.post("", response_model=List[PublishHistoryResponse])
async def publish_post_to_channels(
    payload: PublishRequest,
    user: UserContext = Depends(get_current_user)
):
    """
    Direct Publishing Hub:
    Pushes an approved post directly to connected social platforms
    (LinkedIn, Twitter/X, Instagram, Facebook) or schedules publication.
    """
    try:
        results = await publishing_hub.publish_post(
            post_id=payload.post_id,
            platforms=payload.platforms,
            scheduled_for=payload.scheduled_for
        )
        return results
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error publishing post: {e}")
        raise HTTPException(status_code=500, detail="Failed to publish post")

@router.get("/history", response_model=List[PublishHistoryResponse])
async def get_publish_history(
    post_id: Optional[str] = None,
    user: UserContext = Depends(get_current_user)
):
    """Retrieve social publishing logs and live post URLs."""
    return publishing_hub.get_history(post_id=post_id)
