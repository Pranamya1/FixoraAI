import logging
from typing import Optional
from fastapi import FastAPI, Depends, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import db_manager
from app.core.security import get_current_user, UserContext
from app.api.guidelines import router as guidelines_router
from app.api.posts import router as posts_router
from app.api.audit import router as audit_router
from app.api.webhooks import router as webhooks_router
from app.api.publish import router as publish_router
from app.api.analytics import router as analytics_router
from app.api.generate import router as generate_router
from app.api.channels import router as channels_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("fixora.main")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "FixoraAI: Enterprise multimodal brand governance and content rule review platform. "
        "Automates compliance verification with intent-aware tagging, RAG citations, 1-click suggested fixes, "
        "and brand-compliant generation of texts, visual posters, and PDF carousels."
    ),
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
# Explicitly whitelist local origins and safely match Render domains via allow_origin_regex
# (Wildcard '*' with allow_credentials=True is rejected by modern browsers)
cors_origins = [o for o in settings.CORS_ORIGINS if o and o != "*"]
if settings.APP_STUDIO_URL and settings.APP_STUDIO_URL not in cors_origins:
    cors_origins.append(settings.APP_STUDIO_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://.*\.onrender\.com|http://localhost:.*|http://127\.0\.0\.1:.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers under /api
app.include_router(guidelines_router, prefix=settings.API_V1_STR)
app.include_router(posts_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)
app.include_router(generate_router, prefix=settings.API_V1_STR)
app.include_router(webhooks_router, prefix=settings.API_V1_STR)
app.include_router(publish_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(channels_router, prefix=settings.API_V1_STR)

from app.api.channels import oauth_callback

@app.get("/api/auth/linkedin/callback", tags=["Social Accounts & OAuth Connections"])
async def linkedin_auth_callback_alias(
    request: Request,
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None)
):
    """Alias for LinkedIn OAuth callback to match external redirect configurations."""
    return await oauth_callback(platform="linkedin", request=request, code=code, state=state, error=error)

@app.get("/health", tags=["System"])
async def health_check():
    """System health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database_connected": db_manager.is_connected
    }

@app.delete("/api/account", tags=["Account"])
async def delete_account(
    email: Optional[str] = Query(default=None),
    user_id: Optional[str] = Query(default=None),
    user: UserContext = Depends(get_current_user)
):
    """
    Permanently deletes user account from Supabase Auth and purges all workspace data.
    Ensures safe deletion order to respect foreign key constraints.
    """
    target_email = (email or user.email or "").strip().lower()
    target_uid = user_id or (user.id if user.id != "00000000-0000-0000-0000-000000000002" else None)
    
    deleted_from_auth = False
    
    # Tables in exact child-to-parent foreign key order
    tables_to_purge = [
        "violations",
        "audit_reports",
        "webhook_dispatch_logs",
        "webhooks",
        "posts",
        "guideline_chunks",
        "brand_guidelines"
    ]

    # 1. Delete from Supabase Auth & Cloud Database
    if db_manager.supabase:
        try:
            # Delete by UID directly if available
            if target_uid:
                try:
                    db_manager.supabase.auth.admin.delete_user(target_uid, should_soft_delete=False)
                    deleted_from_auth = True
                    logger.info(f"Deleted user with ID {target_uid} from Supabase Auth.")
                except Exception as e:
                    logger.warning(f"Failed deleting user by ID {target_uid}: {e}")

            # Delete by email matching from Supabase Auth
            if target_email and not deleted_from_auth:
                try:
                    users_list = db_manager.supabase.auth.admin.list_users()
                    for u in users_list:
                        if u.email and u.email.strip().lower() == target_email:
                            db_manager.supabase.auth.admin.delete_user(u.id, should_soft_delete=False)
                            deleted_from_auth = True
                            logger.info(f"Deleted user {u.email} (ID: {u.id}) from Supabase Auth.")
                except Exception as e:
                    logger.warning(f"Error querying/deleting users by email from Supabase Auth: {e}")

            # Purge from Supabase tables in child-to-parent order
            for tbl in tables_to_purge:
                try:
                    db_manager.supabase.table(tbl).delete().eq("org_id", user.org_id).execute()
                except Exception as e:
                    logger.warning(f"Error purging Supabase table '{tbl}': {e}")
        except Exception as e:
            logger.error(f"Unexpected error in Supabase account deletion: {e}")

    # Also purge via async client if configured
    if db_manager._sb:
        for tbl in tables_to_purge:
            try:
                await db_manager._sb.delete(tbl, {"org_id": user.org_id})
            except Exception as e:
                logger.debug(f"Async Supabase purge for {tbl}: {e}")

    # 2. Purge in-memory records
    for key in tables_to_purge:
        if key in db_manager._memory_store:
            db_manager._memory_store[key] = [
                item for item in db_manager._memory_store[key]
                if item.get("org_id") != user.org_id
            ]
    db_manager._memory_store["users"] = [
        u for u in db_manager._memory_store["users"]
        if u.get("email", "").lower() != target_email
    ]

    return {
        "status": "success",
        "message": f"Account '{target_email}' successfully purged from FixoraAI.",
        "auth_deleted": deleted_from_auth
    }

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing FixoraAI Backend Services...")
    await db_manager.preload_data()
    logger.info("FixoraAI Backend Ready.")
