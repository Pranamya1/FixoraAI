#!/usr/bin/env python3
"""
FixoraAI - Round 3 Final Product Submission PDF Generator
Generates an executive-grade, professionally styled submission PDF covering all 100-point rubric criteria.
"""

import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """Adds professional header and footer with dynamic page numbering."""
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Don't draw header on cover page (page 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "FixoraAI — Round 3 Final Product Documentation")
            self.drawRightString(558, 750, "https://fixoraai.onrender.com")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(54, 744, 558, 744)

        # Footer on all pages
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 36, page_str)
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 46, 558, 46)
        self.restoreState()


def build_pdf(filename="FixoraAI_Round3_Product_Report.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom Color Palette
    PRIMARY = colors.HexColor("#009DFF")
    DARK_NAVY = colors.HexColor("#0F172A")
    TEXT_MUTED = colors.HexColor("#475569")
    BG_LIGHT = colors.HexColor("#F8FAFC")
    BORDER_COLOR = colors.HexColor("#CBD5E1")
    SUCCESS = colors.HexColor("#10B981")

    # Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=26,
        leading=32,
        textColor=DARK_NAVY,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=PRIMARY,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=DARK_NAVY,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=PRIMARY,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#1E293B"),
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )

    callout_style = ParagraphStyle(
        'Callout_Text',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=DARK_NAVY
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=DARK_NAVY
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=table_cell_style,
        fontName='Helvetica-Bold'
    )

    story = []

    # ─────────────────────────────────────────────────────────────────────────────
    # COVER / HEADER SECTION
    # ─────────────────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 15))
    story.append(Paragraph("FixoraAI", title_style))
    story.append(Paragraph("Enterprise Multimodal Brand Governance & Content Publishing Platform", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY, spaceBefore=0, spaceAfter=15))

    # Meta Info Card
    meta_data = [
        [
            Paragraph("<b>Hackathon Stage:</b> Round 3 Final Submission (Top 50)", body_style),
            Paragraph("<b>Team Leader:</b> Pranamya Kalambe", body_style)
        ],
        [
            Paragraph("<b>Live Web Application:</b> <font color='#009DFF'><u>https://fixoraai.onrender.com</u></font>", body_style),
            Paragraph("<b>Production API Docs:</b> <font color='#009DFF'><u>https://fixoraai-backend.onrender.com/docs</u></font>", body_style)
        ],
        [
            Paragraph("<b>Source Repository:</b> <font color='#009DFF'><u>https://github.com/Pranamya1/FixoraAI</u></font>", body_style),
            Paragraph("<b>Evaluator Access:</b> 1-Click Judge Access (No sign-up needed)", body_style)
        ]
    ]
    t_meta = Table(meta_data, colWidths=[250, 254])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), HexColor('#F1F5F9')),
        ('PADDING', (0,0), (-1,-1), 8),
        ('BOX', (0,0), (-1,-1), 1, HexColor('#CBD5E1')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 15))

    # Executive Overview
    story.append(Paragraph("Executive Overview", h1_style))
    story.append(Paragraph(
        "Modern marketing and engineering organizations face a critical governance dilemma: generative AI enables "
        "teams to produce content 100× faster, but leaves enterprise brands vulnerable to severe brand dilution, non-compliant "
        "color palettes, visual design errors, and legal claims. <b>FixoraAI</b> solves this by embedding an intelligent, multimodal "
        "governance layer directly between creative generation and social publishing.",
        body_style
    ))
    story.append(Paragraph(
        "Rather than functioning as a surface-level LLM wrapper, FixoraAI extracts and indexes company brand guidelines into vector "
        "embeddings, performs multimodal visual inspection using <b>Google Gemini Vision</b> on creative posters, routes approval requests "
        "to executives across four channels (WhatsApp, Gmail, Slack, Teams), and executes 1-click live publishing via real OAuth.",
        body_style
    ))

    # ─────────────────────────────────────────────────────────────────────────────
    # SECTION 1: THE THREE DELIVERED ROUND 3 IMPROVEMENTS
    # ─────────────────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 10))
    story.append(Paragraph("1. Delivered Round 3 Improvements (Committed at Round 2)", h1_style))
    story.append(Paragraph(
        "As committed in the Round 2 milestone submission, all three designated major engineering improvements have been "
        "delivered, tested, and deployed to production:",
        body_style
    ))

    improvements_data = [
        [
            Paragraph("Delivered Improvement", table_header_style),
            Paragraph("Technical Implementation & User Value", table_header_style)
        ],
        [
            Paragraph("<b>Improvement 1:<br/>Direct Multi-Platform Social Publishing</b>", table_cell_bold),
            Paragraph(
                "• <b>Real LinkedIn OAuth 2.0:</b> Engineered live authorization code flow with secure token persistence in Supabase, enabling 1-click publishing directly to live LinkedIn feeds.<br/>"
                "• <b>Multi-Channel Routing:</b> Added Twitter/X pre-formatted Web Intent dispatch and Slack channel webhook integration, eliminating manual copy-pasting for marketing teams.",
                table_cell_style
            )
        ],
        [
            Paragraph("<b>Improvement 2:<br/>Multimodal Creative Visual Auditing</b>", table_cell_bold),
            Paragraph(
                "• <b>Gemini Vision Inspection:</b> Implemented deep visual inspection of generated posters and uploaded images to verify brand color hex tokens (e.g., #009DFF primary), typographical legibility, logo placement, and layout balance.<br/>"
                "• <b>Dual Scorecards:</b> Provides creators with instant visual compliance ratings alongside textual guideline checks.",
                table_cell_style
            )
        ],
        [
            Paragraph("<b>Improvement 3:<br/>Executive Review & Radio Dispatch Hub</b>", table_cell_bold),
            Paragraph(
                "• <b>Single-Platform Radio Selector:</b> Redesigned dispatch modal to single-channel radio selection, preventing multi-channel notification spam.<br/>"
                "• <b>Cross-Platform Gateways:</b> Instant WhatsApp <code>wa.me</code> mobile chat links, executive responsive HTML emails, interactive Slack Block Kit cards, and Microsoft Teams Connector cards with custom webhook overrides.",
                table_cell_style
            )
        ]
    ]

    t_imp = Table(improvements_data, colWidths=[160, 344])
    t_imp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), HexColor('#0F172A')),
        ('PADDING', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#CBD5E1')),
        ('BACKGROUND', (0,1), (0,1), HexColor('#F8FAFC')),
        ('BACKGROUND', (0,2), (0,2), HexColor('#FFFFFF')),
        ('BACKGROUND', (0,3), (0,3), HexColor('#F8FAFC')),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_imp)

    # ─────────────────────────────────────────────────────────────────────────────
    # SECTION 2: COMPLETE FEATURE LIST
    # ─────────────────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 15))
    story.append(Paragraph("2. Complete Production Feature Matrix", h1_style))

    features_data = [
        [
            Paragraph("Category", table_header_style),
            Paragraph("Feature Name", table_header_style),
            Paragraph("Capabilities & Architectural Details", table_header_style),
            Paragraph("Status", table_header_style)
        ],
        [
            Paragraph("<b>Knowledge Ingestion</b>", table_cell_style),
            Paragraph("Brand Guideline Vector Parser", table_cell_style),
            Paragraph("Extracts text and layout from enterprise PDFs/Markdown; chunks and generates 768-dim embeddings in Supabase <code>pgvector</code>.", table_cell_style),
            Paragraph("<font color='#059669'><b>Production</b></font>", table_cell_style)
        ],
        [
            Paragraph("<b>Compliance Engine</b>", table_cell_style),
            Paragraph("RAG Semantic Auditor", table_cell_style),
            Paragraph("Audits drafts against indexed company policies with rule citations, severity classifications (Critical/Warning/Notice), and 1-click fixes.", table_cell_style),
            Paragraph("<font color='#059669'><b>Production</b></font>", table_cell_style)
        ],
        [
            Paragraph("<b>Multimodal AI</b>", table_cell_style),
            Paragraph("Gemini Vision Visual Inspector", table_cell_style),
            Paragraph("Visual inspection of graphic layouts, contrast ratios, and color palette tokens (#009DFF) powered by Gemini Vision.", table_cell_style),
            Paragraph("<font color='#059669'><b>Production</b></font>", table_cell_style)
        ],
        [
            Paragraph("<b>Creative Studio</b>", table_cell_style),
            Paragraph("Multi-Deliverable Synthesis", table_cell_style),
            Paragraph("Generates channel-calibrated copy, 1080×1080 branded social posters (.PNG via Pillow), and 4-slide PDF carousels (ReportLab).", table_cell_style),
            Paragraph("<font color='#059669'><b>Production</b></font>", table_cell_style)
        ],
        [
            Paragraph("<b>Review & Sign-Off</b>", table_cell_style),
            Paragraph("Executive Approval Dispatch", table_cell_style),
            Paragraph("Single-platform radio dispatch across WhatsApp, Gmail HTML cards, Slack Block Kit, and Microsoft Teams cards.", table_cell_style),
            Paragraph("<font color='#059669'><b>Production</b></font>", table_cell_style)
        ],
        [
            Paragraph("<b>Social Publishing</b>", table_cell_style),
            Paragraph("Direct Channel Integration", table_cell_style),
            Paragraph("Live OAuth 2.0 direct feed posting to LinkedIn; verified Twitter/X web intent; channel handle linking in settings.", table_cell_style),
            Paragraph("<font color='#059669'><b>Production</b></font>", table_cell_style)
        ],
        [
            Paragraph("<b>Authentication</b>", table_cell_style),
            Paragraph("1-Click Judge Access", table_cell_style),
            Paragraph("Instant evaluator walkthrough button bypassing onboarding and credential friction while supporting full Supabase Auth.", table_cell_style),
            Paragraph("<font color='#059669'><b>Production</b></font>", table_cell_style)
        ]
    ]

    t_feat = Table(features_data, colWidths=[90, 110, 244, 60])
    t_feat.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), HexColor('#0F172A')),
        ('PADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#CBD5E1')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [HexColor('#FFFFFF'), HexColor('#F8FAFC')]),
    ]))
    story.append(t_feat)

    # ─────────────────────────────────────────────────────────────────────────────
    # SECTION 3: TECHNICAL ARCHITECTURE
    # ─────────────────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 15))
    story.append(Paragraph("3. Technical Architecture & Implementation Summary", h1_style))
    story.append(Paragraph(
        "FixoraAI is engineered as a decoupled, high-throughput full-stack system built for low-latency governance verification:",
        body_style
    ))

    arch_bullets = [
        "<b>Frontend Client:</b> React 19, TypeScript, and Vite styled with modern Tailwind CSS v4. State persistence is managed through resilient local storage synchronization and reactive event listeners.",
        "<b>Backend API:</b> Python 3.10+ with FastAPI utilizing asynchronous request handling, Pydantic data contract validation, and connection pooling for external services.",
        "<b>AI & Multimodal Core:</b> Google Gemini API (<code>gemini-3-flash-preview</code> for contextual reasoning and structured audit outputs; Gemini Vision for graphic and typography validation; <code>models/embedding-001</code> for semantic retrieval).",
        "<b>Database & Vector Store:</b> Supabase PostgreSQL enhanced with the <code>pgvector</code> extension for sub-50ms cosine similarity searches against chunked brand guidelines.",
        "<b>Asset Synthesis Pipelines:</b> Headless Python graphics pipelines utilizing <code>Pillow (PIL)</code> for crisp 1080×1080 brand poster composition and <code>ReportLab</code> for structured, multi-page LinkedIn carousel PDFs.",
        "<b>Enterprise Integrations:</b> Native OAuth 2.0 protocol for LinkedIn live publishing, Webhook dispatchers for Slack/Teams, and dynamic deep-linking for WhatsApp and mailto clients."
    ]
    for b in arch_bullets:
        story.append(Paragraph(f"• {b}", bullet_style))

    # ─────────────────────────────────────────────────────────────────────────────
    # SECTION 4: TESTING & RELIABILITY ("HOLDS UP WITHOUT YOU")
    # ─────────────────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 15))
    story.append(Paragraph("4. Reliability & Independent Evaluator Testing", h1_style))
    story.append(Paragraph(
        "To satisfy the Round 3 requirement that <i>'a judge will open your link and use it on their own with nobody from your team explaining anything,'</i> "
        "FixoraAI incorporates comprehensive automated defensive engineering:",
        body_style
    ))

    test_bullets = [
        "<b>Zero-Setup Graceful Fallback:</b> If a judge begins generating content without uploading custom guidelines, FixoraAI automatically falls back to an enterprise default brand kit, preventing null-pointer errors or empty state blockers.",
        "<b>SPA Cloud Routing Protection:</b> Implemented a production <code>_redirects</code> rewrite policy (<code>/* /index.html 200</code>) to ensure deep links, settings tabs (<code>/?tab=settings</code>), and OAuth redirect callbacks never produce 404 Not Found errors on Render.",
        "<b>State Resilience on Browser Refresh:</b> Active review sessions, generated drafts, and user tokens persist across hard browser reloads through atomic storage synchronization.",
        "<b>Defensive Input Validation:</b> All API routes enforce strict schema boundaries via Pydantic; invalid phone formats, malformed webhook URLs, and empty topics display clean inline warnings rather than throwing unhandled 500 exceptions.",
        "<b>Build & Type Integrity:</b> 100% clean TypeScript compilation check (<code>npm run build</code>, zero errors across 2,100+ transformed modules) and clean Python backend import verification."
    ]
    for b in test_bullets:
        story.append(Paragraph(f"• {b}", bullet_style))

    # ─────────────────────────────────────────────────────────────────────────────
    # SECTION 5: ROADMAP & FUTURE DEVELOPMENT
    # ─────────────────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 15))
    story.append(Paragraph("5. Product Roadmap & Future Commercial Development", h1_style))

    roadmap_data = [
        [
            Paragraph("Phase / Milestone", table_header_style),
            Paragraph("Key Deliverables & Business Impact", table_header_style)
        ],
        [
            Paragraph("<b>Q1 2027<br/>Enterprise SSO & RBAC</b>", table_cell_bold),
            Paragraph("Implement SAML 2.0 / Okta enterprise identity with hierarchical role-based permissions (Content Creator, Compliance Officer, Chief Brand Officer).", table_cell_style)
        ],
        [
            Paragraph("<b>Q2 2027<br/>Video Brand Governance</b>", table_cell_bold),
            Paragraph("Extend multimodal inspection to short-form video (TikTok, Instagram Reels, YouTube Shorts) utilizing frame-by-frame audio and visual compliance scanning.", table_cell_style)
        ],
        [
            Paragraph("<b>Q3 2027<br/>Automated Legal Localization</b>", table_cell_bold),
            Paragraph("Incorporate jurisdiction-aware legal compliance checks (FTC endorsement guidelines, GDPR cookie/privacy declarations, and ASCI advertising regulations).", table_cell_style)
        ],
        [
            Paragraph("<b>Q4 2027<br/>Agency Multi-Brand Suite</b>", table_cell_bold),
            Paragraph("Develop a multi-tenant portal enabling marketing and PR agencies to govern and publish across hundreds of distinct client brand guidelines from a unified cockpit.", table_cell_style)
        ]
    ]

    t_road = Table(roadmap_data, colWidths=[150, 354])
    t_road.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), HexColor('#0F172A')),
        ('PADDING', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [HexColor('#FFFFFF'), HexColor('#F8FAFC')]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_road)

    # Submission Sign-off
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER_COLOR, spaceBefore=0, spaceAfter=10))
    story.append(Paragraph(
        "<b>Submitted by:</b> Pranamya Kalambe (Team Leader) | <b>Product:</b> FixoraAI | <b>Round:</b> 3 (Final)<br/>"
        "<b>Production URL:</b> https://fixoraai.onrender.com | <b>Code Repository:</b> https://github.com/Pranamya1/FixoraAI",
        ParagraphStyle('FooterNotice', parent=body_style, fontSize=8, textColor=TEXT_MUTED, alignment=1)
    ))

    # Build the PDF using NumberedCanvas for professional header/footers
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated {filename}")

if __name__ == "__main__":
    from reportlab.lib.colors import HexColor
    build_pdf("/Users/pranamyakalambe/Documents/FixoraAI/FixoraAI_Round3_Product_Report.pdf")
