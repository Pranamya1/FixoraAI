# FixoraAI — Enterprise Multimodal Brand Governance & Content Publishing Platform

[![Round 3 Finalist](https://img.shields.io/badge/Hackathon-Round%203%20Finalist%20(Top%2050)-009DFF?style=for-the-badge&logo=target)](https://fixoraai.onrender.com)
[![Live Demo](https://img.shields.io/badge/Live%20App-fixoraai.onrender.com-00C853?style=for-the-badge&logo=render)](https://fixoraai.onrender.com)
[![Backend API](https://img.shields.io/badge/Backend%20API-FastAPI%20%2B%20Python-4A154B?style=for-the-badge&logo=fastapi)](https://fixoraai-backend.onrender.com/docs)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

FixoraAI is an enterprise-grade AI governance platform that prevents brand violations, enforces compliance across social marketing channels, evaluates multimodal assets (text copy, graphics, posters, and carousels) using **Google Gemini Vision**, and orchestrates executive approvals and direct multi-platform publishing.

---

## 🌐 Live Evaluator Links & Access

* **Production Web Application:** [https://fixoraai.onrender.com](https://fixoraai.onrender.com)
* **Production API Documentation (Swagger):** [https://fixoraai-backend.onrender.com/docs](https://fixoraai-backend.onrender.com/docs)
* **GitHub Source Code:** [https://github.com/Pranamya1/FixoraAI](https://github.com/Pranamya1/FixoraAI)

### ⚡ Instant Evaluator Access (Zero Registration Required)
When opening the web application, click the **`⚡ 1-Click Judge Demo Access`** button on the sign-in screen to instantly enter the live enterprise workspace without email verification or onboarding barriers.
*(Alternatively, you can sign in using `demo@fixora.ai` / `Demo1234!` or create a new account).*

---

## 🏆 Round 3 Deliverables: The Three Core Improvements

As committed in the Round 2 milestone submission, the following three core enterprise capabilities have been fully engineered, tested, and deployed to production:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        ROUND 3 DELIVERABLES AT A GLANCE                                │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│ 1. Direct Multi-Platform │ 2. Multimodal Visual Brand  │ 3. Higher-Up Executive Review │
│    Social Publishing     │    Auditing (Gemini Vision) │    & Dispatch Hub             │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ • Real LinkedIn OAuth    │ • Visual color compliance   │ • Single-platform radio select│
│   Token persistence      │   inspection (#009DFF)      │ • WhatsApp (wa.me & Cloud API)│
│ • Twitter/X Web Intent   │ • Typography legibility     │ • Gmail (Responsive HTML Card)│
│ • Direct Slack Broadcast │ • Logo placement & contrast │ • Slack Block Kit Cards       │
│ • 1-click live feed post │ • Layout balance evaluation │ • MS Teams Connector Cards    │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

### 1. Direct Multi-Platform Social Publishing Engine
* **Real LinkedIn OAuth Integration:** Live OAuth 2.0 integration with Supabase token encryption and automated refresh. Creators publish approved compliant copy directly to LinkedIn company/personal feeds in 1 click.
* **Twitter/X & Multi-Channel Intent:** Instant pre-formatted Web Intent dispatch for Twitter/X with calibrated character limits, alongside direct marketing channel webhooks.
* **Connected Channel Settings:** Allows connecting enterprise brand handles for X, Instagram, Facebook, and LinkedIn directly from the workspace settings.

### 2. Multimodal Visual Brand Auditing via Google Gemini Vision
* **Creative Graphic Inspection:** In addition to text rules, FixoraAI uses Gemini Vision to inspect uploaded graphics, creative banners, and generated posters.
* **Aesthetic & Rule Validation:** Analyzes primary brand palette adherence (`#009DFF`), font readability, contrast ratios, and layout balance against corporate guidelines.
* **Visual Audit Cards:** Surfaces visual scorecards alongside text citations, providing creators with immediate visual guidance before distribution.

### 3. Executive Review & Dispatch Hub (Single-Platform Radio Selection)
* **Unified Review Workflow:** When content requires sign-off, creators dispatch review requests to executive channels with **single-select radio buttons** (preventing fragmented multi-channel notification spam).
* **Channel Integrations:**
  * **WhatsApp:** Instant `wa.me` deep links and Meta Cloud API integration with rich interactive text alerts.
  * **Gmail:** Executive responsive HTML email cards featuring compliance badges, creator notes, and full violation summaries.
  * **Slack:** Interactive Block Kit review cards with 1-click approval buttons and optional custom incoming webhook support.
  * **Microsoft Teams:** Adaptive connector cards with direct links back to Fixora Studio.

---

## 🏗️ Technical Architecture & Data Flow

```
                                  USER INTERFACE LAYER
            [ React 19 + TypeScript + Vite + Tailwind CSS v4 + Lucide Icons ]
                                           │
                                    REST API / HTTPS
                                           │
                                  BACKEND API GATEWAY
                      [ FastAPI (Python 3.10+) on Render Cloud ]
                                           │
        ┌──────────────────────────────────┼──────────────────────────────────┐
        │                                  │                                  │
        ▼                                  ▼                                  ▼
┌──────────────────┐             ┌──────────────────┐               ┌──────────────────┐
│  AI GOVERNANCE   │             │ ASSET GENERATION │               │ PERSISTENCE & DB │
├──────────────────┤             ├──────────────────┤               ├──────────────────┤
│ • Gemini 3 Flash │             │ • Pillow (PIL):  │               │ • Supabase       │
│   (Compliance &  │             │   1080x1080 PNG  │               │   PostgreSQL     │
│   Copy Synthesis)│             │   Social Posters │               │ • pgvector:      │
│ • Gemini Vision  │             │ • ReportLab:     │               │   768-dim Brand  │
│   (Visual Image  │             │   4-Slide PDF    │               │   Embeddings     │
│   Inspection)    │             │   Carousels      │               │ • Supabase Auth  │
└──────────────────┘             └──────────────────┘               └──────────────────┘
        │                                                                     │
        └──────────────────────────────────┬──────────────────────────────────┘
                                           │
                              EXTERNAL PLATFORMS & DISPATCH
        ┌──────────────────────────────────┴──────────────────────────────────┐
        │                                                                     │
        ▼                                                                     ▼
┌─────────────────────────────────┐                       ┌─────────────────────────────────┐
│     SOCIAL PUBLISHING HUB       │                       │     EXECUTIVE REVIEW ROUTER     │
├─────────────────────────────────┤                       ├─────────────────────────────────┤
│ • LinkedIn REST API (OAuth 2.0) │                       │ • WhatsApp (wa.me / Cloud API)  │
│ • Twitter/X Web Intent Gateway  │                       │ • Gmail SMTP (HTML Email Cards) │
│ • Slack Channel Broadcasts      │                       │ • Slack Webhook (Block Kit)     │
│ • Meta Graph API Handlers       │                       │ • MS Teams (Adaptive Cards)     │
└─────────────────────────────────┘                       └─────────────────────────────────┘
```

---

## 🛠️ Complete Feature Matrix

| Feature | Description | Status |
|:---|:---|:---:|
| **Brand Guidelines Ingestion** | Extracts text and structure from PDFs/Markdown into vector chunks | ✅ Active |
| **Vector RAG Compliance Search** | Evaluates copy using `pgvector` semantic matching on company rules | ✅ Active |
| **Multimodal Visual Audit** | Gemini Vision reviews graphics for logo, palette, and layout compliance | ✅ Active |
| **Content Studio Generator** | Synthesizes channel-optimized copy matching targeted tone and audience | ✅ Active |
| **1080×1080 Social Posters** | Auto-generates branded PNG graphics using official color tokens | ✅ Active |
| **4-Slide PDF Carousels** | Builds slide decks (Cover, Context, Insights, CTA) for LinkedIn carousels | ✅ Active |
| **Interactive Review Queue** | Chat-based review session with rule citations and 1-click fixes | ✅ Active |
| **Higher-Up Radio Dispatch** | Dispatches review requests to WhatsApp, Gmail, Slack, or Teams | ✅ Active |
| **Custom Webhook Overrides** | Allows pasting custom Slack/Teams webhooks directly in the modal | ✅ Active |
| **Live LinkedIn Publishing** | Publishes posts directly to personal/company LinkedIn feeds | ✅ Active |
| **1-Click Evaluator Access** | Instant evaluator login bypassing forms and verification | ✅ Active |
| **SPA Deep Routing** | Cloud `_redirects` preventing 404s on deep links or OAuth redirects | ✅ Active |

---

## 🧪 Testing & Reliability Details

FixoraAI was engineered with defensive fail-safes to ensure stability when tested independently by evaluators:

1. **Empty State Gracefulness:** If no custom brand guidelines are uploaded, the application seamlessly defaults to Fixora's default master brand rules without crashing or blocking generation.
2. **Session Persistence:** Active user sessions and ongoing review chats are preserved in browser storage (`localStorage`), surviving browser refreshes, hard reloads, and rebuilds.
3. **Single-Page Application (SPA) Rewrites:** Configured `frontend/public/_redirects` (`/* /index.html 200`) ensures deep routes (e.g., `/?tab=settings`, OAuth callback URLs) never hit Render 404 errors.
4. **Relational Integrity & Purge Safety:** Account deletion and session resets follow strict foreign-key order (`brand_guidelines`, `connected_social_accounts`, `posts`) preventing orphaned data.
5. **Automated Build Verification:**
   ```bash
   # Frontend TypeScript & Vite bundle build check
   cd frontend && npm run build  # Exit code 0, 0 TS errors

   # Backend module import and dependency verification
   PYTHONPATH=backend python -c "import app.main; print('Backend loaded successfully!')"
   ```

---

## 💻 Local Development Quickstart

### Prerequisites
* **Python 3.10+**
* **Node.js 18+** & **npm**
* **Supabase Project** (PostgreSQL with `pgvector` extension)
* **Google Gemini API Key**

### 1. Clone Repository
```bash
git run clone https://github.com/Pranamya1/FixoraAI.git
cd FixoraAI
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
cp .env.example .env
```

**Required Backend Environment Variables (`backend/.env`):**
```env
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-3-flash-preview"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
APP_STUDIO_URL="http://localhost:5173"
LINKEDIN_CLIENT_ID="your-linkedin-client-id"
LINKEDIN_CLIENT_SECRET="your-linkedin-client-secret"
LINKEDIN_REDIRECT_URI="http://localhost:8000/api/auth/linkedin/callback"
```

Start backend server:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:8000" > .env

# Start development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🗺️ Product Roadmap & Future Scope

* **Q1 2027 — Enterprise SSO & RBAC:** SAML 2.0 / Okta integration with granular role permissions (Copywriter, Brand Compliance Officer, Chief Marketing Officer).
* **Q2 2027 — Video Brand Governance:** Automated frame-by-frame compliance auditing for short-form video content (TikTok, Instagram Reels, YouTube Shorts).
* **Q3 2027 — Multi-Region Legal Jurisdictions:** Auto-localization of compliance rules based on target audience territory (GDPR, FTC disclosures, ASCI advertising codes).
* **Q4 2027 — Agency Marketplace:** Multi-tenant workspace allowing creative agencies to manage hundreds of distinct brand kits from a single dashboard.

---

## 👥 Submission Information

* **Product:** FixoraAI
* **Hackathon Round:** Round 3 Final Submission (Top 50 Finalist)
* **Team Leader:** Pranamya Kalambe
* **Live Application:** [https://fixoraai.onrender.com](https://fixoraai.onrender.com)
* **GitHub Repository:** [https://github.com/Pranamya1/FixoraAI](https://github.com/Pranamya1/FixoraAI)
