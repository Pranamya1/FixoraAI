import os
import uuid
import re
import base64
import logging
import asyncio
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Form
from pydantic import BaseModel
from app.models.audit import AuditReportResponse, AuditTriggerRequest, ViolationResponse
from app.models.review import SendReviewRequest, SendReviewResponse
from app.services.review.review_dispatcher import review_dispatcher
from app.services.rag.vector_store import vector_store
from app.services.gemini.client import gemini_client
from app.services.webhooks.dispatcher import webhook_dispatcher
from app.core.database import db_manager
from app.core.security import get_current_user, UserContext

logger = logging.getLogger("fixora.api.audit")
router = APIRouter(prefix="/audit", tags=["AI Compliance Engine"])


class ApplyFixRequest(BaseModel):
    post_id: str
    violation_id: str
    suggested_fix: str
    offending_fragment: str


@router.post("/evaluate", response_model=AuditReportResponse)
async def evaluate_post_compliance(
    payload: AuditTriggerRequest,
    background_tasks: BackgroundTasks,
    user: UserContext = Depends(get_current_user)
):
    """
    Core AI Compliance Engine:
    1. Retrieves draft post & intent tags from Supabase.
    2. Vector similarity search fetches relevant brand rules.
    3. Gemini multimodal evaluation checks copy & visual assets.
    4. Violations + 1-click suggested fixes persisted to Supabase.
    5. If 100% compliant, dispatches fast-track approval webhooks.
    """
    import time
    t_start = time.time()
    logger.info(f"[{payload.post_id}] Step 0: Starting evaluation...")
    post_id = payload.post_id

    post = await db_manager.get_post_by_id(post_id)
    if not post:
        logger.warning(f"[{post_id}] Post not found!")
        raise HTTPException(status_code=404, detail="Post not found")

    intent = dict(post.get("intent_tags") or {})
    body = post.get("body", "")
    title = post.get("title", "")

    # Auto-extract trailing/leading creator intent or goal prompt
    user_goal = (intent.get("user_description") or intent.get("campaign_goal") or "").strip()
    if not user_goal or user_goal.lower() in ["thought leadership", "social publishing", "general", "campaign content"]:
        lines = [l.strip() for l in body.splitlines() if l.strip()]
        goal_pattern = r"^(?:this\s+)?(?:post\s+(?:is\s+)?for|campaign\s+goal[:\s]|goal[:\s]|instruction[:\s]|prompt[:\s]|target[:\s]|audit\s+(?:this\s+)?for|for\s+hir(?:ing|eing)|hir(?:ing|eing)\b)(.*)$"
        if lines:
            if re.match(goal_pattern, lines[-1], re.IGNORECASE):
                user_goal = lines[-1]
                intent["user_description"] = user_goal
                intent["campaign_goal"] = user_goal
                body = "\n".join(body.strip().splitlines()[:-1]).strip()
                post["body"] = body
            elif re.match(goal_pattern, lines[0], re.IGNORECASE):
                user_goal = lines[0]
                intent["user_description"] = user_goal
                intent["campaign_goal"] = user_goal
                body = "\n".join(body.strip().splitlines()[1:]).strip()
                post["body"] = body

    full_text = f"{title}\n{body}"
    target_channel = intent.get("target_channel")

    logger.info(f"[{post_id}] Step 1: Searching relevant rules (t={time.time()-t_start:.2f}s)...")
    try:
        relevant_rules = await asyncio.wait_for(
            asyncio.to_thread(
                vector_store.search_relevant_rules,
                query_text=full_text,
                target_channel=target_channel,
                top_k=8
            ),
            timeout=4.0
        )
    except Exception as e:
        logger.warning(f"[{post_id}] Rule search timed out or failed ({e}). Proceeding with empty rules.")
        relevant_rules = []

    logger.info(f"[{post_id}] Step 2: Running Gemini compliance evaluation with {len(relevant_rules)} rules (t={time.time()-t_start:.2f}s)...")
    try:
        ai_result = await gemini_client.evaluate_compliance(
            draft_text=full_text,
            intent_tags=intent,
            relevant_rules=relevant_rules,
            image_url=post.get("image_url")
        )
    except Exception as e:
        logger.error(f"[{post_id}] gemini_client.evaluate_compliance failed ({e}), using fallback.")
        ai_result = gemini_client._evaluate_with_rules_fallback(
            draft_text=full_text,
            intent_tags=intent,
            relevant_rules=relevant_rules,
            image_url=post.get("image_url")
        )

    logger.info(f"[{post_id}] Step 3: Evaluation completed in {time.time()-t_start:.2f}s. Score={ai_result.get('compliance_score')}")

    compliance_score = ai_result.get("compliance_score", 100)
    verdict = ai_result.get("verdict", "APPROVED" if compliance_score == 100 else "ACTION_REQUIRED")
    summary = ai_result.get("summary", "")
    raw_violations = ai_result.get("violations", [])

    report_id = str(uuid.uuid4())
    fast_tracked = (compliance_score == 100)

    # Format violations records
    violations_records = []
    for v in raw_violations:
        v_id = str(uuid.uuid4())
        record = {
            "id": v_id,
            "post_id": post_id,
            "audit_report_id": report_id,
            "rule_title": v.get("rule_title", "Brand Policy Rule"),
            "category": v.get("category", "GENERAL"),
            "severity": v.get("severity", "WARNING"),
            "page_ref": v.get("page_ref", 1),
            "document_name": v.get("document_name", "Brand Guidelines"),
            "offending_fragment": v.get("offending_fragment", ""),
            "violation_explanation": v.get("violation_explanation", ""),
            "suggested_fix": v.get("suggested_fix", ""),
            "is_resolved": False,
            "created_at": datetime.utcnow()
        }
        violations_records.append(record)

    # 1. Persist audit report to Supabase FIRST (parent foreign key)
    report_record = {
        "id": report_id,
        "post_id": post_id,
        "compliance_score": compliance_score,
        "verdict": verdict,
        "summary": summary,
        "violations": violations_records,
        "visual_audit": ai_result.get("visual_audit"),
        "fast_tracked": fast_tracked,
        "evaluated_at": datetime.utcnow()
    }
    await db_manager.save_audit_report(report_record)

    # 2. Persist child violations to Supabase SECOND
    for record in violations_records:
        await db_manager.save_violation(record)

    # Update post status + score in Supabase
    await db_manager.update_post(post_id, {
        "compliance_score": compliance_score,
        "status": "APPROVED" if fast_tracked else "ACTION_REQUIRED"
    })

    if fast_tracked:
        background_tasks.add_task(
            webhook_dispatcher.dispatch_fast_track_approval,
            post=post,
            audit_report=report_record
        )
        logger.info(f"Post '{post_id}' is 100% compliant. Scheduled fast-track webhook dispatch.")

    return report_record


