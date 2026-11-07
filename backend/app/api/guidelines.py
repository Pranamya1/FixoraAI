import asyncio
import uuid
import logging
import json
import re
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from app.core.config import settings
from app.models.guideline import BrandGuidelineResponse, GuidelineChunkResponse, GuidelineTextCreate
from app.services.rag.parser import DocumentParser
from app.services.rag.chunker import SemanticChunker
from app.services.rag.vector_store import vector_store
from app.core.database import db_manager
from app.core.security import get_current_user, UserContext

logger = logging.getLogger("fixora.api.guidelines")
router = APIRouter(prefix="/guidelines", tags=["Brand Guidelines (Multimodal RAG)"])

@router.get("", response_model=List[BrandGuidelineResponse])
async def list_guidelines(user: UserContext = Depends(get_current_user)):
    """List all registered brand guidelines for the user's organization."""
    if db_manager.is_connected and db_manager.supabase:
        try:
            def _query():
                return db_manager.supabase.table("brand_guidelines").select("*").eq("org_id", user.org_id).execute()
            res = await asyncio.wait_for(asyncio.to_thread(_query), timeout=3.0)
            if res and res.data:
                return res.data
        except Exception as e:
            logger.warning(f"Error querying Supabase guidelines: {e}")

    return [g for g in db_manager._memory_store["brand_guidelines"] if g.get("org_id") == user.org_id]

@router.get("/{guideline_id}", response_model=BrandGuidelineResponse)
async def get_guideline(guideline_id: str, user: UserContext = Depends(get_current_user)):
    """Get single brand guideline details with all indexed rule chunks."""
    if db_manager.is_connected and db_manager.supabase:
        try:
            res = db_manager.supabase.table("brand_guidelines").select("*").eq("id", guideline_id).execute()
            if res.data:
                g = res.data[0]
                chunks_res = db_manager.supabase.table("guideline_chunks").select("id, guideline_id, page_num, rule_category, rule_title, chunk_text, severity_default, target_channels, target_audiences, created_at").eq("guideline_id", guideline_id).execute()
                g["chunks"] = chunks_res.data or []
                return g
        except Exception as e:
            logger.warning(f"Error fetching guideline from Supabase: {e}")

    guidelines = [g for g in db_manager._memory_store["brand_guidelines"] if g.get("id") == guideline_id]
    if not guidelines:
        raise HTTPException(status_code=404, detail="Guideline not found")
    
    g = dict(guidelines[0])
    g["chunks"] = [c for c in db_manager._memory_store["guideline_chunks"] if c.get("guideline_id") == guideline_id]
    return g

