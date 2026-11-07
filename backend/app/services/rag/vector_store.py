import logging
import math
import uuid
from typing import List, Dict, Any, Optional
from app.core.database import db_manager
from app.services.gemini.client import gemini_client
from app.models.guideline import RuleCategory, SeverityLevel

logger = logging.getLogger("fixora.vector_store")

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot / (norm1 * norm2)

class VectorStore:
    def __init__(self):
        self.db = db_manager
        self._ensure_seed_guidelines()

    def _ensure_seed_guidelines(self):
        """Disabled: Zero pre-population for new users."""
        return
        org_id = "00000000-0000-0000-0000-000000000001"
        
        seed_rules = [
            {
                "rule_title": "Prohibition of Unsubstantiated Guarantees",
                "category": RuleCategory.LEGAL_CLAIMS,
                "page_num": 4,
                "severity": SeverityLevel.CRITICAL,
                "text": "Never promise absolute guarantees (e.g. 'we guarantee 100% conversion' or 'guaranteed zero-downtime') without legal team disclaimer footnote.",
                "channels": ["all"]
            },
            {
                "rule_title": "Direct Competitor Comparison & Disparagement",
                "category": RuleCategory.COMPETITOR_POLICY,
                "page_num": 6,
                "severity": SeverityLevel.CRITICAL,
                "text": "Direct disparagement or unverified benchmark comparison against named competitors (e.g. Salesforce, HubSpot, OpenAI) is strictly prohibited.",
                "channels": ["linkedin", "twitter"]
            },
            {
                "rule_title": "B2B Value-Oriented Tone & Diction",
                "category": RuleCategory.TONE_OF_VOICE,
                "page_num": 2,
                "severity": SeverityLevel.WARNING,
                "text": "Maintain an authoritative, empowering, and professional tone. Avoid slang, buzzwords, or diminutive adjectives like 'cheap', using 'cost-effective' instead.",
                "channels": ["linkedin", "blog"]
            },
            {
                "rule_title": "Primary Color Palette & Contrast Specs",
                "category": RuleCategory.COLOR_PALETTE,
                "page_num": 3,
                "severity": SeverityLevel.WARNING,
                "text": "Official brand primary is Fixora Violet (#6366F1) and Deep Slate (#0F172A). Background contrast ratio must adhere to WCAG AA (4.5:1 minimum).",
                "channels": ["instagram", "all"]
            },
            {
                "rule_title": "Primary Wordmark Logo Usage and Clear Space",
                "category": RuleCategory.LOGO_SPECIFICATION,
                "page_num": 5,
                "severity": SeverityLevel.CRITICAL,
                "text": "Always preserve a clear space equal to the height of the 'F' glyph around the Fixora logo. Never rotate, alter hues, or place on busy photographic backgrounds.",
                "channels": ["all"]
            },
            {
                "rule_title": "Superlative Claims Substantiation",
                "category": RuleCategory.LEGAL_CLAIMS,
                "page_num": 4,
                "severity": SeverityLevel.CRITICAL,
                "text": "Do not use unverified superlative marketing statements like 'the best AI in the world' or '#1 platform' without peer-reviewed accreditation.",
                "channels": ["all"]
            }
        ]

        # 1. Seed Supabase if connected
        if self.db.is_connected and self.db.supabase:
            try:
                existing = self.db.supabase.table("brand_guidelines").select("id").eq("id", guideline_id).execute()
                if not existing.data:
                    self.db.supabase.table("brand_guidelines").insert({
                        "id": guideline_id,
                        "org_id": org_id,
                        "name": "Fixora Brand Identity & Compliance Handbook",
                        "version": "v1.0",
                        "file_url": "https://assets.fixora.ai/docs/fixora-brand-guide-v1.pdf",
                        "file_type": "application/pdf",
                        "status": "ready",
                        "total_rules_extracted": len(seed_rules)
                    }).execute()

                # Check if chunks exist in cloud
                existing_chunks = self.db.supabase.table("guideline_chunks").select("id").eq("guideline_id", guideline_id).execute()
                if not existing_chunks.data:
                    for r in seed_rules:
                        emb = gemini_client.generate_embedding(r["text"])
                        self.db.supabase.table("guideline_chunks").insert({
                            "guideline_id": guideline_id,
                            "org_id": org_id,
                            "page_num": r["page_num"],
                            "rule_category": r["category"].value,
                            "rule_title": r["rule_title"],
                            "chunk_text": r["text"],
                            "severity_default": r["severity"].value,
                            "target_channels": r["channels"],
                            "target_audiences": ["all"],
                            "embedding": emb
                        }).execute()
                    logger.info("Seeded Fixora Core Brand Guidelines into cloud Supabase pgvector.")
            except Exception as e:
                logger.warning(f"Failed to seed Supabase cloud tables: {e}")

        # 2. Always maintain memory store backup
        chunks = self.db._memory_store["guideline_chunks"]
        if not chunks:
            self.db._memory_store["brand_guidelines"].append({
                "id": guideline_id,
                "org_id": org_id,
                "name": "Fixora Brand Identity & Compliance Handbook",
                "version": "v1.0",
                "file_url": "https://assets.fixora.ai/docs/fixora-brand-guide-v1.pdf",
                "file_type": "application/pdf",
                "status": "ready",
                "total_rules_extracted": len(seed_rules),
                "created_at": "2026-11-04T12:00:00Z"
            })

            for idx, r in enumerate(seed_rules):
                emb = gemini_client.generate_embedding(r["text"])
                chunks.append({
                    "id": f"chunk-{idx+1}",
                    "guideline_id": guideline_id,
                    "org_id": org_id,
                    "page_num": r["page_num"],
                    "rule_category": r["category"].value,
                    "rule_title": r["rule_title"],
                    "chunk_text": r["text"],
                    "severity_default": r["severity"].value,
                    "target_channels": r["channels"],
                    "target_audiences": ["all"],
                    "embedding": emb,
                    "created_at": "2026-11-04T12:00:00Z"
                })

    def store_chunks(self, chunks: List[Dict[str, Any]]) -> int:
        stored_count = 0
        for chunk in chunks:
            if not chunk.get("embedding"):
                chunk["embedding"] = gemini_client.generate_embedding(chunk["chunk_text"])
            
            if self.db.is_connected and self.db.supabase:
                try:
                    payload = dict(chunk)
                    if "id" in payload and not payload["id"]:
                        del payload["id"]
                    self.db.supabase.table("guideline_chunks").insert(payload).execute()
                    stored_count += 1
                except Exception as e:
                    logger.error(f"Error inserting chunk to Supabase: {e}")
            else:
                if not chunk.get("id"):
                    chunk["id"] = f"chunk-{uuid.uuid4().hex[:8]}"
                self.db._memory_store["guideline_chunks"].append(chunk)
                stored_count += 1
                
        return stored_count

    def search_relevant_rules(
        self,
        query_text: str,
        target_channel: Optional[str] = None,
        target_audience: Optional[str] = None,
        top_k: int = 6
    ) -> List[Dict[str, Any]]:
        query_embedding = gemini_client.generate_embedding(query_text)

        if self.db.is_connected and self.db.supabase:
            try:
                rpc_res = self.db.supabase.rpc(
                    "match_guideline_chunks",
                    {
                        "query_embedding": query_embedding,
                        "match_threshold": 0.0,
                        "match_count": top_k
                    }
                ).execute()
                if rpc_res.data:
                    return rpc_res.data
            except Exception as e:
                logger.error(f"Supabase RPC search failed: {e}. Falling back to memory store.")

        # In-memory cosine search fallback
        all_chunks = self.db._memory_store["guideline_chunks"]
        results = []
        for chunk in all_chunks:
            channels = chunk.get("target_channels", ["all"])
            if target_channel and "all" not in channels:
                if target_channel.lower() not in [c.lower() for c in channels]:
                    continue

            emb = chunk.get("embedding")
            sim = cosine_similarity(query_embedding, emb) if emb else 0.5
            if chunk.get("severity_default") == "CRITICAL":
                sim += 0.05
                
            results.append({
                "id": chunk.get("id"),
                "guideline_id": chunk.get("guideline_id"),
                "page_num": chunk.get("page_num"),
                "rule_category": chunk.get("rule_category"),
                "rule_title": chunk.get("rule_title", "Brand Rule"),
                "chunk_text": chunk.get("chunk_text"),
                "severity_default": chunk.get("severity_default", "WARNING"),
                "similarity": round(sim, 4)
            })

        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:top_k]

vector_store = VectorStore()
