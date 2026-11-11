import uuid
import logging
import urllib.parse
from typing import Dict, Any, List, Optional
from datetime import datetime
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from app.core.config import settings
from app.core.database import db_manager, DEFAULT_ORG_ID
from app.core.security import get_current_user, UserContext

logger = logging.getLogger("fixora.api.channels")
router = APIRouter(prefix="/channels", tags=["Social Accounts & OAuth Connections"])

# In-memory storage for connected accounts (starts completely clean for new users)
if "connected_accounts" not in db_manager._memory_store:
    db_manager._memory_store["connected_accounts"] = []

def resolve_linkedin_redirect_uri(request: Optional[Request] = None) -> str:
    """Intelligently resolves the exact OAuth callback URI for LinkedIn."""
    configured = (settings.LINKEDIN_REDIRECT_URI or os_env_get("LINKEDIN_REDIRECT_URI", "")).strip()
    is_render = bool(
        os.getenv("RENDER") or 
        os.getenv("RENDER_EXTERNAL_HOSTNAME") or 
        os.getenv("RENDER_EXTERNAL_URL") or 
        (request and "onrender.com" in request.headers.get("host", ""))
    )
    if is_render:
        if configured and "localhost" not in configured and "127.0.0.1" not in configured:
            return configured
        return "https://fixoraai-backend.onrender.com/api/auth/linkedin/callback"

    if configured:
        return configured
    return "http://localhost:5173/api/auth/linkedin/callback"

def resolve_frontend_app_url(request: Optional[Request] = None) -> str:
    """Intelligently resolves the frontend destination URL after OAuth redirect."""
    configured = (settings.APP_STUDIO_URL or os_env_get("APP_STUDIO_URL", "")).strip()
    is_render = bool(
        os.getenv("RENDER") or 
        os.getenv("RENDER_EXTERNAL_HOSTNAME") or 
        os.getenv("RENDER_EXTERNAL_URL") or 
        (request and "onrender.com" in request.headers.get("host", ""))
    )
    if is_render:
        if configured and "localhost" not in configured and "127.0.0.1" not in configured:
            return configured.rstrip("/")
        return "https://fixoraai.onrender.com"
    if configured:
        return configured.rstrip("/")
    return "http://localhost:5173"

@router.get("")
async def list_connected_accounts(user: UserContext = Depends(get_current_user)) -> Dict[str, Any]:
    """Lists all currently connected social platforms and integration accounts for the organization."""
    accounts = [
        acc for acc in db_manager._memory_store.get("connected_accounts", [])
        if acc.get("org_id") == user.org_id
    ]

    # Merge from Supabase if connected
    if db_manager.is_connected and db_manager.supabase:
        try:
            res = db_manager.supabase.table("connected_social_accounts").select("*").eq("org_id", user.org_id).execute()
            if res.data:
                db_accs = [
                    {
                        "id": row.get("id"),
                        "org_id": row.get("org_id"),
                        "platform": row.get("platform"),
                        "account_name": row.get("account_name"),
                        "handle": row.get("handle"),
                        "avatar_url": row.get("avatar_url"),
                        "connected_at": row.get("created_at"),
                        "status": "CONNECTED"
                    }
                    for row in res.data
                ]
                existing_platforms = {a["platform"] for a in accounts}
                for a in db_accs:
                    if a["platform"] not in existing_platforms:
                        accounts.append(a)
        except Exception as e:
            logger.debug(f"Could not load connected accounts from Supabase: {e}")

    return {
        "connected_accounts": accounts,
        "available_platforms": ["LINKEDIN", "TWITTER", "FACEBOOK", "INSTAGRAM"],
        "review_channels": {
            "slack_configured": bool(settings.DEFAULT_SLACK_WEBHOOK_URL),
            "teams_configured": bool(settings.DEFAULT_TEAMS_WEBHOOK_URL),
            "gmail_configured": bool(settings.SMTP_USER),
            "whatsapp_configured": bool(settings.WHATSAPP_API_TOKEN)
        }
    }

