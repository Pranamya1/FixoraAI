import logging
from typing import Optional
from fastapi import FastAPI, Depends, Query
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
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
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None)
):
    """Alias for LinkedIn OAuth callback to match external redirect configurations."""
    return await oauth_callback(platform="linkedin", code=code, state=state, error=error)

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
    """
    target_email = (email or user.email or "").strip().lower()
    target_uid = user_id or (user.id if user.id != "00000000-0000-0000-0000-000000000002" else None)
    
    deleted_from_auth = False
    
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
            if target_email:
                try:
                    users_list = db_manager.supabase.auth.admin.list_users()
                    for u in users_list:
                        if u.email and u.email.strip().lower() == target_email:
                            db_manager.supabase.auth.admin.delete_user(u.id, should_soft_delete=False)
                            deleted_from_auth = True
                            logger.info(f"Deleted user {u.email} (ID: {u.id}) from Supabase Auth.")
                except Exception as e:
                    logger.warning(f"Error querying/deleting users by email from Supabase Auth: {e}")

            # Purge from Supabase tables
            try:
                db_manager.supabase.table("posts").delete().eq("org_id", user.org_id).execute()
                db_manager.supabase.table("guideline_chunks").delete().eq("org_id", user.org_id).execute()
                db_manager.supabase.table("brand_guidelines").delete().eq("org_id", user.org_id).execute()
            except Exception as e:
                logger.warning(f"Error purging Supabase tables: {e}")
        except Exception as e:
            logger.error(f"Unexpected error in Supabase account deletion: {e}")

    # 2. Purge in-memory records
    db_manager._memory_store["posts"] = [p for p in db_manager._memory_store["posts"] if p.get("org_id") != user.org_id]
    db_manager._memory_store["brand_guidelines"] = [g for g in db_manager._memory_store["brand_guidelines"] if g.get("org_id") != user.org_id]
    db_manager._memory_store["guideline_chunks"] = [c for c in db_manager._memory_store["guideline_chunks"] if c.get("org_id") != user.org_id]
    db_manager._memory_store["users"] = [u for u in db_manager._memory_store["users"] if u.get("email", "").lower() != target_email]

    return {
        "status": "success",
        "message": f"Account '{target_email}' successfully purged from FixoraAI and Supabase Auth.",
        "auth_deleted": deleted_from_auth
    }

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing FixoraAI Backend Services...")
    await db_manager.preload_data()
    logger.info("FixoraAI Backend Ready.")
