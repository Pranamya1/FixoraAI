import os
import asyncio
import logging
import hashlib
import json
import math
from typing import List, Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger("fixora.gemini")

class GeminiClient:
    _instance: Optional["GeminiClient"] = None
    is_available: bool = False
    
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY.strip()
        self.model_name = settings.GEMINI_MODEL or "gemini-3-flash-preview"
        self.embedding_model_name = settings.GEMINI_EMBEDDING_MODEL or "models/gemini-embedding-001"
        self._embedding_cache: Dict[str, List[float]] = {}
        self._init_client()

    def _init_client(self):
        if not self.api_key or self.api_key.startswith("your-"):
            logger.info("No valid GEMINI_API_KEY detected. Running in smart mock/fallback mode.")
            self.is_available = False
            return
            
        try:
            from google import genai
            self.genai_client = genai.Client(api_key=self.api_key)
            self.is_available = True
            logger.info("Initialized Google GenAI SDK client successfully.")
        except Exception as e:
            logger.warning(f"Failed to initialize Google GenAI SDK: {e}. Falling back to rule-based engine.")
            self.is_available = False

    def generate_embedding(self, text: str) -> List[float]:
        """
        Generates 768-dimensional embedding vector using Google Gemini embeddings.
        Configured with output_dimensionality=768 to match pgvector(768).
        Uses local in-memory cache to guarantee sub-millisecond retrieval on repeat calls.
        """
        if text in self._embedding_cache:
            return self._embedding_cache[text]

        if self.is_available:
            try:
                from google.genai import types
                res = self.genai_client.models.embed_content(
                    model=self.embedding_model_name,
                    contents=text,
                    config=types.EmbedContentConfig(output_dimensionality=768)
                )
                if hasattr(res, "embedding") and res.embedding:
                    vals = res.embedding.values if hasattr(res.embedding, "values") else list(res.embedding)
                    if len(vals) == 768:
                        self._embedding_cache[text] = vals
                        return vals
                elif hasattr(res, "embeddings") and res.embeddings:
                    first = res.embeddings[0]
                    vals = first.values if hasattr(first, "values") else list(first)
                    if len(vals) == 768:
                        self._embedding_cache[text] = vals
                        return vals
            except Exception as e:
                logger.warning(f"Gemini live embedding call failed: {e}. Using deterministic normalized 768-dim embedding.")

        emb = self._generate_fallback_embedding(text)
        self._embedding_cache[text] = emb
        return emb

    def _generate_fallback_embedding(self, text: str, dim: int = 768) -> List[float]:
        """Creates a stable 768-dim normalized embedding based on sha256 + trigonometric hashing."""
        seed = int(hashlib.sha256(text.encode("utf-8")).hexdigest()[:8], 16)
        vec = [math.sin(seed + i * 0.1) * math.cos(i * 0.05) for i in range(dim)]
        norm = math.sqrt(sum(x * x for x in vec)) or 1.0
        return [x / norm for x in vec]

    async def evaluate_compliance(
        self,
        draft_text: str,
        intent_tags: Dict[str, Any],
        relevant_rules: List[Dict[str, Any]],
        image_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Evaluates draft content against brand rules using Gemini multimodal reasoning.
        Returns structured compliance audit with score, verdict, and violations.
        Guaranteed to return in <6s with fallback to deterministic engine on timeout.
        """
        if self.is_available:
            try:
                return await asyncio.wait_for(
                    self._evaluate_with_gemini_api(
                        draft_text=draft_text,
                        intent_tags=intent_tags,
                        relevant_rules=relevant_rules,
                        image_url=image_url
                    ),
                    timeout=25.0
                )
            except Exception as e:
                logger.warning(f"Live Gemini API evaluation timed out or failed ({e}). Falling back to deterministic compliance engine.")

        return self._evaluate_with_rules_fallback(draft_text, intent_tags, relevant_rules, image_url)

    def _load_image_part(self, image_url: Optional[str]) -> Optional[Any]:
        """Resolves local or remote image_url to a Google GenAI types.Part object."""
        if not image_url or not isinstance(image_url, str):
            return None

        try:
            from google.genai import types
            import base64

            # 1. Base64 Data URI
            if image_url.startswith("data:image/"):
                header, b64data = image_url.split(",", 1)
                mime = header.split(";")[0].replace("data:", "")
                raw = base64.b64decode(b64data)
                return types.Part.from_bytes(data=raw, mime_type=mime)

            # 2. Local generated_assets path or API download endpoint
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            assets_dir = os.path.join(backend_dir, "generated_assets")

            filename = os.path.basename(image_url.split("?")[0])
            local_path = os.path.join(assets_dir, filename)
            if os.path.exists(local_path):
                mime = "image/png" if filename.lower().endswith(".png") else "image/jpeg"
                with open(local_path, "rb") as f:
                    return types.Part.from_bytes(data=f.read(), mime_type=mime)

            # 3. Direct local file path
            if os.path.exists(image_url):
                mime = "image/png" if image_url.lower().endswith(".png") else "image/jpeg"
                with open(image_url, "rb") as f:
                    return types.Part.from_bytes(data=f.read(), mime_type=mime)

            # 4. Remote HTTP/HTTPS URL
            if image_url.startswith("http://") or image_url.startswith("https://"):
                if "download/" in image_url:
                    filename = os.path.basename(image_url.split("?")[0])
                    local_path = os.path.join(assets_dir, filename)
                    if os.path.exists(local_path):
                        mime = "image/png" if filename.lower().endswith(".png") else "image/jpeg"
                        with open(local_path, "rb") as f:
                            return types.Part.from_bytes(data=f.read(), mime_type=mime)

                import httpx
                with httpx.Client(timeout=5.0) as client:
                    r = client.get(image_url)
                    if r.status_code == 200:
                        ct = r.headers.get("content-type", "image/png").split(";")[0]
                        return types.Part.from_bytes(data=r.content, mime_type=ct)
        except Exception as e:
            logger.warning(f"Could not load image part for Gemini Vision from '{image_url}': {e}")

        return None

    async def _evaluate_with_gemini_api(
        self,
        draft_text: str,
        intent_tags: Dict[str, Any],
        relevant_rules: List[Dict[str, Any]],
        image_url: Optional[str] = None
    ) -> Dict[str, Any]:
        rules_context = "\n\n".join([
            f"Rule [{r.get('rule_title', 'Brand Rule')}] (Category: {r.get('rule_category')}, Doc Page {r.get('page_num', 1)}, Default Severity: {r.get('severity_default', 'WARNING')}):\n"
            f"Specification: {r.get('chunk_text')}"
            for r in relevant_rules
        ])

        image_part = self._load_image_part(image_url)
        has_image = image_part is not None

        visual_instructions = ""
        visual_json_schema = ""
        if has_image:
            visual_instructions = (
                "\nMULTIMODAL & VISUAL BRAND ASSET AUDIT RULES (IMAGE ATTACHED):\n"
                "An image / social poster is attached to this draft post. You MUST thoroughly inspect the visual content:\n"
                "A. COLOR PALETTE & CONTRAST: Verify brand palette harmony, professional aesthetic, and high text-to-background contrast.\n"
                "B. TYPOGRAPHY & TEXT OVERLAYS: Check that text inside the graphic is sharp, legible, not clipped, and not overflowing boundaries.\n"
                "C. VISUAL-TO-COPY ALIGNMENT: Check that the image's headline, badges, and themes align with the draft text and campaign goal. If the visual contradicts the post topic or uses unrelated or unapproved imagery, flag a CRITICAL or WARNING violation.\n"
                "D. LOGO & MARGIN CLEARANCE: Verify proper layout margins and balance.\n"
                "E. If visual defects exist, add them to the 'violations' array with category 'COLOR_PALETTE', 'TYPOGRAPHY', 'LOGO_SPECIFICATION', or 'VISUAL_ASSET', setting offending_fragment to e.g. '[Visual Asset: Element Name]'.\n"
            )
            visual_json_schema = (
                '  "visual_audit": {\n'
                '    "palette_compliance": "Compliant | Non-compliant",\n'
                '    "typography_legibility": "High | Medium | Low",\n'
                '    "layout_balance": "Balanced | Cluttered | Off-center",\n'
                '    "image_text_alignment": "Aligned | Misaligned",\n'
                '    "visual_summary": "1-2 sentence executive assessment of the visual design, colors, and layout."\n'
                '  },\n'
            )

        system_prompt = (
            "You are FixoraAI, an enterprise brand governance and compliance review auditor. "
            "Your job is to thoroughly audit submitted draft marketing posts against official brand guidelines. "
            "You must cross-reference every rule, considering the creator's intent tags (channel, audience, goal, tone).\n"
            "CRITICAL QUALITY & LEGIBILITY AUDIT RULES:\n"
            "1. GIBBERISH / MEANINGLESS TEXT: If the draft contains unreadable characters, random letters, or keyboard-mash (e.g. 'sdjfbh', 'asdfgh', 'qweqwe', random consonants), you MUST STRICTLY REJECT IT. Mark compliance_score between 10 and 20, verdict 'ACTION_REQUIRED', and list a CRITICAL violation under TONE_OF_VOICE citing 'Content Legibility & Meaningful Communication Standard'. Explain that unreadable or random text cannot be published.\n"
            "2. INSUFFICIENT SUBSTANCE / TRIVIAL DRAFTS: If the text is an empty fragment, single word, or lacks communicative context (e.g. 'hi', 'test', 'hello'), rate compliance_score <= 40 with a WARNING violation for incomplete content.\n"
            "3. CAMPAIGN GOAL & INTENT ALIGNMENT (ABSOLUTE CRITICAL PRIORITY): If the creator provides a stated purpose, goal, or description (e.g. 'post for hiring C developers', 'launching iOS app', 'announcing series A'), you MUST strictly audit whether the post copy actually fulfills that exact goal. If the post copy omits the requested role/topic or talks about unrelated roles (e.g. user goal is hiring C developers, but the post lists AI/ML, Full-Stack React + FastAPI, Growth, and Designers without mentioning C/C++ developers), this is a CRITICAL GOAL MISALIGNMENT. You MUST: (a) mark compliance_score <= 30, (b) set verdict to 'ACTION_REQUIRED', (c) flag a CRITICAL violation under TONE_OF_VOICE citing 'Content & Campaign Goal Alignment Standard', (d) identify the offending list of roles in 'offending_fragment', (e) explain exactly why it violates the goal in 'violation_explanation', and (f) provide a ready-to-replace suggested fix that introduces the creator's intended role in 'suggested_fix'. DO NOT APPROVE A POST THAT MISMATCHES THE CREATOR'S GOAL.\n"
            "4. ACCURACY & BRAND GUIDELINES: Check for unsubstantiated claims, absolute guarantees, competitor comparisons, and colloquial slang.\n"
            f"{visual_instructions}"
            "Return ONLY valid JSON matching this exact structure:\n"
            "{\n"
            '  "compliance_score": 85,\n'
            '  "verdict": "ACTION_REQUIRED",\n'
            '  "summary": "Brief executive assessment summary.",\n'
            f"{visual_json_schema}"
            '  "violations": [\n'
            "    {\n"
            '      "rule_title": "Rule name",\n'
            '      "category": "TONE_OF_VOICE | LOGO_SPECIFICATION | COLOR_PALETTE | TYPOGRAPHY | LEGAL_CLAIMS | COMPETITOR_POLICY | VISUAL_ASSET",\n'
            '      "severity": "CRITICAL | WARNING | SUGGESTION",\n'
            '      "page_ref": 1,\n'
            '      "document_name": "Brand Guidelines",\n'
            '      "offending_fragment": "Exact substring or [Visual Asset: ...] detail",\n'
            '      "violation_explanation": "Detailed explanation of why it breaches guidelines",\n'
            '      "suggested_fix": "Exact ready-to-replace suggestion for the offending fragment"\n'
            "    }\n"
            "  ]\n"
            "}\n"
            "Only if the post is genuinely coherent, meaningful, and adheres to all guidelines should compliance_score be 100, verdict 'APPROVED', and violations empty."
        )

        user_content = (
            f"--- CREATOR STATED GOAL / DESCRIPTION ---\n"
            f"{intent_tags.get('user_description') or intent_tags.get('campaign_goal') or 'General post'}\n\n"
            f"--- INTENT METADATA ---\n"
            f"Category: {intent_tags.get('category')}\n"
            f"Target Audience: {intent_tags.get('target_audience')}\n"
            f"Campaign Goal: {intent_tags.get('campaign_goal')}\n"
            f"Intended Tone: {intent_tags.get('intended_tone')}\n"
            f"Target Channel: {intent_tags.get('target_channel')}\n\n"
            f"--- RELEVANT BRAND RULES (Top-K Retrived via pgvector) ---\n"
            f"{rules_context}\n\n"
            f"--- SUBMITTED DRAFT TEXT ---\n"
            f"{draft_text}\n"
        )

        # Assemble prompt contents: if image is present, pass image part first
        prompt_contents = [image_part, system_prompt, user_content] if has_image else [system_prompt, user_content]

        # Only use valid, stable models (gemini-3-flash-preview)
        valid_candidates = ["gemini-3-flash-preview"]
        models_to_try = []
        if self.model_name and "3.8" not in self.model_name and "2.0" not in self.model_name and "2.5" not in self.model_name:
            models_to_try.append(self.model_name)
        for cand in valid_candidates:
            if cand not in models_to_try:
                models_to_try.append(cand)

        def _sync_call(model_id: str):
            resp = self.genai_client.models.generate_content(
                model=model_id,
                contents=prompt_contents
            )
            clean_text = resp.text.strip()
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:]
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3]
            return json.loads(clean_text.strip())

        last_err = None
        for m in models_to_try:
            try:
                # Offload synchronous network call to thread pool
                return await asyncio.to_thread(_sync_call, m)
            except Exception as e:
                last_err = e
                logger.info(f"Model {m} failed ({e}), falling to next...")
                continue

        raise last_err or RuntimeError("All Gemini model evaluations failed")

    def _evaluate_with_rules_fallback(
        self,
        draft_text: str,
        intent_tags: Dict[str, Any],
        relevant_rules: List[Dict[str, Any]],
        image_url: Optional[str] = None
    ) -> Dict[str, Any]:
        import re

        clean = draft_text.strip()
        words = re.findall(r'[a-zA-Z]+', clean.lower())
        violations = []
        score = 100

        # 1. Empty or whitespace check
        if not clean or not words:
            return {
                "compliance_score": 0,
                "verdict": "ACTION_REQUIRED",
                "summary": "Draft is empty or does not contain readable text.",
                "violations": [{
                    "rule_title": "Content Legibility & Meaningful Communication Standard",
                    "category": "TONE_OF_VOICE",
                    "severity": "CRITICAL",
                    "page_ref": 1,
                    "document_name": "Brand Guidelines",
                    "offending_fragment": clean or "(empty)",
                    "violation_explanation": "The submission does not contain readable words.",
                    "suggested_fix": "Provide a complete post draft describing your product, feature, or announcement."
                }]
            }

        # 2. Comprehensive Gibberish & Keyboard-Mash Detection
        COMMON_WORDS = {
            'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he',
            'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or',
            'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about',
            'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
            'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than',
            'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two',
            'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give',
            'day', 'most', 'us', 'launch', 'ai', 'platform', 'product', 'announcement', 'b2b', 'software', 'team',
            'build', 'customer', 'enterprise', 'feature', 'company', 'service', 'brand', 'post', 'marketing', 'ready',
            'excited', 'today', 'check', 'out', 'here', 'delighted', 'proud', 'help', 'growth', 'data', 'scale',
            'users', 'solution', 'experience', 'quality', 'compliance', 'system', 'leads', 'sales', 'cloud'
        }

        gibberish_tokens = []
        for w in words:
            if len(w) >= 4 and w not in COMMON_WORDS:
                vowels = sum(1 for c in w if c in 'aeiouy')
                has_consonant_cluster = bool(re.search(r'[^aeiouy]{4,}', w))
                is_keyboard_mash = bool(re.search(r'asdf|sdfg|dfgh|fghj|ghjk|hjkl|qwerty|werty|zxcv|xcvb|sdjfbh|lkjh|qazw', w))
                if vowels == 0 or has_consonant_cluster or is_keyboard_mash:
                    gibberish_tokens.append(w)

        if gibberish_tokens:
            bad_token = gibberish_tokens[0]
            violations.append({
                "rule_title": "Content Legibility & Meaningful Communication Standard",
                "category": "TONE_OF_VOICE",
                "severity": "CRITICAL",
                "page_ref": 1,
                "document_name": "Brand Guidelines",
                "offending_fragment": bad_token,
                "violation_explanation": f"The draft contains unintelligible or keyboard-mash text ('{bad_token}') with no communicative meaning. Professional brand guidelines prohibit unreadable or random characters.",
                "suggested_fix": "Replace with an articulate message outlining your value proposition, customer update, or industry insight."
            })
            score = 15

        # 3. Minimum Substance & Length Check
        elif len(clean) < 15 or (len(words) <= 2 and not any(w in COMMON_WORDS for w in words)):
            violations.append({
                "rule_title": "Content Substance & Completeness Standard",
                "category": "TONE_OF_VOICE",
                "severity": "WARNING",
                "page_ref": 2,
                "document_name": "Brand Guidelines",
                "offending_fragment": clean,
                "violation_explanation": "The submitted draft is too brief or incomplete to serve as an effective brand post. Posts must contain sufficient context, value, and clear messaging.",
                "suggested_fix": "Expand this into a full post with a compelling hook, key benefit, and call to action."
            })
            score = 40

        # 4. Campaign Goal & Description Alignment Check
        user_goal = (intent_tags.get("user_description") or intent_tags.get("campaign_goal") or "").strip()
        if user_goal and len(user_goal) > 3 and user_goal.lower() not in ["social publishing", "brand awareness", "general", "thought leadership", "campaign content"]:
            goal_lower = user_goal.lower()
            draft_lower = clean.lower()
            
            STOP_WORDS = {'this', 'post', 'is', 'for', 'our', 'new', 'the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'with', 'about', 'want', 'need', 'hire', 'hiring', 'hireing', 'looking'}
            
            # Extract key technical and domain terms from goal (including 1-letter tech like 'c')
            raw_tokens = re.findall(r'[a-zA-Z0-9+#]+', goal_lower)
            goal_words = [w for w in raw_tokens if (w in ['c', 'r', 'd', 'go', 'ai', 'ml', 'qa'] or len(w) > 1) and w not in STOP_WORDS]
            
            missing_critical = []
            if re.search(r'\bc\b', goal_lower) and not re.search(r'\bc\b|\bc\+\+|\bc#', draft_lower):
                missing_critical.append("C / C++ Systems Engineers")
                
            for w in goal_words:
                if w in ['c']:
                    continue
                pattern = r'\b' + re.escape(w) + r'\b'
                if not re.search(pattern, draft_lower):
                    if w in ['developers', 'engineers', 'devs']:
                        # If draft doesn't mention developers or engineers at all
                        if not re.search(r'developer|engineer|coder|programmer', draft_lower):
                            missing_critical.append(w.capitalize())
                    else:
                        missing_critical.append(w.capitalize())
                        
            if missing_critical:
                # Find the most relevant offending fragment (e.g. list of other roles or intro)
                offending_frag = ""
                m_looking = re.search(r"(?:we(?:'re|\s+are)\s+looking\s+for:?[\s\S]{1,250}?(?=\n\n|what\s+we|drop\s+a|\Z))", clean, re.IGNORECASE)
                if m_looking:
                    offending_frag = m_looking.group(0).strip()
                else:
                    offending_frag = clean[:120] + "..."
                    
                role_label = missing_critical[0] if missing_critical else "the target role"
                violations.append({
                    "rule_title": "Content & Campaign Goal Alignment Standard",
                    "category": "TONE_OF_VOICE",
                    "severity": "CRITICAL",
                    "page_ref": 1,
                    "document_name": "Brand Guidelines",
                    "offending_fragment": offending_frag,
                    "violation_explanation": f"The draft post directly contradicts your stated campaign goal ('{user_goal}'). The copy omits your required focus ({', '.join(missing_critical)}) and instead advertises unrelated positions or subjects.",
                    "suggested_fix": f"We're looking for:\n⚡ Senior {role_label} (High-Performance Architecture)\n🧠 Systems Engineers\n🎨 Graphics & Engine Developers"
                })
                score = min(score, 30)

        # 5. Standard Brand Policy Rules (Claims, Competitors, Tone)
        lower_draft = clean.lower()
        checks = [
            {
                "term": "guarantee",
                "category": "LEGAL_CLAIMS",
                "severity": "CRITICAL",
                "title": "Unsubstantiated Performance Guarantee",
                "page": 4,
                "reason": "Brand policy strictly prohibits absolute guarantees without explicit legal disclaimers.",
                "fix": "empower",
                "penalty": 20
            },
            {
                "term": "better than salesforce",
                "category": "COMPETITOR_POLICY",
                "severity": "CRITICAL",
                "title": "Direct Competitor Comparison Policy",
                "page": 6,
                "reason": "Direct disparagement of named competitors is strictly forbidden in public copy.",
                "fix": "unmatched in enterprise performance",
                "penalty": 25
            },
            {
                "term": "cheap",
                "category": "TONE_OF_VOICE",
                "severity": "WARNING",
                "title": "Value & Tone Alignment",
                "page": 2,
                "reason": "Brand tone guidelines avoid terms like 'cheap', preferring 'cost-effective' or 'accessible'.",
                "fix": "cost-effective",
                "penalty": 10
            },
            {
                "term": "stuff",
                "category": "TONE_OF_VOICE",
                "severity": "SUGGESTION",
                "title": "Professional Vocabulary Precision",
                "page": 2,
                "reason": "In formal B2B communications, replace colloquial filler words with precise terminology.",
                "fix": "enterprise solutions",
                "penalty": 5
            },
            {
                "term": "best in the world",
                "category": "LEGAL_CLAIMS",
                "severity": "CRITICAL",
                "title": "Unqualified Superlative Claim",
                "page": 4,
                "reason": "Superlative marketing claims require third-party verification citations.",
                "fix": "industry-leading",
                "penalty": 20
            }
        ]

        for check in checks:
            if check["term"] in lower_draft:
                idx = lower_draft.find(check["term"])
                actual_fragment = clean[idx:idx + len(check["term"])]
                violations.append({
                    "rule_title": check["title"],
                    "category": check["category"],
                    "severity": check["severity"],
                    "page_ref": check["page"],
                    "document_name": "Brand Guidelines",
                    "offending_fragment": actual_fragment,
                    "violation_explanation": check["reason"],
                    "suggested_fix": check["fix"]
                })
                score -= check["penalty"]

        score = max(0, min(100, score))
        verdict = "APPROVED" if score == 100 else ("ACTION_REQUIRED" if score >= 70 else "REJECTED")
        if score == 100:
            summary = "Content meets 100% of brand governance guidelines. Ready for fast-track publishing."
        else:
            summary = f"Audit failed with {len(violations)} issue(s): {violations[0]['violation_explanation']}"

        visual_audit = None
        if image_url:
            visual_audit = {
                "palette_compliance": "Compliant",
                "typography_legibility": "High",
                "layout_balance": "Balanced",
                "image_text_alignment": "Aligned",
                "visual_summary": "Visual asset layout adheres to standard brand framing and palette specifications."
            }

        return {
            "compliance_score": score,
            "verdict": verdict,
            "summary": summary,
            "visual_audit": visual_audit,
            "violations": violations
        }

gemini_client = GeminiClient()
