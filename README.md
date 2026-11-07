# FixoraAI — Enterprise Multimodal Brand Governance & Publishing Platform

FixoraAI is an enterprise-grade AI governance platform that prevents brand violations, enforces compliance across social marketing channels, evaluates multimodal assets (text, graphics, posters, carousels) using Google Gemini Vision, and orchestrates live approvals and multi-platform publishing.

---

## 🌟 Core Architecture & Capabilities

1. **Multimodal Compliance Engine**:
   - Ingests brand guideline PDFs, Markdown, and custom corporate rules into chunked vector embeddings.
   - Evaluates drafts, graphics, and carousels against brand rules with instant scoring, severity tiers, and 1-click suggested fixes.
   - Multimodal Visual Inspection powered by **Google Gemini Vision** directly evaluates visual aesthetics, logo placement, typography, and contrast.

2. **Brand-Compliant Multimodal Generator**:
   - Generates 100% on-brand text copy tailored to target audiences and tone.
   - Generates high-res visual posters (`.png`) and multi-slide carousels (`.pdf`).

3. **Live Approvals & Dispatch**:
   - Interactive review queue with status management (`DRAFT`, `IN_REVIEW`, `APPROVED`, `REJECTED`, `PUBLISHED`).
   - One-click review dispatch via WhatsApp, Email, Slack, and Microsoft Teams.

4. **Multi-Platform Publishing**:
   - OAuth & direct publishing integration for LinkedIn, Instagram, Facebook, and X.

5. **Cloud Persistence & Security**:
   - Supabase PostgreSQL persistence with `pgvector` for semantic brand guideline retrieval.
   - Safe account purging adhering to foreign key hierarchies.

---

## 🚀 Quickstart

### Prerequisites
- Python 3.10+
- Node.js 18+
- Supabase project credentials
- Google Gemini API key

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Configure your Supabase & Gemini credentials
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env  # Configure VITE_API_BASE_URL
npm run dev
```

---

## ☁️ Deployment on Render

### Frontend (Static Site / Web Service)
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_BASE_URL`: `https://<your-backend>.onrender.com/api`

### Backend (Web Service)
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables**:
  - `GEMINI_API_KEY`: Your Google Gemini API Key
  - `GEMINI_MODEL`: `gemini-3-flash-preview`
  - `SUPABASE_URL`: Your Supabase Project URL
  - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key
  - `APP_STUDIO_URL`: `https://<your-frontend>.onrender.com`
