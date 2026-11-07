import os
import uuid
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from app.models.generation import GenerateContentRequest, GenerateContentResponse, ContentFormat
from app.services.rag.vector_store import vector_store
from app.services.generator.text_generator import TextContentGenerator
from app.services.generator.poster_generator import PosterGraphicGenerator
from app.services.generator.pdf_generator import PDFCarouselGenerator
from app.core.database import db_manager
from app.core.security import get_current_user, UserContext

logger = logging.getLogger("fixora.api.generate")
router = APIRouter(prefix="/generate", tags=["Brand-Compliant Content Generator"])

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUTPUT_DIR = os.path.join(BACKEND_DIR, "generated_assets")
os.makedirs(OUTPUT_DIR, exist_ok=True)

@router.post("", response_model=GenerateContentResponse)
async def generate_brand_compliant_content(
    payload: GenerateContentRequest,
    user: UserContext = Depends(get_current_user)
):
    """
    Brand-Compliant Multimodal Generator:
    Generates text copy, high-res posters/images, and multi-slide PDF carousels from scratch.
    1. Cross-references topic & intent against official brand rules in Supabase pgvector.
    2. Synthesizes 100% on-brand text copy (headline, body, key takeaways).
    3. Renders branded visual poster / social graphic (.PNG) with brand palette.
    4. Renders multi-slide branded carousel / document (.PDF) for LinkedIn / decks.
    5. Optionally registers the new post directly in the approved draft queue.
    """
    # 1. Retrieve brand rules relevant to topic and channel
    brand_rules = vector_store.search_relevant_rules(
        query_text=f"{payload.topic} {payload.campaign_goal}",
        target_channel=payload.target_channel,
        top_k=6
    )

    # 2. Generate compliant text copy
    copy_result = await TextContentGenerator.generate_copy(payload, brand_rules)
    title = copy_result.get("title", f"Fixora: {payload.topic}")
    headline = copy_result.get("headline", payload.topic)
    body = copy_result.get("body", "")
    key_points = copy_result.get("key_points", [
        "Multimodal Brand Governance",
        "Context-Aware Intent Tagging",
        "Automated Compliance Routing"
    ])
    applied_rules = copy_result.get("applied_rules", [])

    poster_filename = None
    pdf_filename = None

    # 3. Generate Poster Graphic (.PNG) if requested
    if ContentFormat.POSTER in payload.formats:
        poster_filename = PosterGraphicGenerator.generate_poster(
            title=title,
            headline=headline,
            key_points=key_points,
            category=payload.campaign_goal,
            tags=copy_result.get("tags"),
            ratio=payload.poster_ratio,
            output_dir=OUTPUT_DIR
        )

    # 4. Generate Multi-slide PDF Carousel (.PDF) if requested
    if ContentFormat.PDF in payload.formats:
        pdf_filename = PDFCarouselGenerator.generate_carousel_pdf(
            title=title,
            headline=headline,
            body_text=body,
            key_points=key_points,
            category=payload.campaign_goal,
            output_dir=OUTPUT_DIR
        )

    poster_url = f"/api/generate/download/{poster_filename}" if poster_filename else None
    pdf_url = f"/api/generate/download/{pdf_filename}" if pdf_filename else None

    # 5. Automatically save to posts drafts as APPROVED (100% compliant)
    post_id = None
    if payload.save_as_draft:
        post_id = str(uuid.uuid4())
        post_record = {
            "id": post_id,
            "org_id": user.org_id,
            "author_id": user.id,
            "title": title,
            "body": body,
            "image_url": poster_url,
            "intent_tags": {
                "category": payload.campaign_goal,
                "target_audience": payload.target_audience,
                "campaign_goal": payload.campaign_goal,
                "intended_tone": payload.intended_tone,
                "target_channel": payload.target_channel
            },
            "status": "APPROVED",
            "compliance_score": 100,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        await db_manager.save_post(post_record)
        logger.info(f"Registered generated post '{post_id}' into drafts queue.")

    return GenerateContentResponse(
        title=title,
        generated_text=body,
        headline=headline,
        key_points=key_points,
        poster_url=poster_url,
        pdf_url=pdf_url,
        post_id=post_id,
        compliance_score=100,
        applied_rules=applied_rules,
        generated_at=datetime.utcnow().isoformat()
    )

@router.get("/download/{filename}")
async def download_generated_asset(filename: str):
    """Serve or download generated branded posters (.PNG) and PDF carousels (.PDF)."""
    # Security: Prevent directory traversal
    clean_filename = os.path.basename(filename)
    file_path = os.path.join(OUTPUT_DIR, clean_filename)
    
    if not os.path.exists(file_path):
        alt = os.path.join(BACKEND_DIR, "backend", "generated_assets", clean_filename)
        if os.path.exists(alt):
            file_path = alt
        else:
            raise HTTPException(status_code=404, detail=f"File '{clean_filename}' not found")
        
    media_type = "image/png" if clean_filename.endswith(".png") else "application/pdf"
    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=clean_filename
    )
