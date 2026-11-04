# FixoraAI Backend

Enterprise multimodal brand governance, content rule review, and brand-compliant generation backend built with **FastAPI**, **Supabase (PostgreSQL + pgvector)**, and **Google Gemini 1.5 / 3.8 Flash**.

## 🚀 Quickstart

### 1. Set Up Virtual Environment & Dependencies
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Contains your `GEMINI_API_KEY` and Supabase credentials.

### 3. Start Development Server
```bash
uvicorn main:app --reload --port 8000
```
- Interactive API Docs (Swagger): http://localhost:8000/docs
- Alternative Docs (ReDoc): http://localhost:8000/redoc
- System Health: http://localhost:8000/health

---

## 🎨 Multimodal Content Generation & Governance Features

### 1. Brand-Compliant Multimodal Generator (`POST /api/generate`)
Generates 100% on-brand marketing content from scratch based on a topic and your official brand guidelines:
- **Text Copy**: Channel-optimized social copy with tone alignment, headlines, and key takeaways.
- **Visual Posters / Images**: High-res branded graphics (.PNG) in Square (1:1), Portrait (4:5), or Banner (16:9).
- **Multi-Slide PDF Carousels**: 4-slide branded decks (.PDF) for LinkedIn document posts or executive briefs.
- **Direct Downloads**: `GET /api/generate/download/{filename}`

### 2. Multimodal Guideline Ingestion (`POST /api/guidelines/upload` & `/raw`)
- **PDFs**: Page-by-page text & layout extraction with PyMuPDF.
- **Images**: Logo specs, color palettes, and visual rules via Gemini Vision.
- **Raw Text / Markdown**: Direct text & markdown policy ingestion.
- Stored as 768-dimensional embeddings in Supabase `pgvector` with HNSW cosine index.

### 3. AI Compliance Engine (`POST /api/audit/evaluate` & `/apply-fix`)
- Intent-aware vector retrieval cross-referencing brand rules against draft copy + images.
- Exact document page citations (e.g. Page 4, Page 6) and severity levels (`CRITICAL`, `WARNING`).
- 1-Click suggested fix API with automatic text replacement and score recalculation.

### 4. Fast-Track Sign-Off & Publishing (`POST /api/publish`)
- Webhook alerts to Slack Block Kit, Microsoft Teams, and WhatsApp for 100% compliant content.
- Multi-platform social dispatch (LinkedIn, Twitter/X, Instagram, Facebook).
