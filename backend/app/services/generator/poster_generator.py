import os
import re
import uuid
import textwrap
import logging
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from typing import List, Optional
from app.models.generation import PosterRatio

logger = logging.getLogger("fixora.generator.poster")


# ─────────────────────────── helpers ──────────────────────────────────────────

def _strip_emoji(text: str) -> str:
    """Remove emoji / non-Latin unicode so PIL TrueType fonts render cleanly."""
    cleaned = re.sub(r'[^\u0000-\u024F\u1E00-\u1EFF\u2010-\u2027\u2030-\u205E]+', ' ', text)
    return re.sub(r'\s{2,}', ' ', cleaned).strip()


def _load_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    """Load Arial (bold or regular) at given size, falling back gracefully."""
    candidates_bold = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf",
        "/Library/Fonts/Arial Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    candidates_regular = [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in (candidates_bold if bold else candidates_regular):
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def _text_size(draw: ImageDraw.ImageDraw, text: str, font) -> tuple:
    """Return (width, height) of a text string."""
    try:
        bb = draw.textbbox((0, 0), text, font=font)
        return bb[2] - bb[0], bb[3] - bb[1]
    except Exception:
        fs = getattr(font, 'size', 14)
        return len(text) * int(fs * 0.6), fs + 4


def _draw_circle(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int, fill=None, outline=None, width=1):
    draw.ellipse([(cx - r, cy - r), (cx + r, cy + r)], fill=fill, outline=outline, width=width)


# ─────────────────────── poster class ─────────────────────────────────────────