@router.post("/upload", response_model=BrandGuidelineResponse)
async def upload_guideline(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    version: Optional[str] = Form("v1.0"),
    user: UserContext = Depends(get_current_user)
):
    """
    Multimodal File Ingestion:
    - Supports PDFs (extracts page-by-page text, layout & embedded imagery)
    - Supports Images (PNG, JPG, SVG, WebP: uses Gemini Vision to inspect colors & logo specs)
    - Supports Raw Text/Markdown files (.txt, .md)
    """
    guideline_id = str(uuid.uuid4())
    doc_name = name or file.filename or "Brand Guideline"
    content = await file.read()
    
    content_type = file.content_type or ""
    filename_lower = (file.filename or "").lower()

    # Route parser based on multimodal file type
    if filename_lower.endswith(".pdf") or "pdf" in content_type:
        pages = DocumentParser.parse_pdf(content, filename=file.filename or "guideline.pdf")
        detected_type = "application/pdf"
    elif any(filename_lower.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp", ".svg"]) or "image" in content_type:
        pages = DocumentParser.parse_image(content, filename=file.filename or "guideline.png")
        detected_type = content_type or "image/png"
    elif any(filename_lower.endswith(ext) for ext in [".txt", ".md", ".markdown"]) or "text" in content_type:
        text_str = content.decode("utf-8", errors="ignore")
        pages = DocumentParser.parse_raw_text(text_str, title=doc_name)
        detected_type = "text/plain"
    else:
        try:
            pages = DocumentParser.parse_pdf(content, filename=file.filename or "doc")
            detected_type = "application/pdf"
        except Exception:
            text_str = content.decode("utf-8", errors="ignore")
            pages = DocumentParser.parse_raw_text(text_str, title=doc_name)
            detected_type = "text/plain"

    # Step 1: Insert master record FIRST (satisfying foreign key constraint)
    record = {
        "id": guideline_id,
        "org_id": user.org_id,
        "name": doc_name,
        "version": version,
        "file_url": f"/uploads/{file.filename}",
        "file_type": detected_type,
        "status": "ready",
        "total_rules_extracted": 0,
        "created_at": datetime.utcnow()
    }

    if db_manager.is_connected and db_manager.supabase:
        try:
            payload = dict(record)
            payload["created_at"] = payload["created_at"].isoformat()
            db_manager.supabase.table("brand_guidelines").insert(payload).execute()
        except Exception as e:
            logger.error(f"Error saving guideline master record to Supabase: {e}")

    # Step 2: Chunk into atomic rules with metadata (run off-thread to avoid blocking event loop)
    chunks = await asyncio.to_thread(
        SemanticChunker.chunk_document,
        pages,
        guideline_id,
        user.org_id
    )
    
    # Step 3: Generate 768-dim embeddings & store in Supabase pgvector (off-thread)
    stored_count = await asyncio.to_thread(vector_store.store_chunks, chunks)

    # Step 4: Update total_rules_extracted
    record["total_rules_extracted"] = stored_count
    if db_manager.is_connected and db_manager.supabase:
        try:
            db_manager.supabase.table("brand_guidelines").update({"total_rules_extracted": stored_count}).eq("id", guideline_id).execute()
        except Exception as e:
            logger.warning(f"Error updating rule count: {e}")

    db_manager._memory_store["brand_guidelines"].append(record)
    logger.info(f"Successfully ingested multimodal guideline '{doc_name}' ({detected_type}) with {stored_count} rules indexed.")
    return record

@router.post("/raw", response_model=BrandGuidelineResponse)
async def ingest_raw_text_guideline(
    payload: GuidelineTextCreate,
    user: UserContext = Depends(get_current_user)
):
    """
    Direct Raw Text & Markdown Ingestion:
    Paste plain text or markdown brand guidelines directly.
    Splits into sections, extracts rules, categorizes, and indexes vectors into Supabase.
    """
    guideline_id = str(uuid.uuid4())
    record = {
        "id": guideline_id,
        "org_id": user.org_id,
        "name": payload.name,
        "version": payload.version,
        "file_url": None,
        "file_type": "text/markdown",
        "status": "ready",
        "total_rules_extracted": 0,
        "created_at": datetime.utcnow()
    }

    # Step 1: Insert master record first
    if db_manager.is_connected and db_manager.supabase:
        try:
            db_payload = dict(record)
            db_payload["created_at"] = db_payload["created_at"].isoformat()
            db_manager.supabase.table("brand_guidelines").insert(db_payload).execute()
        except Exception as e:
            logger.error(f"Error saving raw guideline to Supabase: {e}")

    # Step 2: Parse sections and chunk (run off-thread to avoid blocking event loop)
    pages = await asyncio.to_thread(DocumentParser.parse_raw_text, payload.content, payload.name)
    chunks = await asyncio.to_thread(
        SemanticChunker.chunk_document,
        pages,
        guideline_id,
        user.org_id
    )
    stored_count = await asyncio.to_thread(vector_store.store_chunks, chunks)

    # Step 3: Update count
    record["total_rules_extracted"] = stored_count
    if db_manager.is_connected and db_manager.supabase:
        try:
            db_manager.supabase.table("brand_guidelines").update({"total_rules_extracted": stored_count}).eq("id", guideline_id).execute()
        except Exception as e:
            logger.warning(f"Error updating count: {e}")

    db_manager._memory_store["brand_guidelines"].append(record)
    logger.info(f"Ingested raw text guideline '{payload.name}' with {stored_count} rules indexed.")
    return record


@router.delete("/{guideline_id}", status_code=204)
async def delete_guideline(guideline_id: str, user: UserContext = Depends(get_current_user)):
    """
    Delete a brand guideline and all its associated vector chunks.
    Removes from Supabase (if connected) and in-memory store.
    """
    # 1. Verify the guideline exists
    found = False
    for g in db_manager._memory_store["brand_guidelines"]:
        if g.get("id") == guideline_id:
            found = True
            break

    if db_manager.is_connected and db_manager.supabase:
        try:
            res = db_manager.supabase.table("brand_guidelines").select("id").eq("id", guideline_id).execute()
            if res.data:
                found = True
        except Exception as e:
            logger.warning(f"Supabase guideline lookup failed: {e}")

    if not found:
        raise HTTPException(status_code=404, detail="Guideline not found or access denied")

    # 2. Delete from Supabase (cascades to guideline_chunks if FK set)
    if db_manager.is_connected and db_manager.supabase:
        try:
            db_manager.supabase.table("guideline_chunks").delete().eq("guideline_id", guideline_id).execute()
            db_manager.supabase.table("brand_guidelines").delete().eq("id", guideline_id).execute()
        except Exception as e:
            logger.warning(f"Supabase guideline delete failed: {e}")

    # 3. Remove from in-memory store
    db_manager._memory_store["brand_guidelines"] = [
        g for g in db_manager._memory_store["brand_guidelines"] if g.get("id") != guideline_id
    ]
    db_manager._memory_store["guideline_chunks"] = [
        c for c in db_manager._memory_store["guideline_chunks"] if c.get("guideline_id") != guideline_id
    ]

    # 4. Remove from vector store in-memory index
    try:
        vector_store.chunks = [c for c in vector_store.chunks if c.get("guideline_id") != guideline_id]
    except Exception:
        pass

    logger.info(f"Deleted guideline {guideline_id} and its chunks for org {user.org_id}")
    return None

class AnalyzeTextRulesRequest(BaseModel):
    content: str
    company_name: Optional[str] = "Company"

@router.post("/analyze-text-rules")
async def analyze_text_rules(payload: AnalyzeTextRulesRequest):
    """
    AI-Powered Rule Analysis:
    Extracts structured, editable brand rules from plain text input.
    """
    content = payload.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Content cannot be empty")

    company_name = payload.company_name or "Company"
    extracted_rules = []

    # Attempt extraction via Gemini if available
    if settings.GEMINI_API_KEY:
        try:
            from google import genai
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            prompt = f"""
You are an expert brand governance auditor for {company_name}.
Extract specific, actionable brand and content guidelines from the following text into a JSON array.
Each object must have:
- "title": Short distinct rule title (e.g. "Attractive & Bold Hooks", "Competitor Reference Ban")
- "category": One of ["TONE_OF_VOICE", "LOGO_SPECIFICATION", "COLOR_PALETTE", "TYPOGRAPHY", "LEGAL_CLAIMS", "COMPETITOR_POLICY", "GENERAL"]
- "rule_text": Concrete actionable instruction or policy statement
- "severity": One of ["CRITICAL", "WARNING", "SUGGESTION"]

Text:
\"\"\"
{content}
\"\"\"

Respond ONLY with valid JSON array of objects.
"""
            res = client.models.generate_content(
                model=settings.GEMINI_MODEL or "gemini-3-flash-preview",
                contents=prompt
            )
            raw_text = res.text.strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text.split("```json")[1].split("```")[0].strip()
            elif raw_text.startswith("```"):
                raw_text = raw_text.split("```")[1].split("```")[0].strip()
            data = json.loads(raw_text)
            if isinstance(data, list):
                extracted_rules = data
        except Exception as e:
            logger.warning(f"Gemini rule extraction fallback: {e}")

    # Fallback heuristic parser if Gemini extraction didn't populate
    if not extracted_rules:
        # Split lines / sentences
        lines = [line.strip() for line in re.split(r'[\n\r]+|[.!?]\s+', content) if len(line.strip()) > 8]
        for idx, line in enumerate(lines[:8]):
            lower = line.lower()
            cat = "GENERAL"
            sev = "WARNING"
            if any(w in lower for w in ["tone", "voice", "attractive", "bold", "clear", "professional", "slang", "fluff"]):
                cat = "TONE_OF_VOICE"
            elif any(w in lower for w in ["competitor", "rival", "disparage", "attack", "other agency"]):
                cat = "COMPETITOR_POLICY"
                sev = "CRITICAL"
            elif any(w in lower for w in ["guarantee", "revenue", "roi", "claim", "promise", "legal"]):
                cat = "LEGAL_CLAIMS"
                sev = "CRITICAL"
            elif any(w in lower for w in ["color", "palette", "blue", "hex"]):
                cat = "COLOR_PALETTE"
            elif any(w in lower for w in ["font", "typography", "heading"]):
                cat = "TYPOGRAPHY"

            extracted_rules.append({
                "title": f"Rule {idx+1}: {line[:35]}...",
                "category": cat,
                "rule_text": line,
                "severity": sev
            })

    return {"rules": extracted_rules}
