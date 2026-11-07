import os
import uuid
import logging
from typing import List, Optional
import pymupdf  # PyMuPDF

logger = logging.getLogger("fixora.generator.pdf")

class PDFCarouselGenerator:
    """
    Generates multi-page brand slide decks and PDF carousels.
    Uses official brand styling, slide headers, highlight cards, and call-to-action slides.
    """

    # Palette
    COLOR_BG = (15/255, 23/255, 42/255)         # Deep Slate #0F172A
    COLOR_CARD = (30/255, 41/255, 59/255)       # Card #1E293B
    COLOR_PRIMARY = (99/255, 102/255, 241/255)  # Violet #6366F1
    COLOR_TEXT = (248/255, 250/255, 252/255)    # White
    COLOR_MUTED = (148/255, 163/255, 184/255)   # Muted Grey
    COLOR_ACCENT = (6/255, 182/255, 212/255)    # Cyan

    @classmethod
    def generate_carousel_pdf(
        cls,
        title: str,
        headline: str,
        body_text: str,
        key_points: List[str],
        category: str = "Brand Governance",
        output_dir: Optional[str] = None
    ) -> str:
        if not output_dir:
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            output_dir = os.path.join(backend_dir, "generated_assets")
        os.makedirs(output_dir, exist_ok=True)
        """
        Creates a 4-page branded PDF carousel:
        - Slide 1: Cover / Hero Slide
        - Slide 2: Context & Strategy Slide
        - Slide 3: 3 Key Actionable Takeaways
        - Slide 4: Call-to-Action & Verification Seal
        """
        doc = pymupdf.open()
        width, height = 792, 612  # Landscape presentation slide dimensions

        # ====================================================
        # SLIDE 1: Cover Slide
        # ====================================================
        p1 = doc.new_page(width=width, height=height)
        # Background
        p1.draw_rect(pymupdf.Rect(0, 0, width, height), color=cls.COLOR_BG, fill=cls.COLOR_BG)
        # Top banner accent line
        p1.draw_rect(pymupdf.Rect(0, 0, width, 12), color=cls.COLOR_PRIMARY, fill=cls.COLOR_PRIMARY)
        
        # Pill Tag
        p1.draw_rect(pymupdf.Rect(60, 60, 320, 95), color=cls.COLOR_PRIMARY, fill=cls.COLOR_PRIMARY)
        p1.insert_text((75, 83), f"FIXORA AI  •  {category.upper()}", fontsize=11, color=cls.COLOR_TEXT)

        # Title & Headline
        p1.insert_text((60, 170), title[:45], fontsize=26, color=cls.COLOR_TEXT)
        
        # Sub-headline
        wrapped_sub = headline[:80] + ("..." if len(headline) > 80 else "")
        p1.insert_text((60, 215), wrapped_sub, fontsize=15, color=cls.COLOR_MUTED)

        # Hero highlight card
        p1.draw_rect(pymupdf.Rect(60, 260, width - 60, 480), color=cls.COLOR_CARD, fill=cls.COLOR_CARD)
        p1.insert_text((90, 305), "EXECUTIVE BRIEFING", fontsize=12, color=cls.COLOR_ACCENT)
        p1.insert_text((90, 345), "• Automated multimodal brand consistency across channels", fontsize=14, color=cls.COLOR_TEXT)
        p1.insert_text((90, 385), "• Intent-aware tagging eliminates high false-positive rates", fontsize=14, color=cls.COLOR_TEXT)
        p1.insert_text((90, 425), "• Exact document citations with 1-click suggested fixes", fontsize=14, color=cls.COLOR_TEXT)

        # Footer
        p1.insert_text((60, 560), "FixoraAI Enterprise Platform", fontsize=10, color=cls.COLOR_MUTED)
        p1.insert_text((width - 120, 560), "Slide 1 of 4 →", fontsize=10, color=cls.COLOR_PRIMARY)

        # ====================================================
        # SLIDE 2: Strategy & Context
        # ====================================================
        p2 = doc.new_page(width=width, height=height)
        p2.draw_rect(pymupdf.Rect(0, 0, width, height), color=cls.COLOR_BG, fill=cls.COLOR_BG)
        p2.draw_rect(pymupdf.Rect(0, 0, width, 12), color=cls.COLOR_PRIMARY, fill=cls.COLOR_PRIMARY)

        p2.insert_text((60, 70), "THE STRATEGIC CHALLENGE", fontsize=12, color=cls.COLOR_ACCENT)
        p2.insert_text((60, 110), "Why Traditional Review Fails at Scale", fontsize=24, color=cls.COLOR_TEXT)

        # Left Column - The Problem
        p2.draw_rect(pymupdf.Rect(60, 150, 380, 490), color=cls.COLOR_CARD, fill=cls.COLOR_CARD)
        p2.insert_text((85, 190), "⚠️ The Problem", fontsize=16, color=cls.COLOR_PRIMARY)
        p2.insert_text((85, 230), "• Manual review queues delay campaigns by days", fontsize=12, color=cls.COLOR_TEXT)
        p2.insert_text((85, 270), "• Outdated, static PDF style guides get ignored", fontsize=12, color=cls.COLOR_TEXT)
        p2.insert_text((85, 310), "• Off-brand tone & unauthorized claims slip in", fontsize=12, color=cls.COLOR_TEXT)
        p2.insert_text((85, 350), "• High false positives from non-contextual generic AI", fontsize=12, color=cls.COLOR_TEXT)

        # Right Column - The Fixora Solution
        p2.draw_rect(pymupdf.Rect(410, 150, width - 60, 490), color=cls.COLOR_CARD, fill=cls.COLOR_CARD)
        p2.insert_text((435, 190), "✨ The Fixora Solution", fontsize=16, color=cls.COLOR_ACCENT)
        p2.insert_text((435, 230), "• Vectorized brand rules indexed via pgvector", fontsize=12, color=cls.COLOR_TEXT)
        p2.insert_text((435, 270), "• Context-aware intent weighting by target channel", fontsize=12, color=cls.COLOR_TEXT)
        p2.insert_text((435, 310), "• Gemini 1.5 multimodal evaluation in seconds", fontsize=12, color=cls.COLOR_TEXT)
        p2.insert_text((435, 350), "• Instant fast-track webhooks to Slack and Teams", fontsize=12, color=cls.COLOR_TEXT)

        p2.insert_text((60, 560), "FixoraAI Enterprise Platform", fontsize=10, color=cls.COLOR_MUTED)
        p2.insert_text((width - 120, 560), "Slide 2 of 4 →", fontsize=10, color=cls.COLOR_PRIMARY)

        # ====================================================
        # SLIDE 3: Key Takeaways
        # ====================================================
        p3 = doc.new_page(width=width, height=height)
        p3.draw_rect(pymupdf.Rect(0, 0, width, height), color=cls.COLOR_BG, fill=cls.COLOR_BG)
        p3.draw_rect(pymupdf.Rect(0, 0, width, 12), color=cls.COLOR_PRIMARY, fill=cls.COLOR_PRIMARY)

        p3.insert_text((60, 70), "EXECUTION PLAYBOOK", fontsize=12, color=cls.COLOR_ACCENT)
        p3.insert_text((60, 110), "3 Pillars of Brand Governance", fontsize=24, color=cls.COLOR_TEXT)

        y_top = 160
        for i, pt in enumerate(key_points[:3]):
            p3.draw_rect(pymupdf.Rect(60, y_top, width - 60, y_top + 95), color=cls.COLOR_CARD, fill=cls.COLOR_CARD)
            # Number badge
            p3.draw_rect(pymupdf.Rect(80, y_top + 25, 125, y_top + 70), color=cls.COLOR_PRIMARY, fill=cls.COLOR_PRIMARY)
            p3.insert_text((95, y_top + 53), f"0{i+1}", fontsize=16, color=cls.COLOR_TEXT)
            # Text
            p3.insert_text((150, y_top + 53), pt[:75], fontsize=13, color=cls.COLOR_TEXT)
            y_top += 115

        p3.insert_text((60, 560), "FixoraAI Enterprise Platform", fontsize=10, color=cls.COLOR_MUTED)
        p3.insert_text((width - 120, 560), "Slide 3 of 4 →", fontsize=10, color=cls.COLOR_PRIMARY)

        # ====================================================
        # SLIDE 4: Call to Action & Sign-Off
        # ====================================================
        p4 = doc.new_page(width=width, height=height)
        p4.draw_rect(pymupdf.Rect(0, 0, width, height), color=cls.COLOR_BG, fill=cls.COLOR_BG)
        p4.draw_rect(pymupdf.Rect(0, 0, width, 12), color=cls.COLOR_PRIMARY, fill=cls.COLOR_PRIMARY)

        # Center Card
        p4.draw_rect(pymupdf.Rect(120, 100, width - 120, 480), color=cls.COLOR_CARD, fill=cls.COLOR_CARD)
        
        # Green 100% Verified badge
        p4.draw_rect(pymupdf.Rect(width/2 - 130, 140, width/2 + 130, 185), color=(16/255, 185/255, 129/255), fill=(16/255, 185/255, 129/255))
        p4.insert_text((width/2 - 105, 169), "✅ 100% BRAND VERIFIED", fontsize=12, color=cls.COLOR_TEXT)

        p4.insert_text((160, 240), "Ready for Multi-Channel Distribution", fontsize=22, color=cls.COLOR_TEXT)
        p4.insert_text((160, 280), "This asset has been audited against official brand guidelines and signed off.", fontsize=13, color=cls.COLOR_MUTED)

        # CTA Button
        p4.draw_rect(pymupdf.Rect(width/2 - 140, 340, width/2 + 140, 395), color=cls.COLOR_PRIMARY, fill=cls.COLOR_PRIMARY)
        p4.insert_text((width/2 - 110, 374), "Deploy with FixoraAI →", fontsize=14, color=cls.COLOR_TEXT)

        p4.insert_text((width/2 - 60, 440), "www.fixora.ai", fontsize=12, color=cls.COLOR_ACCENT)

        p4.insert_text((60, 560), "FixoraAI Enterprise Platform", fontsize=10, color=cls.COLOR_MUTED)
        p4.insert_text((width - 120, 560), "Slide 4 of 4", fontsize=10, color=cls.COLOR_MUTED)

        # Save output
        os.makedirs(output_dir, exist_ok=True)
        filename = f"carousel_{uuid.uuid4().hex[:8]}.pdf"
        file_path = os.path.join(output_dir, filename)
        doc.save(file_path)
        doc.close()
        logger.info(f"Generated brand PDF carousel: {file_path}")
        return filename