class PosterGraphicGenerator:
    """
    Renders high-resolution brand posters and social media graphics.
    Applies official brand color palettes, typographic hierarchy, mesh glows, and modern card geometry.
    """

    DIMENSIONS = {
        PosterRatio.SQUARE:    (1080, 1080),
        PosterRatio.PORTRAIT:  (1080, 1350),
        PosterRatio.LANDSCAPE: (1200, 675),
        PosterRatio.STORY:     (1080, 1920),
    }

    # Brand Palette
    BG_OBSIDIAN = (8, 12, 22)       # #080C16
    BG_SLATE    = (14, 21, 38)      # #0E1526
    CARD_BG     = (18, 26, 46)      # #121A2E
    CARD_BORDER = (40, 56, 90)      # #28385A
    VIOLET      = (99, 102, 241)    # #6366F1
    VIOLET_GLOW = (139, 92, 246)    # #8B5CF6
    CYAN        = (6, 182, 212)     # #06B6D4
    CYAN_LIGHT  = (103, 232, 249)   # #67E8F9
    WHITE       = (248, 250, 252)   # #F8FAFC
    MUTED       = (148, 163, 184)   # #94A3B8

    @classmethod
    def generate_poster(
        cls,
        title: str,
        headline: str,
        key_points: List[str],
        category: str = "BRAND GOVERNANCE",
        tags: Optional[List[str]] = None,
        ratio: PosterRatio = PosterRatio.PORTRAIT,
        output_dir: Optional[str] = None,
    ) -> str:
        # 1. Resolve output directory
        if not output_dir:
            backend_dir = os.path.dirname(
                os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            )
            output_dir = os.path.join(backend_dir, "generated_assets")
        os.makedirs(output_dir, exist_ok=True)

        # 2. Sanitise text
        title_clean    = _strip_emoji(title)
        headline_clean = _strip_emoji(headline)
        category_clean = _strip_emoji(category).upper()
        key_points_clean = [_strip_emoji(p) for p in key_points if p.strip()]

        # Clean title: avoid "Post" at the end if present
        if title_clean.endswith(" Post"):
            title_clean = title_clean[:-5].strip()

        # Generate contextual tags if none provided
        if not tags or len(tags) == 0:
            is_hiring_detect = any(w in (title_clean + " " + category_clean).lower() for w in ["hire", "hiring", "developer", "engineer", "talent", "c "])
            if is_hiring_detect:
                tags = ["Remote-First", "High Equity", "C / C++", "Core Team"]
            elif "product" in category_clean.lower() or "launch" in category_clean.lower():
                tags = ["Brand-First AI", "Enterprise-Ready", "Zero Friction", "Real-Time Scan"]
            else:
                tags = ["Brand Intelligence", "Audit-Ready", "Omnichannel", "100% Verified"]

        W, H = cls.DIMENSIONS.get(ratio, (1080, 1350))
        M = 54   # Margin
        IW = W - M * 2

        # 3. Base Gradient Canvas
        img = Image.new("RGB", (W, H), color=cls.BG_OBSIDIAN)
        draw = ImageDraw.Draw(img)

        for y in range(H):
            t = y / H
            r = int(cls.BG_OBSIDIAN[0] + (cls.BG_SLATE[0] - cls.BG_OBSIDIAN[0]) * t)
            g = int(cls.BG_OBSIDIAN[1] + (cls.BG_SLATE[1] - cls.BG_OBSIDIAN[1]) * t)
            b = int(cls.BG_OBSIDIAN[2] + (cls.BG_SLATE[2] - cls.BG_OBSIDIAN[2]) * t)
            draw.line([(0, y), (W, y)], fill=(r, g, b))

        # 4. Modern Mesh Grid Overlay
        grid_spacing = 38
        for x in range(M, W - M, grid_spacing):
            draw.line([(x, M), (x, H - M)], fill=(22, 32, 54), width=1)
        for y in range(M, H - M, grid_spacing):
            draw.line([(M, y), (W - M, y)], fill=(22, 32, 54), width=1)

        # 5. Dynamic Ambient Glow Blurs (Studio Lighting)
        glow = Image.new("RGB", (W, H), (0, 0, 0))
        gd = ImageDraw.Draw(glow)
        
        # Top-right intense violet flare
        for step in range(400, 0, -4):
            t = step / 400
            col = (int(65 * t), int(35 * t), int(140 * t))
            gd.ellipse([(W - 160 - step, 100 - step), (W - 160 + step, 100 + step)], fill=col)
        
        # Mid-left cyan flare
        for step in range(350, 0, -4):
            t = step / 350
            col = (int(10 * t), int(70 * t), int(105 * t))
            gd.ellipse([(100 - step, 680 - step), (100 + step, 680 + step)], fill=col)
            
        # Lower atmospheric lift
        for step in range(320, 0, -4):
            t = step / 320
            col = (int(55 * t), int(30 * t), int(100 * t))
            gd.ellipse([(W - 180 - step, H - 280 - step), (W - 180 + step, H - 280 + step)], fill=col)

        glow = glow.filter(ImageFilter.GaussianBlur(radius=64))
        img = Image.blend(img, glow, alpha=0.72)
        draw = ImageDraw.Draw(img)

        # 6. Double Precision Boundary & Corner Marks
        draw.rounded_rectangle([(M - 16, M - 16), (W - M + 16, H - M + 16)], radius=28, outline=(36, 50, 80), width=2)
        draw.rounded_rectangle([(M, M), (W - M, H - M)], radius=20, outline=(28, 40, 68), width=1)

        cs = 8
        for cx, cy in [(M, M), (W - M, M), (M, H - M), (W - M, H - M)]:
            draw.line([(cx - cs, cy), (cx + cs, cy)], fill=cls.CYAN, width=2)
            draw.line([(cx, cy - cs), (cx, cy + cs)], fill=cls.CYAN, width=2)

        # 7. Top Header Dock
        y_cursor = M + 30
        font_badge = _load_font(18, bold=True)
        font_badge_sub = _load_font(16, bold=True)

        # Category Pill
        cw, ch = _text_size(draw, category_clean, font_badge)
        pill_w = cw + 46
        pill_h = 38
        draw.rounded_rectangle([(M + 24, y_cursor), (M + 24 + pill_w, y_cursor + pill_h)], radius=19, fill=(35, 45, 80), outline=cls.VIOLET, width=1)
        draw.ellipse([(M + 38, y_cursor + 14), (M + 48, y_cursor + 24)], fill=cls.VIOLET_GLOW)
        draw.text((M + 56, y_cursor + 10), category_clean, font=font_badge, fill=cls.WHITE)

        # Verified Token Pill
        status_text = "FIXORA // VERIFIED ON-BRAND"
        sw, sh = _text_size(draw, status_text, font_badge_sub)
        draw.rounded_rectangle([(W - M - 24 - sw - 32, y_cursor), (W - M - 24, y_cursor + pill_h)], radius=19, fill=(18, 32, 54), outline=(32, 60, 92), width=1)
        draw.ellipse([(W - M - 24 - sw - 20, y_cursor + 15), (W - M - 24 - sw - 12, y_cursor + 23)], fill=cls.CYAN)
        draw.text((W - M - 24 - sw - 4, y_cursor + 10), status_text, font=font_badge_sub, fill=cls.CYAN_LIGHT)

        y_cursor += pill_h + 36

        # 8. Hero Title (54px Bold)
        font_title = _load_font(54, bold=True)
        words = title_clean.split()
        lines = []
        curr = []
        for w in words:
            test_line = " ".join(curr + [w])
            tw, _ = _text_size(draw, test_line, font_title)
            if tw <= IW - 48:
                curr.append(w)
            else:
                if curr:
                    lines.append(" ".join(curr))
                curr = [w]
        if curr:
            lines.append(" ".join(curr))

        for line in lines[:2]:
            draw.text((M + 24, y_cursor), line, font=font_title, fill=cls.WHITE)
            _, lh = _text_size(draw, line, font_title)
            y_cursor += lh + 8

        # 9. Subtitle / Headline
        y_cursor += 8
        font_hdl = _load_font(26, bold=False)
        h_words = headline_clean.split()
        h_lines = []
        curr = []
        for w in h_words:
            test_line = " ".join(curr + [w])
            tw, _ = _text_size(draw, test_line, font_hdl)
            if tw <= IW - 48:
                curr.append(w)
            else:
                if curr:
                    h_lines.append(" ".join(curr))
                curr = [w]
        if curr:
            h_lines.append(" ".join(curr))

        for line in h_lines[:2]:
            draw.text((M + 24, y_cursor), line, font=font_hdl, fill=cls.CYAN_LIGHT)
            _, lh = _text_size(draw, line, font_hdl)
            y_cursor += lh + 6

        # 10. Interactive Attribute Tags Row
        y_cursor += 18
        font_tag = _load_font(18, bold=True)
        tag_x = M + 24
        for tag in (tags or [])[:4]:
            tag_str = _strip_emoji(tag).strip()
            tw, th = _text_size(draw, tag_str, font_tag)
            chip_w = tw + 28
            chip_h = 36
            draw.rounded_rectangle([(tag_x, y_cursor), (tag_x + chip_w, y_cursor + chip_h)], radius=18, fill=(28, 40, 68), outline=(50, 72, 115), width=1)
            draw.text((tag_x + 14, y_cursor + 8), tag_str, font=font_tag, fill=cls.WHITE)
            tag_x += chip_w + 14

        y_cursor += 56

        # 11. Key Feature Cards (126px Height each)
        font_hook = _load_font(25, bold=True)
        font_body = _load_font(21, bold=False)

        card_x1 = M + 24
        card_x2 = W - M - 24

        for idx, raw_pt in enumerate(key_points_clean[:3]):
            if ":" in raw_pt:
                hook_part, body_part = raw_pt.split(":", 1)
                hook_part = hook_part.strip()
                body_part = body_part.strip()
            else:
                hook_part = f"Takeaway 0{idx+1}"
                body_part = raw_pt.strip()

            card_h = 126
            card_top = y_cursor
            card_bot = card_top + card_h

            # Card body with subtle gradient border
            draw.rounded_rectangle([(card_x1, card_top), (card_x2, card_bot)], radius=18, fill=cls.CARD_BG, outline=cls.CARD_BORDER, width=1)
            
            # Left Vibrant Accent Bar
            accent_col = [cls.VIOLET, cls.CYAN, cls.VIOLET_GLOW][idx % 3]
            draw.rounded_rectangle([(card_x1, card_top), (card_x1 + 6, card_bot)], radius=3, fill=accent_col)

            # Number Badge Pill
            badge_cx = card_x1 + 44
            badge_cy = card_top + 63
            draw.ellipse([(badge_cx - 22, badge_cy - 22), (badge_cx + 22, badge_cy + 22)], fill=(32, 46, 78), outline=accent_col, width=1)
            num_str = f"0{idx+1}"
            font_num = _load_font(19, bold=True)
            nw, nh = _text_size(draw, num_str, font_num)
            draw.text((badge_cx - nw//2, badge_cy - nh//2 - 1), num_str, font=font_num, fill=cls.WHITE)

            # Text Layout
            tx = card_x1 + 88
            draw.text((tx, card_top + 24), hook_part, font=font_hook, fill=cls.WHITE)
            
            # Wrap body text
            b_words = body_part.split()
            b_lines = []
            curr = []
            for w in b_words:
                test_line = " ".join(curr + [w])
                tw, _ = _text_size(draw, test_line, font_body)
                if tw <= (card_x2 - tx - 24):
                    curr.append(w)
                else:
                    if curr:
                        b_lines.append(" ".join(curr))
                    curr = [w]
            if curr:
                b_lines.append(" ".join(curr))

            by = card_top + 62
            for line in b_lines[:2]:
                draw.text((tx, by), line, font=font_body, fill=cls.MUTED)
                by += 26

            y_cursor += card_h + 18

        # 12. 3-Column Highlights Matrix (120px height)
        y_cursor += 10
        stat_card_h = 120
        draw.rounded_rectangle([(card_x1, y_cursor), (card_x2, y_cursor + stat_card_h)], radius=18, fill=(16, 24, 42), outline=(36, 52, 84), width=1)

        col_w = (card_x2 - card_x1) // 3
        is_hiring = any(w in (title_clean + " " + category_clean).lower() for w in ["hire", "hiring", "developer", "engineer", "talent", "c "])
        
        if is_hiring:
            highlights = [
                ("TOP 1% EQUITY", "Competitive Comp"),
                ("100% REMOTE", "Work from Anywhere"),
                ("HIGH IMPACT", "Direct Founder Access")
            ]
        elif "product" in category_clean.lower() or "launch" in category_clean.lower():
            highlights = [
                ("ENTERPRISE READY", "Audit-Safe Architecture"),
                ("REAL-TIME SCAN", "<100ms Rule Engine"),
                ("OMNICHANNEL", "LinkedIn, Web & PDF")
            ]
        else:
            highlights = [
                ("UNIFIED VOICE", "100% Brand Consistency"),
                ("ZERO BOTTLENECK", "Automated Pre-Flight"),
                ("AUDIT TRAILS", "Cryptographic Record")
            ]

        font_h_top = _load_font(18, bold=True)
        font_h_bot = _load_font(21, bold=True)

        for i, (top_txt, bot_txt) in enumerate(highlights):
            col_x = card_x1 + i * col_w
            if i > 0:
                draw.line([(col_x, y_cursor + 22), (col_x, y_cursor + stat_card_h - 22)], fill=(36, 52, 84), width=1)
            
            tw1, _ = _text_size(draw, top_txt, font_h_top)
            tw2, _ = _text_size(draw, bot_txt, font_h_bot)
            
            cx = col_x + col_w // 2
            draw.text((cx - tw1 // 2, y_cursor + 32), top_txt, font=font_h_top, fill=cls.CYAN)
            draw.text((cx - tw2 // 2, y_cursor + 66), bot_txt, font=font_h_bot, fill=cls.WHITE)

        y_cursor += stat_card_h + 18

        # 13. Tech Ecosystem / Architecture Bar (48px height)
        stack_h = 48
        draw.rounded_rectangle([(card_x1, y_cursor), (card_x2, y_cursor + stack_h)], radius=14, fill=(14, 22, 38), outline=(30, 44, 72), width=1)
        
        font_stack_label = _load_font(17, bold=True)
        font_stack_items = _load_font(16, bold=False)
        
        if is_hiring:
            s_lbl = "CORE ARCHITECTURE:"
            s_val = "C / C++  *  VULKAN  *  DISTRIBUTED SYSTEMS  *  GEMINI SDK"
        else:
            s_lbl = "INTELLIGENCE LAYER:"
            s_val = "SUPABASE PGVECTOR  *  GEMINI 3.0  *  FASTAPI  *  REACT 19"
            
        draw.text((card_x1 + 22, y_cursor + 15), s_lbl, font=font_stack_label, fill=cls.CYAN)
        lw, _ = _text_size(draw, s_lbl, font_stack_label)
        draw.text((card_x1 + 22 + lw + 14, y_cursor + 15), s_val, font=font_stack_items, fill=cls.MUTED)

        y_cursor += stack_h + 18

        # 14. Action Banner (72px height)
        action_h = 72
        draw.rounded_rectangle([(card_x1, y_cursor), (card_x2, y_cursor + action_h)], radius=18, fill=(28, 42, 74), outline=cls.VIOLET, width=1)
        
        font_act_left = _load_font(22, bold=True)
        font_act_btn = _load_font(20, bold=True)
        
        action_label = "Apply or explore engineering roles" if is_hiring else "Explore automated brand governance"
        draw.text((card_x1 + 24, y_cursor + 24), action_label, font=font_act_left, fill=cls.WHITE)
        
        # Pill CTA button on right
        btn_text = "apply@fixora.ai  ->" if is_hiring else "fixora.ai  ->"
        bw, bh = _text_size(draw, btn_text, font_act_btn)
        btn_x2 = card_x2 - 16
        btn_x1 = btn_x2 - bw - 36
        draw.rounded_rectangle([(btn_x1, y_cursor + 12), (btn_x2, y_cursor + action_h - 12)], radius=24, fill=cls.VIOLET)
        draw.text((btn_x1 + 18, y_cursor + 24), btn_text, font=font_act_btn, fill=cls.WHITE)

        # 15. Bottom Branded Footer (Cleanly anchored near bottom)
        fy = H - M - 36
        draw.line([(M + 24, fy), (W - M - 24, fy)], fill=(32, 45, 75), width=1)

        font_ftr_logo = _load_font(21, bold=True)
        font_ftr_sub = _load_font(18, bold=False)

        # Logo diamond symbol
        draw.polygon([
            (M + 30, fy + 24),
            (M + 36, fy + 17),
            (M + 42, fy + 24),
            (M + 36, fy + 31)
        ], fill=cls.CYAN)
        
        draw.text((M + 50, fy + 16), "FIXORA AI", font=font_ftr_logo, fill=cls.WHITE)
        fw, _ = _text_size(draw, "FIXORA AI", font_ftr_logo)
        draw.text((M + 50 + fw + 14, fy + 18), "|   Multimodal Brand Intelligence Platform", font=font_ftr_sub, fill=cls.MUTED)

        right_txt = "Certified Enterprise Compliant"
        rw, _ = _text_size(draw, right_txt, font_ftr_sub)
        draw.text((W - M - 24 - rw, fy + 18), right_txt, font=font_ftr_sub, fill=cls.CYAN)

        # 16. Save and return
        filename = f"poster_{uuid.uuid4().hex[:8]}.png"
        file_path = os.path.join(output_dir, filename)
        img.save(file_path, "PNG", optimize=True)
        logger.info(f"Generated brand poster graphic: {file_path}")
        return filename