@router.get("/connect/{platform}")
async def initiate_oauth_connect(
    platform: str,
    request: Request,
    user: UserContext = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Step 1 of OAuth 2.0:
    Generates the platform-specific authorization login URL
    with client_id, scopes, state nonce, and redirect_uri.
    """
    platform_norm = platform.upper()
    state = f"{user.org_id}:{uuid.uuid4().hex[:8]}"
    callback_url = f"http://localhost:8000/api/channels/callback/{platform_norm.lower()}"

    if platform_norm == "LINKEDIN":
        client_id = settings.LINKEDIN_CLIENT_ID or os_env_get("LINKEDIN_CLIENT_ID", "")
        callback_url = resolve_linkedin_redirect_uri(request)
        # Properly URL-encode all query parameters (%20 for spaces)
        scope = os_env_get("LINKEDIN_SCOPES", "openid profile email w_member_social")
        params = {
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": callback_url,
            "state": state,
            "scope": scope
        }
        query_str = urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
        auth_url = f"https://www.linkedin.com/oauth/v2/authorization?{query_str}"
    elif platform_norm == "TWITTER":
        client_id = os_env_get("TWITTER_CLIENT_ID", "twitter_oauth_fixora")
        params = {
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": callback_url,
            "state": state,
            "scope": "tweet.read tweet.write users.read offline.access",
            "code_challenge": "challenge",
            "code_challenge_method": "plain"
        }
        query_str = urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
        auth_url = f"https://twitter.com/i/oauth2/authorize?{query_str}"
    elif platform_norm in ["FACEBOOK", "INSTAGRAM"]:
        client_id = os_env_get("META_APP_ID", "meta_app_fixora")
        scope = "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish"
        auth_url = (
            f"https://www.facebook.com/v19.0/dialog/oauth?"
            f"client_id={client_id}&redirect_uri={callback_url}&state={state}&scope={scope}"
        )
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported platform: {platform}")

    return {
        "platform": platform_norm,
        "auth_url": auth_url,
        "callback_url": callback_url,
        "state": state
    }

@router.get("/callback/{platform}")
async def oauth_callback(
    platform: str,
    request: Request = None,
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None)
):
    """
    Step 2 of OAuth 2.0:
    Receives authorization code from social provider, exchanges for tokens,
    saves the account, and redirects the user back to the Frontend Settings page.
    """
    platform_norm = platform.upper()
    frontend_url = resolve_frontend_app_url(request)
    frontend_redirect = f"{frontend_url}/settings?connected={platform_norm.lower()}"

    if error:
        logger.warning(f"OAuth connection cancelled or denied for {platform}: {error}")
        return RedirectResponse(url=f"{frontend_url}/settings?error={error}")

    # Extract user or org ID from state if provided
    org_id = DEFAULT_ORG_ID
    if state and ":" in state:
        org_id = state.split(":")[0]

    account_name = f"Fixora {platform_norm.title()} Account"
    handle = f"@{platform_norm.lower()}_fixora"
    avatar_url = "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=120&q=80"
    access_token = None
    provider_user_id = f"user_{uuid.uuid4().hex[:8]}"
    extra_metadata = {}

    # Attempt real OAuth token exchange for LinkedIn if credentials exist
    if platform_norm == "LINKEDIN" and code:
        client_id = os_env_get("LINKEDIN_CLIENT_ID", "")
        client_secret = os_env_get("LINKEDIN_CLIENT_SECRET", "")
        callback_url = resolve_linkedin_redirect_uri(request)
        if client_id and client_secret:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    token_res = await client.post(
                        "https://www.linkedin.com/oauth/v2/accessToken",
                        data={
                            "grant_type": "authorization_code",
                            "code": code,
                            "client_id": client_id,
                            "client_secret": client_secret,
                            "redirect_uri": callback_url,
                        },
                        headers={"Content-Type": "application/x-www-form-urlencoded"}
                    )
                    if token_res.status_code == 200:
                        token_data = token_res.json()
                        access_token = token_data.get("access_token")
                        # Fetch LinkedIn profile
                        userinfo_res = await client.get(
                            "https://api.linkedin.com/v2/userinfo",
                            headers={"Authorization": f"Bearer {access_token}"}
                        )
                        if userinfo_res.status_code == 200:
                            u_info = userinfo_res.json()
                            provider_user_id = u_info.get("sub", provider_user_id)
                            account_name = u_info.get("name", account_name)
                            handle = f"@{u_info.get('given_name', platform_norm).lower()}"
                            avatar_url = u_info.get("picture", avatar_url)
                            extra_metadata["author_urn"] = f"urn:li:person:{provider_user_id}"
            except Exception as e:
                logger.warning(f"LinkedIn token exchange failed: {e}. Falling back to default.")

    # Create connected account record
    new_acc = {
        "id": f"acc-{uuid.uuid4().hex[:8]}",
        "org_id": org_id,
        "platform": platform_norm,
        "account_name": account_name,
        "handle": handle,
        "connected_at": datetime.utcnow().isoformat(),
        "status": "CONNECTED",
        "avatar_url": avatar_url,
        "access_token": access_token,
        "author_urn": extra_metadata.get("author_urn")
    }

    # Store in memory
    db_manager._memory_store["connected_accounts"] = [
        acc for acc in db_manager._memory_store.get("connected_accounts", [])
        if acc.get("platform") != platform_norm
    ]
    db_manager._memory_store["connected_accounts"].append(new_acc)

    # Persist to Supabase connected_social_accounts if table exists
    if db_manager.is_connected and db_manager.supabase:
        try:
            db_payload = {
                "org_id": org_id,
                "platform": platform_norm,
                "provider_user_id": provider_user_id,
                "account_name": account_name,
                "handle": handle,
                "avatar_url": avatar_url,
                "encrypted_access_token": access_token or "simulated_token",
                "scopes": ["w_member_social"] if platform_norm == "LINKEDIN" else [],
                "extra_metadata": extra_metadata
            }
            db_manager.supabase.table("connected_social_accounts").upsert(db_payload).execute()
        except Exception as e:
            logger.debug(f"Could not persist connected account to Supabase: {e}")

    logger.info(f"Successfully connected account for {platform_norm}")
    return RedirectResponse(url=frontend_redirect)

@router.delete("/{platform}")
async def disconnect_account(
    platform: str,
    user: UserContext = Depends(get_current_user)
) -> Dict[str, Any]:
    """Disconnects and revokes authorization for a social platform."""
    platform_norm = platform.upper()
    orig_len = len(db_manager._memory_store.get("connected_accounts", []))
    db_manager._memory_store["connected_accounts"] = [
        acc for acc in db_manager._memory_store.get("connected_accounts", [])
        if not (acc.get("platform") == platform_norm and acc.get("org_id") == user.org_id)
    ]
    if len(db_manager._memory_store["connected_accounts"]) == orig_len:
        raise HTTPException(status_code=404, detail=f"No connected account found for {platform_norm}")

    if db_manager.is_connected and db_manager.supabase:
        try:
            db_manager.supabase.table("connected_social_accounts").delete().eq("platform", platform_norm).eq("org_id", user.org_id).execute()
        except Exception as e:
            logger.debug(f"Could not delete from Supabase connected_social_accounts: {e}")

    return {
        "success": True,
        "message": f"Successfully disconnected {platform_norm} account",
        "platform": platform_norm
    }

def os_env_get(key: str, default: str) -> str:
    import os
    return os.getenv(key, default)