@router.get("/reports/{post_id}", response_model=Optional[AuditReportResponse])
async def get_latest_audit_report(post_id: str, user: UserContext = Depends(get_current_user)):
    """Retrieve the latest audit report with violations from Supabase."""
    return await db_manager.get_audit_report(post_id)


@router.post("/apply-fix")
async def apply_one_click_fix(
    payload: ApplyFixRequest,
    user: UserContext = Depends(get_current_user)
):
    """
    1-Click Suggested Fix:
    Replaces offending text, marks violation resolved in Supabase,
    recalculates compliance score.
    """
    post = await db_manager.get_post_by_id(payload.post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Replace offending fragment in body
    body = post.get("body", "")
    if payload.offending_fragment in body:
        body = body.replace(payload.offending_fragment, payload.suggested_fix, 1)
    elif payload.offending_fragment.lower() in body.lower():
        pattern = re.compile(re.escape(payload.offending_fragment), re.IGNORECASE)
        body = pattern.sub(payload.suggested_fix, body, count=1)

    # Resolve violation in Supabase
    await db_manager.resolve_violation(payload.violation_id)

    # Recalculate score from remaining unresolved violations
    active_violations = db_manager.get_violations(payload.post_id)
    new_score = max(0, 100 - len(active_violations) * 15)
    new_status = "APPROVED" if new_score == 100 else "ACTION_REQUIRED"

    # Persist updated post
    updated_post = await db_manager.update_post(payload.post_id, {
        "body": body,
        "compliance_score": new_score,
        "status": new_status
    })

    return {
        "success": True,
        "message": "Fix applied successfully",
        "post": updated_post,
        "remaining_violations": len(active_violations),
        "new_score": new_score
    }


@router.post("/send-for-review", response_model=SendReviewResponse)
async def send_post_for_review(
    payload: SendReviewRequest,
    user: UserContext = Depends(get_current_user)
):
    """
    Sends draft post for higher-up review:
    Gmail, WhatsApp, Slack, Microsoft Teams.
    """
    try:
        response = await review_dispatcher.send_for_review(payload)
        return response
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error dispatching review: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to dispatch review: {str(e)}")


@router.post("/actions/approve")
async def approve_post_action(
    post_id: str,
    approver_name: Optional[str] = "Executive Reviewer",
    user: UserContext = Depends(get_current_user)
):
    """
    1-Click Manager Sign-Off — updates post to APPROVED in Supabase,
    resolves all violations.
    """
    post = await db_manager.get_post_by_id(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    await db_manager.resolve_all_violations(post_id)
    updated = await db_manager.update_post(post_id, {
        "status": "APPROVED",
        "compliance_score": 100
    })

    logger.info(f"Post '{post_id}' approved by {approver_name}.")
    return {
        "success": True,
        "message": f"Post '{post_id}' approved successfully by {approver_name}.",
        "post_status": "APPROVED",
        "post": updated
    }


@router.post("/upload-image")
async def upload_audit_image(
    file: UploadFile = File(...),
    user: UserContext = Depends(get_current_user)
):
    """
    Upload a social poster, banner, or creative asset for multimodal brand audit.
    Saves image asset locally and returns download URL & base64 data URI for instant inspection.
    """
    clean_ext = os.path.splitext(file.filename or "")[1].lower()
    if clean_ext not in [".png", ".jpg", ".jpeg", ".webp"]:
        clean_ext = ".png"

    filename = f"upload_{uuid.uuid4().hex[:12]}{clean_ext}"
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    assets_dir = os.path.join(backend_dir, "generated_assets")
    os.makedirs(assets_dir, exist_ok=True)

    file_path = os.path.join(assets_dir, filename)
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    mime_type = "image/png" if clean_ext == ".png" else ("image/webp" if clean_ext == ".webp" else "image/jpeg")
    b64_data = base64.b64encode(contents).decode("utf-8")
    data_uri = f"data:{mime_type};base64,{b64_data}"

    return {
        "filename": filename,
        "image_url": f"/api/generate/download/{filename}",
        "data_uri": data_uri,
        "size_bytes": len(contents)
    }


@router.post("/image", response_model=AuditReportResponse)
async def evaluate_image_compliance(
    file: UploadFile = File(...),
    draft_text: Optional[str] = Form(""),
    campaign_goal: Optional[str] = Form("Visual brand compliance"),
    channel: Optional[str] = Form("LinkedIn"),
    background_tasks: BackgroundTasks = None,
    user: UserContext = Depends(get_current_user)
):
    """
    Direct multimodal image evaluation:
    1. Uploads and saves creative banner / graphic.
    2. Creates a draft post with the image.
    3. Triggers multimodal compliance evaluation using Gemini Vision.
    """
    clean_ext = os.path.splitext(file.filename or "")[1].lower()
    if clean_ext not in [".png", ".jpg", ".jpeg", ".webp"]:
        clean_ext = ".png"

    filename = f"upload_{uuid.uuid4().hex[:12]}{clean_ext}"
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    assets_dir = os.path.join(backend_dir, "generated_assets")
    os.makedirs(assets_dir, exist_ok=True)

    file_path = os.path.join(assets_dir, filename)
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    image_url = f"/api/generate/download/{filename}"

    # Create post in database
    post_id = str(uuid.uuid4())
    now = datetime.utcnow()
    title = (draft_text[:50] if draft_text else file.filename) or "Visual Brand Creative"

    post_record = {
        "id": post_id,
        "org_id": user.org_id,
        "author_id": user.id,
        "title": title,
        "body": draft_text or f"Visual brand creative: {file.filename}",
        "image_url": image_url,
        "intent_tags": {
            "category": "Visual Creative",
            "target_audience": "General B2B",
            "campaign_goal": campaign_goal or "Visual brand compliance",
            "user_description": campaign_goal or "",
            "intended_tone": "Attractive & Bold",
            "target_channel": channel or "LinkedIn"
        },
        "status": "DRAFT",
        "compliance_score": None,
        "created_at": now,
        "updated_at": now
    }
    await db_manager.save_post(post_record)

    trigger_payload = AuditTriggerRequest(post_id=post_id)
    return await evaluate_post_compliance(
        payload=trigger_payload,
        background_tasks=background_tasks or BackgroundTasks(),
        user=user
    )
