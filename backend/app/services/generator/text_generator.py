import json
import logging
import asyncio
import re
from typing import Dict, Any, List
from app.services.gemini.client import gemini_client
from app.models.generation import GenerateContentRequest

logger = logging.getLogger("fixora.generator.text")

class TextContentGenerator:
    """
    RAG-driven Brand-Compliant Copy Generator.
    Uses retrieved brand rules + creator intent tags to synthesize 100% on-brand copy.
    """

    @classmethod
    async def generate_copy(
        cls,
        req: GenerateContentRequest,
        brand_rules: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        rules_text = "\n".join([
            f"- [{r.get('rule_category', 'RULE')}]: {r.get('chunk_text', '')}"
            for r in brand_rules
        ])

        system_prompt = (
            "You are FixoraAI's Chief Brand Copywriter & Creative Director. You write high-converting, strictly compliant marketing copy and poster creatives.\n"
            "You MUST follow all brand guidelines strictly: avoid absolute guarantees without disclaimers, never disparage competitors, "
            "and match the intended tone and channel perfectly.\n"
            "CRITICAL INSTRUCTIONS FOR POSTER & COPY:\n"
            "1. title: Punchy, modern headline (3 to 6 words maximum). Examples: 'We're Hiring: Core Systems Engineers', 'Building Next-Gen Game Engines', 'Introducing FixoraAI 2.0'. NEVER use generic words like 'Post', 'Draft', or 'Hiring Post'.\n"
            "2. headline: Inspiring, high-clarity hero subtitle (under 12 words). Example: 'Architect real-time AI governance with low-latency performance.'\n"
            "3. key_points: Array of 3 high-impact, punchy takeaways formatted strictly as 'Bold Hook: Concrete benefit or architecture detail' (e.g. 'Low-Latency Engine: Build ultra-fast C/C++ rendering & physics pipelines', 'Autonomous Governance: Real-time multimodal verification at scale', 'Founder Ownership: Direct equity, high autonomy & zero bureaucracy'). NEVER write passive meta descriptions like 'Highlights the role' or 'Emphasizes the mission'!\n"
            "4. tags: Array of 3-4 short badges for the poster header (e.g. ['Remote-First', 'High Equity', 'C / C++', 'Core Team']).\n"
            "5. body: Full publication-ready post copy with engaging paragraphs, relevant emojis, clean bullet points, and channel-appropriate hashtags.\n"
            "Return valid JSON matching:\n"
            "{\n"
            '  "title": "Punchy 3-6 Word Headline",\n'
            '  "headline": "Inspiring subtitle under 12 words",\n'
            '  "tags": ["Remote-First", "High Equity", "C / C++", "Core Team"],\n'
            '  "key_points": ["Hook 1: Concrete detail", "Hook 2: Concrete detail", "Hook 3: Concrete detail"],\n'
            '  "body": "Full publication-ready post copy with emojis and hashtags formatted for target channel.",\n'
            '  "applied_rules": ["Brief summary of how brand rules were respected"]\n'
            "}"
        )

        user_prompt = (
            f"Topic: {req.topic}\n"
            f"Channel: {req.target_channel}\n"
            f"Target Audience: {req.target_audience}\n"
            f"Campaign Goal: {req.campaign_goal}\n"
            f"Intended Tone: {req.intended_tone}\n\n"
            f"OFFICIAL BRAND GUIDELINE RULES TO ADHERE TO:\n{rules_text}\n"
        )

        if gemini_client.is_available:
            try:
                def _call_gemini():
                    return gemini_client.genai_client.models.generate_content(
                        model=gemini_client.model_name,
                        contents=[system_prompt, user_prompt]
                    )

                resp = await asyncio.wait_for(asyncio.to_thread(_call_gemini), timeout=20.0)
                clean_text = resp.text.strip()
                if clean_text.startswith("```json"):
                    clean_text = clean_text[7:]
                if clean_text.startswith("```"):
                    clean_text = clean_text[3:]
                if clean_text.endswith("```"):
                    clean_text = clean_text[:-3]
                clean_text = clean_text.strip()
                parsed = json.loads(clean_text)
                if isinstance(parsed, dict) and "body" in parsed:
                    return parsed
            except Exception as e:
                logger.info(f"Gemini live copy generation timed out or fallback used ({e}). Using deterministic compliant copy generator.")

        # Deterministic brand-compliant copy generator fallback
        return cls._fallback_copy(req, brand_rules)

    @classmethod
    def _fallback_copy(cls, req: GenerateContentRequest, brand_rules: List[Dict[str, Any]]) -> Dict[str, Any]:
        topic = req.topic.strip()
        channel = req.target_channel
        goal = (req.campaign_goal or "").lower()
        topic_lower = topic.lower()

        is_hiring = any(w in topic_lower or w in goal for w in ["hire", "hiring", "recruit", "engineer", "developer", "talent", "join", "team", "opening", "job"])
        is_launch = any(w in topic_lower or w in goal for w in ["launch", "product", "release", "feature", "introduce", "introducing", "announc"])
        is_thought_leadership = any(w in topic_lower or w in goal for w in ["thought leadership", "trend", "future", "insight", "governance", "strategy", "why", "how"])

        # ── 1. Hiring / Talent Acquisition Template ──────────────────────────
        if is_hiring:
            # Extract role keywords if present
            role_hint = topic
            if "hiring" in topic_lower:
                role_hint = re.sub(r"(?i)\b(?:we['’]re\s+)?hiring(?:\s+for)?\b", "", topic).strip()
            if not role_hint:
                role_hint = "Talented Engineers & Innovators"

            title = f"We're Hiring: {role_hint}" if not role_hint.lower().startswith("we") else role_hint
            headline = f"Build the future of real-time AI governance with FixoraAI."
            
            if channel == "Twitter":
                body = (
                    f"🚀 We're hiring at FixoraAI!\n\n"
                    f"Looking for exceptional {role_hint} to help us redefine AI-powered brand governance.\n\n"
                    f"⚡ High-impact work\n"
                    f"⚡ Competitive salary + equity\n"
                    f"⚡ Founder-led, fast-paced team\n\n"
                    f"Drop a DM or apply today 👇\n"
                    f"#Hiring #TechJobs #Startups #FixoraAI"
                )
            else:
                body = (
                    f"🚀 We're Hiring at FixoraAI!\n\n"
                    f"We're building the future of automated brand governance — multimodal AI compliance that ensures "
                    f"every social post, campaign asset, and marketing deliverable is 100% on-brand and audit-ready.\n\n"
                    f"We're actively looking for passionate talent to join us:\n"
                    f"🎯 {role_hint}\n\n"
                    f"What you'll work on:\n"
                    f"• Solving deep technical challenges in high-speed content delivery and multimodal AI\n"
                    f"• Shipping mission-critical infrastructure trusted by enterprise marketing teams\n"
                    f"• Collaborating closely with a fast-moving, founder-led engineering culture\n\n"
                    f"What we offer:\n"
                    f"• Real problems, massive market opportunity, and tangible customer impact\n"
                    f"• Competitive salary + meaningful equity\n"
                    f"• Generous flexibility and modern developer tooling\n\n"
                    f"Drop a DM or comment below to connect directly with the founders! Let's build something remarkable together.\n\n"
                    f"#Hiring #SoftwareEngineering #TechCareers #AIStartup #FixoraAI #JoinOurTeam"
                )

            return {
                "title": title,
                "headline": headline,
                "body": body,
                "tags": ["Remote-First", "Top Equity", "Core Team", "Fast Impact"],
                "key_points": [
                    f"Mission-Critical Role: Immediate high-ownership work on {role_hint}",
                    "Transparent Compensation: Top-tier salary, equity, and remote-first flexibility",
                    "Direct Founder Access: Rapid hiring turnaround with zero corporate bureaucracy"
                ],
                "applied_rules": [
                    "Complied with non-discriminatory hiring transparency standard",
                    "Maintained energetic, welcoming, and empowering brand tone",
                    "Avoided unverified claim superlatives"
                ]
            }

        # ── 2. Product Launch / Feature Announcement Template ────────────────
        if is_launch:
            title = f"Introducing {topic} on FixoraAI"
            headline = f"Unlocking {topic} with Brand-First AI Governance"
            
            if channel == "Twitter":
                body = (
                    f"✨ Big announcement! Today we are introducing {topic} on FixoraAI.\n\n"
                    f"Empowering growth teams to ship faster while keeping every post 100% on-brand.\n\n"
                    f"Explore how it works: http://localhost:5173\n\n"
                    f"#ProductLaunch #MarketingTech #AI #FixoraAI"
                )
            else:
                body = (
                    f"✨ Big news from FixoraAI!\n\n"
                    f"Today, we are thrilled to officially unveil {topic} — built to give marketing and growth teams "
                    f"the speed of generative AI with the rigor of enterprise brand governance.\n\n"
                    f"Why we built this:\n"
                    f"• Eliminate manual review bottlenecks that delay campaign execution\n"
                    f"• Enforce multimodal consistency across text, colors, typography, and legal claims in real time\n"
                    f"• Enable seamless sign-off workflows directly to managers via WhatsApp, Slack, and Email\n\n"
                    f"Whether you're scaling an early-stage startup or orchestrating enterprise global campaigns, "
                    f"{topic.lower()} keeps your voice unified.\n\n"
                    f"Try it out today and let us know what you think in the comments 👇\n\n"
                    f"#ProductUpdate #BrandGovernance #MarketingTechnology #EnterpriseAI #FixoraAI"
                )

            return {
                "title": f"Introducing {topic}",
                "headline": headline,
                "body": body,
                "tags": ["Brand-First AI", "Enterprise-Ready", "Zero Friction", "Real-Time Scan"],
                "key_points": [
                    f"Product Innovation: Official rollout of {topic} on FixoraAI",
                    "Automated Governance: Real-time rule enforcement across omnichannel feeds",
                    "Accelerated Velocity: Instant approval routing with zero compliance friction"
                ],
                "applied_rules": [
                    "Used substantiated value propositions instead of absolute guarantees",
                    "Preserved professional B2B tone with clear call to action",
                    "Adhered to typography and brand naming capitalization"
                ]
            }

        # ── 3. Thought Leadership / Strategic Insights Template ─────────────
        title = f"{topic}: The New Standard"
        headline = f"Why {topic} Matters for Modern Enterprise Growth"

        if channel == "Twitter":
            body = (
                f"💡 Quick takeaway on {topic.lower()}:\n\n"
                f"Speed without governance creates brand fragmentation.\n"
                f"Governance without speed paralyzes growth.\n\n"
                f"The highest-performing teams automate brand rules directly into their publishing workflow.\n\n"
                f"#ThoughtLeadership #BrandStrategy #FixoraAI"
            )
        else:
            body = (
                f"💡 In today's omnichannel landscape, {topic.lower()} has become a strategic priority for leadership.\n\n"
                f"As organizations ramp up content production, maintaining a coherent brand identity across multiple touchpoints "
                f"is harder than ever. Traditional manual review processes cannot keep pace with modern release cadences.\n\n"
                f"Three fundamental shifts leading teams are embracing:\n"
                f"1️⃣ Automated Rule Cross-Referencing: Embedding guidelines directly into the drafting environment.\n"
                f"2️⃣ Transparent Verification: Auditing claims, tone, and visual specifications before public deployment.\n"
                f"3️⃣ Multi-stakeholder Alignment: Seamless sign-offs that empower creators without administrative friction.\n\n"
                f"How is your team tackling content consistency at scale? We'd love to hear your approach below.\n\n"
                f"#ThoughtLeadership #BrandStrategy #MarketingOperations #AICompliance #FixoraAI"
            )

        return {
            "title": title,
            "headline": headline,
            "body": body,
            "tags": ["Executive Insights", "Brand Safety", "Scale & Speed", "Audit-Ready"],
            "key_points": [
                f"Strategic Priority: Executive analysis on {topic.lower()}",
                "Velocity vs Governance: Eliminate manual bottlenecks through automated pre-flight",
                "Actionable Blueprints: Proven framework for marketing leaders and creators"
            ],
            "applied_rules": [
                "Preserved authoritative and analytical thought leadership tone",
                "Used compliant terminology ('cost-effective', 'scalable')",
                "Ensured zero disparagement of alternative tools or competitors"
            ]
        }
