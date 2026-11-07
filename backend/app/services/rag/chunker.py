import re
import logging
from typing import List, Dict, Any
from app.models.guideline import RuleCategory, SeverityLevel

logger = logging.getLogger("fixora.chunker")

class SemanticChunker:
    """
    Splits brand guideline documents into atomic, rule-level chunks with metadata tags.
    """
    
    # Category detection keywords
    CATEGORY_PATTERNS = {
        RuleCategory.COLOR_PALETTE: [r"color", r"palette", r"hex", r"#\w{6}", r"rgb", r"cmyk", r"primary color", r"secondary color"],
        RuleCategory.LOGO_SPECIFICATION: [r"logo", r"icon", r"wordmark", r"clear space", r"minimum size", r"lockup", r"placement"],
        RuleCategory.TYPOGRAPHY: [r"typography", r"font", r"typeface", r"heading", r"body text", r"kerning", r"sans-serif"],
        RuleCategory.TONE_OF_VOICE: [r"tone", r"voice", r"persona", r"conversational", r"jargon", r"slang", r"writing style", r"grammar"],
        RuleCategory.LEGAL_CLAIMS: [r"legal", r"claim", r"disclaimer", r"guarantee", r"patent", r"trademark", r"compliance", r"liability"],
        RuleCategory.COMPETITOR_POLICY: [r"competitor", r"rival", r"comparison", r"benchmark", r"disparage", r"naming competitors"]
    }

    @classmethod
    def detect_category(cls, text: str) -> RuleCategory:
        lower_text = text.lower()
        for category, patterns in cls.CATEGORY_PATTERNS.items():
            for pat in patterns:
                if re.search(pat, lower_text):
                    return category
        return RuleCategory.GENERAL

    @classmethod
    def detect_severity(cls, text: str) -> SeverityLevel:
        lower_text = text.lower()
        if any(w in lower_text for w in ["never", "strictly prohibited", "forbidden", "illegal", "must not", "zero tolerance"]):
            return SeverityLevel.CRITICAL
        if any(w in lower_text for w in ["avoid", "should not", "discouraged", "unrecommended", "warning"]):
            return SeverityLevel.WARNING
        return SeverityLevel.SUGGESTION

    @classmethod
    def chunk_document(cls, pages: List[Dict[str, Any]], guideline_id: str, org_id: str) -> List[Dict[str, Any]]:
        chunks = []
        
        for page in pages:
            page_num = page["page_num"]
            raw_text = page["text"]
            
            if not raw_text.strip():
                # If page is primarily image-based
                if page.get("has_visuals"):
                    chunks.append({
                        "guideline_id": guideline_id,
                        "org_id": org_id,
                        "page_num": page_num,
                        "rule_title": f"Visual Brand Asset (Page {page_num})",
                        "rule_category": RuleCategory.LOGO_SPECIFICATION,
                        "chunk_text": f"Visual identity specification and graphical layout asset on page {page_num}.",
                        "severity_default": SeverityLevel.WARNING,
                        "target_channels": ["all"],
                        "target_audiences": ["all"]
                    })
                continue
            
            # Split page into logical sections / paragraphs
            paragraphs = [p.strip() for p in raw_text.split("\n\n") if len(p.strip()) > 30]
            if not paragraphs:
                paragraphs = [raw_text.strip()]

            for p_idx, para in enumerate(paragraphs):
                # Clean multiple whitespaces
                cleaned_text = re.sub(r"\s+", " ", para)
                category = cls.detect_category(cleaned_text)
                severity = cls.detect_severity(cleaned_text)
                
                # Derive title from first line or category
                lines = [l.strip() for l in para.split("\n") if l.strip()]
                first_line = lines[0] if lines else f"{category.value} Rule"
                rule_title = first_line[:80] if len(first_line) > 10 else f"{category.value} Policy (Page {page_num})"

                # Channel affinity detection
                channels = ["all"]
                lower = cleaned_text.lower()
                matched_channels = []
                for ch in ["linkedin", "twitter", "x", "instagram", "facebook", "tiktok", "youtube"]:
                    if ch in lower:
                        matched_channels.append(ch)
                if matched_channels:
                    channels = matched_channels

                chunks.append({
                    "guideline_id": guideline_id,
                    "org_id": org_id,
                    "page_num": page_num,
                    "rule_title": rule_title,
                    "rule_category": category,
                    "chunk_text": cleaned_text,
                    "severity_default": severity,
                    "target_channels": channels,
                    "target_audiences": ["all"]
                })
                
        logger.info(f"Chunked document into {len(chunks)} rule chunks across {len(pages)} pages.")
        return chunks
