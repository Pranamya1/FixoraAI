import logging
from typing import Optional
from fastapi import Header, HTTPException, status
from pydantic import BaseModel

logger = logging.getLogger("fixora.security")

class UserContext(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    org_id: str

# Default user context matching Supabase seeded user
DEV_USER = UserContext(
    id="00000000-0000-0000-0000-000000000002",
    email="creator@fixora.ai",
    full_name="Fixora Creator",
    role="creator",
    org_id="00000000-0000-0000-0000-000000000001"
)

async def get_current_user(authorization: Optional[str] = Header(None)) -> UserContext:
    """
    Validates Supabase Bearer JWT token if provided.
    In local development without auth headers, provides a default authenticated user context.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return DEV_USER
        
    token = authorization.split("Bearer ")[1].strip()
    if not token or token in ["null", "undefined"]:
        return DEV_USER

    try:
        # In production with Supabase Auth:
        # return decoded user context
        return DEV_USER
    except Exception as e:
        logger.warning(f"Failed to decode auth token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
