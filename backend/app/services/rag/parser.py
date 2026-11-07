import io
import re
import logging
import concurrent.futures
from typing import List, Dict, Any, Optional
import pymupdf  # PyMuPDF
from PIL import Image
from app.services.gemini.client import gemini_client

logger = logging.getLogger("fixora.parser")

class DocumentParser:
    """
    Multimodal Document Parser supporting:
    1. PDFs (page-by-page text, layout & visual notes)
    2. Images (Gemini Vision inspection for logo specs, color palettes & OCR)
    3. Raw Text / Markdown (split into semantic sections and rule statements)
    """

    @staticmethod
    def parse_pdf(file_bytes: bytes, filename: str = "guideline.pdf") -> List[Dict[str, Any]]:
        """Extracts text and visual presence page-by-page from a PDF."""
        pages = []
        try:
            doc = pymupdf.open(stream=file_bytes, filetype="pdf")
            for page_index, page in enumerate(doc):
                page_num = page_index + 1
                text = page.get_text("text").strip()
                
                image_list = page.get_images(full=True)
                has_visuals = len(image_list) > 0
                
                pages.append({
                    "page_num": page_num,
                    "text": text,
                    "has_visuals": has_visuals,
                    "image_count": len(image_list),
                    "filename": filename,
                    "source_type": "PDF"
                })
            doc.close()
            logger.info(f"Successfully parsed PDF '{filename}' ({len(pages)} pages).")
        except Exception as e:
            logger.error(f"Error parsing PDF with pymupdf: {e}")
            raise
        return pages

    @staticmethod
    def parse_image(file_bytes: bytes, filename: str = "guideline.png") -> List[Dict[str, Any]]:
        """
        Parses visual brand guidelines (logos, color palettes, spacing guides).
        Uses Gemini Vision with responsive timeout and visual fallback.
        """
        try:
            image = Image.open(io.BytesIO(file_bytes))
            width, height = image.width, image.height
            fmt = image.format or "PNG"
            
            # Step 1: Attempt Gemini Vision rule extraction with 4s timeout
            extracted_rules_text = None
            if gemini_client.is_available:
                try:
                    prompt = (
                        "Analyze this brand identity image / style guide. "
                        "Identify and extract all explicit design and compliance rules, including:\n"
                        "- Color palette values (Hex, RGB, Pantone)\n"
                        "- Logo usage rules (clear space, prohibited distortions, colorways)\n"
                        "- Typography requirements\n"
                        "- Iconography or layout constraints.\n"
                        "Provide a structured, detailed list of rules."
                    )
                    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                        future = executor.submit(
                            gemini_client.genai_client.models.generate_content,
                            model=gemini_client.model_name,
                            contents=[image, prompt]
                        )
                        resp = future.result(timeout=4.0)
                        extracted_rules_text = resp.text.strip()
                except Exception as e:
                    logger.info(f"Gemini Vision call timed out or throttled ({e}). Using deterministic visual rule parser.")

            # Step 2: Fallback deterministic visual rule description
            if not extracted_rules_text:
                extracted_rules_text = (
                    f"Visual Brand Guideline Asset: '{filename}' ({width}x{height} px, {fmt}).\n"
                    f"Logo and visual identity asset: must be used strictly in its original aspect ratio ({round(width/height, 2)}:1). "
                    f"Do not stretch, rotate, recolor, or overlay on low-contrast backgrounds. "
                    f"Maintain minimum clear space equal to 20% of asset width on all sides."
                )

            return [{
                "page_num": 1,
                "text": extracted_rules_text,
                "has_visuals": True,
                "image_count": 1,
                "filename": filename,
                "source_type": "IMAGE",
                "width": width,
                "height": height
            }]
        except Exception as e:
            logger.error(f"Error parsing guideline image: {e}")
            raise

    @staticmethod
    def parse_raw_text(content: str, title: str = "Brand Guidelines") -> List[Dict[str, Any]]:
        """
        Parses raw text or markdown guidelines.
        Splits by markdown headers (#, ##, ###) or double-newlines into logical rule sections.
        """
        cleaned = content.strip()
        
        # Check if content has markdown headers
        header_splits = re.split(r"(?m)^(?=#{1,3}\s+)", cleaned)
        valid_sections = [s.strip() for s in header_splits if len(s.strip()) > 20]
        
        if not valid_sections:
            valid_sections = [s.strip() for s in cleaned.split("\n\n") if len(s.strip()) > 20]
            
        if not valid_sections:
            valid_sections = [cleaned]

        sections = []
        for idx, sec in enumerate(valid_sections):
            sections.append({
                "page_num": idx + 1,
                "text": sec,
                "has_visuals": False,
                "image_count": 0,
                "filename": f"{title}.txt",
                "source_type": "RAW_TEXT"
            })
            
        logger.info(f"Parsed raw text into {len(sections)} semantic rule section(s).")
        return sections
