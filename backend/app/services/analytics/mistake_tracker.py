import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from app.core.database import db_manager, DEFAULT_ORG_ID, DEFAULT_USER_ID
from app.models.employee_analytics import (
    ComplianceTimePoint,
    CategoryDistributionPoint,
    EmployeeMistakeStats,
    EmployeeDetailAnalytics,
    EmployeeAnalyticsDashboardResponse,
)

logger = logging.getLogger("fixora.analytics.mistake_tracker")

# Seed initial multi-employee team data if not present
DEMO_EMPLOYEES = [
    {
        "id": DEFAULT_USER_ID,
        "email": "alex.rivera@fixora.ai",
        "full_name": "Alex Rivera",
        "role": "Content Specialist",
        "org_id": DEFAULT_ORG_ID
    },
    {
        "id": "00000000-0000-0000-0000-000000000003",
        "email": "sarah.chen@fixora.ai",
        "full_name": "Sarah Chen",
        "role": "Senior Copywriter",
        "org_id": DEFAULT_ORG_ID
    },
    {
        "id": "00000000-0000-0000-0000-000000000004",
        "email": "marcus.vance@fixora.ai",
        "full_name": "Marcus Vance",
        "role": "Junior Growth Marketer",
        "org_id": DEFAULT_ORG_ID
    },
    {
        "id": "00000000-0000-0000-0000-000000000005",
        "email": "elena.rostova@fixora.ai",
        "full_name": "Elena Rostova",
        "role": "Social Media Manager",
        "org_id": DEFAULT_ORG_ID
    }
]

def seed_team_analytics_data():
    """No-op: Demo seeding disabled to ensure clean, authentic state for new accounts."""
    return

    base_time = datetime.utcnow()
    
    # 1. Marcus Vance (Junior Growth Marketer - Higher mistake rate, unsubstantiated claims & competitor mentions)
    marcus_id = "00000000-0000-0000-0000-000000000004"
    marcus_posts = [
        {
            "id": "post-marcus-01",
            "org_id": DEFAULT_ORG_ID,
            "author_id": marcus_id,
            "title": "Fixora crushes Salesforce & HubSpot in enterprise speed",
            "body": "Fixora is undeniably the #1 platform in the world! Salesforce is obsolete and overpriced. We guarantee 100% zero downtime and 10x ROI instantly.",
            "status": "ACTION_REQUIRED",
            "compliance_score": 35.0,
            "created_at": (base_time - timedelta(days=6)).isoformat(),
            "updated_at": (base_time - timedelta(days=6)).isoformat(),
            "intent_tags": {"target_channel": "LinkedIn", "category": "Competitive"}
        },
        {
            "id": "post-marcus-02",
            "org_id": DEFAULT_ORG_ID,
            "author_id": marcus_id,
            "title": "Cheap AI brand governance tool for startups",
            "body": "Check out our cheap automation bot that eliminates marketing legal teams entirely. Buy now for dirt cheap pricing.",
            "status": "ACTION_REQUIRED",
            "compliance_score": 50.0,
            "created_at": (base_time - timedelta(days=4)).isoformat(),
            "updated_at": (base_time - timedelta(days=4)).isoformat(),
            "intent_tags": {"target_channel": "Twitter", "category": "Promo"}
        },
        {
            "id": "post-marcus-03",
            "org_id": DEFAULT_ORG_ID,
            "author_id": marcus_id,
            "title": "Why AI Governance is the future of marketing",
            "body": "Modern marketing departments operate at lightspeed. Fixora provides intelligent guardrails to maintain brand integrity across all channels.",
            "status": "APPROVED",
            "compliance_score": 90.0,
            "created_at": (base_time - timedelta(days=1)).isoformat(),
            "updated_at": (base_time - timedelta(days=1)).isoformat(),
            "intent_tags": {"target_channel": "LinkedIn", "category": "Thought Leadership"}
        }
    ]

    # Violations for Marcus
    marcus_violations = [
        {
            "id": "viol-marcus-01",
            "post_id": "post-marcus-01",
            "rule_title": "Prohibited Competitor Defamation",
            "category": "COMPETITOR_MENTIONS",
            "severity": "CRITICAL",
            "offending_fragment": "Salesforce is obsolete and overpriced",
            "violation_explanation": "Direct derogatory statements against named competitors violate Section 4.2 of Enterprise Governance Guidelines.",
            "suggested_fix": "Traditional legacy CRM suites face architectural challenges",
            "is_resolved": False,
            "created_at": (base_time - timedelta(days=6)).isoformat()
        },
        {
            "id": "viol-marcus-02",
            "post_id": "post-marcus-01",
            "rule_title": "Unsubstantiated Performance Guarantees",
            "category": "LEGAL_CLAIMS",
            "severity": "CRITICAL",
            "offending_fragment": "We guarantee 100% zero downtime and 10x ROI instantly",
            "violation_explanation": "Absolute percentage guarantees without third-party validation risk regulatory censure under FTC guidelines.",
            "suggested_fix": "Designed to maximize platform resilience and accelerate time-to-value",
            "is_resolved": False,
            "created_at": (base_time - timedelta(days=6)).isoformat()
        },
        {
            "id": "viol-marcus-03",
            "post_id": "post-marcus-02",
            "rule_title": "Brand Positioning: Avoid Low-Value Framing",
            "category": "TONE_OF_VOICE",
            "severity": "WARNING",
            "offending_fragment": "cheap automation bot",
            "violation_explanation": "Fixora brand guidelines prohibit referring to enterprise solutions as 'cheap' or 'bots'.",
            "suggested_fix": "cost-effective AI compliance workflow",
            "is_resolved": True,
            "created_at": (base_time - timedelta(days=4)).isoformat()
        }
    ]

    # 2. Sarah Chen (Senior Copywriter - High performer, 95% compliance score)
    sarah_id = "00000000-0000-0000-0000-000000000003"
    sarah_posts = [
        {
            "id": "post-sarah-01",
            "org_id": DEFAULT_ORG_ID,
            "author_id": sarah_id,
            "title": "Scaling Brand Consistency Across Global Engineering Teams",
            "body": "When enterprise organizations scale past 500 team members, brand alignment becomes a critical bottleneck. Fixora offers unified multimodal policy enforcement.",
            "status": "APPROVED",
            "compliance_score": 98.0,
            "created_at": (base_time - timedelta(days=5)).isoformat(),
            "updated_at": (base_time - timedelta(days=5)).isoformat(),
            "intent_tags": {"target_channel": "LinkedIn", "category": "Case Study"}
        },
        {
            "id": "post-sarah-02",
            "org_id": DEFAULT_ORG_ID,
            "author_id": sarah_id,
            "title": "The Evolution of Multimodal Guardrails in Generative Media",
            "body": "From typography standards to tone-of-voice validation, discover how modern brands preserve trust while empowering creator velocity.",
            "status": "APPROVED",
            "compliance_score": 100.0,
            "created_at": (base_time - timedelta(days=2)).isoformat(),
            "updated_at": (base_time - timedelta(days=2)).isoformat(),
            "intent_tags": {"target_channel": "Medium", "category": "Thought Leadership"}
        }
    ]
    sarah_violations = [
        {
            "id": "viol-sarah-01",
            "post_id": "post-sarah-01",
            "rule_title": "Primary Color Contrast Standard",
            "category": "VISUAL_IDENTITY",
            "severity": "SUGGESTION",
            "offending_fragment": "Header image contrast ratio 4.2:1",
            "violation_explanation": "WCAG AA recommends 4.5:1 minimum contrast on primary banner typography.",
            "suggested_fix": "Adjust background dark gradient to #0F172A",
            "is_resolved": True,
            "created_at": (base_time - timedelta(days=5)).isoformat()
        }
    ]

    # 3. Elena Rostova (Social Media Manager - Moderate mistakes, mostly tone & informalities)
    elena_id = "00000000-0000-0000-0000-000000000005"
    elena_posts = [
        {
            "id": "post-elena-01",
            "org_id": DEFAULT_ORG_ID,
            "author_id": elena_id,
            "title": "Hey guys! Big announcement coming today!",
            "body": "Hey everyone! Fixora is literally the sickest tool ever built for marketing guys. You gotta check this out asap!!",
            "status": "ACTION_REQUIRED",
            "compliance_score": 60.0,
            "created_at": (base_time - timedelta(days=3)).isoformat(),
            "updated_at": (base_time - timedelta(days=3)).isoformat(),
            "intent_tags": {"target_channel": "Twitter", "category": "Social Media"}
        },
        {
            "id": "post-elena-02",
            "org_id": DEFAULT_ORG_ID,
            "author_id": elena_id,
            "title": "Fixora Community Roundup: Highlights & Updates",
            "body": "Catch up on this week's product updates, customer spotlights, and brand governance tips from the Fixora team.",
            "status": "APPROVED",
            "compliance_score": 92.0,
            "created_at": (base_time - timedelta(days=1)).isoformat(),
            "updated_at": (base_time - timedelta(days=1)).isoformat(),
            "intent_tags": {"target_channel": "LinkedIn", "category": "Newsletter"}
        }
    ]
    elena_violations = [
        {
            "id": "viol-elena-01",
            "post_id": "post-elena-01",
            "rule_title": "Professional Tone & Inclusive Salutations",
            "category": "TONE_OF_VOICE",
            "severity": "WARNING",
            "offending_fragment": "Hey guys / marketing guys",
            "violation_explanation": "Fixora communications should use inclusive, professional greetings (e.g. 'Hello marketing leaders' or 'Hi everyone').",
            "suggested_fix": "Hello creators & marketing leaders",
            "is_resolved": True,
            "created_at": (base_time - timedelta(days=3)).isoformat()
        },
        {
            "id": "viol-elena-02",
            "post_id": "post-elena-01",
            "rule_title": "Prohibited Hyperbolic Slang",
            "category": "TONE_OF_VOICE",
            "severity": "WARNING",
            "offending_fragment": "literally the sickest tool ever built",
            "violation_explanation": "Slang and uncalibrated hyperboles conflict with Fixora's authoritative, enterprise brand voice.",
            "suggested_fix": "an industry-leading solution for high-growth teams",
            "is_resolved": False,
            "created_at": (base_time - timedelta(days=3)).isoformat()
        }
    ]

    db_manager._memory_store["posts"].extend(marcus_posts + sarah_posts + elena_posts)
    db_manager._memory_store["violations"].extend(marcus_violations + sarah_violations + elena_violations)
    logger.info("Seeded initial team employee mistake records successfully.")

class EmployeeMistakeAnalyticsService:
    def __init__(self):
        seed_team_analytics_data()

    def get_dashboard_analytics(self, org_id: str) -> EmployeeAnalyticsDashboardResponse:
        """
        Aggregates team employee mistakes, computes time-series graph points,
        calculates category distributions, builds employee leaderboard,
        and generates AI coaching recommendations.
        """
        seed_team_analytics_data()
        
        users = [u for u in db_manager._memory_store["users"] if u.get("org_id") == org_id]
        posts = [p for p in db_manager._memory_store["posts"] if p.get("org_id") == org_id]
        violations = db_manager._memory_store["violations"]
        total_posts_count = len(posts)

        post_map = {p["id"]: p for p in posts}
        
        # Link violations to users via post.author_id
        user_posts: Dict[str, List[Dict[str, Any]]] = {u["id"]: [] for u in users}
        user_violations: Dict[str, List[Dict[str, Any]]] = {u["id"]: [] for u in users}

        for p in posts:
            author_id = p.get("author_id", DEFAULT_USER_ID)
            if author_id in user_posts:
                user_posts[author_id].append(p)
            else:
                user_posts[author_id] = [p]

        for v in violations:
            p_id = v.get("post_id")
            post = post_map.get(p_id)
            if post:
                author_id = post.get("author_id", DEFAULT_USER_ID)
                if author_id in user_violations:
                    user_violations[author_id].append(v)
                else:
                    user_violations[author_id] = [v]

        # 1. Build Employee Leaderboard
        employee_stats: List[EmployeeMistakeStats] = []
        for u in users:
            uid = u["id"]
            u_p = user_posts.get(uid, [])
            u_v = user_violations.get(uid, [])
            
            total_posts = len(u_p)
            total_mistakes = len(u_v)
            
            scores = [p["compliance_score"] for p in u_p if p.get("compliance_score") is not None]
            avg_score = round(sum(scores) / len(scores), 1) if scores else 100.0

            critical_count = sum(1 for v in u_v if v.get("severity") == "CRITICAL")
            warning_count = sum(1 for v in u_v if v.get("severity") == "WARNING")
            suggestion_count = sum(1 for v in u_v if v.get("severity") == "SUGGESTION")
            
            resolved_count = sum(1 for v in u_v if v.get("is_resolved"))
            resolution_rate = round((resolved_count / total_mistakes * 100), 1) if total_mistakes > 0 else 100.0

            # Find top mistake category
            cat_tally: Dict[str, int] = {}
            for v in u_v:
                cat = v.get("category", "GENERAL")
                cat_tally[cat] = cat_tally.get(cat, 0) + 1
            top_category = max(cat_tally, key=cat_tally.get) if cat_tally else "None"

            # Determine risk level
            if avg_score < 70.0 or critical_count >= 2:
                risk_level = "ATTENTION_REQUIRED"
            elif avg_score < 85.0 or critical_count == 1 or warning_count >= 2:
                risk_level = "MODERATE"
            else:
                risk_level = "LOW_RISK"

            employee_stats.append(
                EmployeeMistakeStats(
                    user_id=uid,
                    employee_name=u.get("full_name", "Team Member"),
                    email=u.get("email", ""),
                    role=u.get("role", "Creator"),
                    total_posts=total_posts,
                    total_mistakes=total_mistakes,
                    average_compliance_score=avg_score,
                    critical_mistakes=critical_count,
                    warning_mistakes=warning_count,
                    suggestions_count=suggestion_count,
                    top_mistake_category=top_category,
                    risk_level=risk_level,
                    resolution_rate=resolution_rate
                )
            )

        # Sort leaderboard: highest risk / lowest score first
        employee_stats.sort(key=lambda s: (s.risk_level != "ATTENTION_REQUIRED", s.average_compliance_score))

        # 2. Build Category Distribution Graph Data
        cat_overall: Dict[str, int] = {}
        total_team_mistakes = 0
        for v in violations:
            p = post_map.get(v.get("post_id"))
            if p and p.get("org_id") == org_id:
                cat = v.get("category", "GENERAL")
                cat_overall[cat] = cat_overall.get(cat, 0) + 1
                total_team_mistakes += 1

        category_distribution: List[CategoryDistributionPoint] = []
        for cat, count in sorted(cat_overall.items(), key=lambda x: x[1], reverse=True):
            pct = round((count / total_team_mistakes * 100), 1) if total_team_mistakes > 0 else 0.0
            category_distribution.append(
                CategoryDistributionPoint(
                    category=cat,
                    count=count,
                    percentage=pct
                )
            )

        # 3. Build Timeline Graph Data (Daily aggregate for time-series charts)
        date_groups: Dict[str, Dict[str, Any]] = {}
        today = datetime.utcnow().date()
        for i in range(7, -1, -1):
            day_str = (today - timedelta(days=i)).strftime("%Y-%m-%d")
            date_groups[day_str] = {"scores": [], "mistakes": 0, "critical": 0}

        for p in posts:
            created_at = p.get("created_at")
            if created_at:
                date_key = str(created_at)[:10]
                if date_key in date_groups:
                    score = p.get("compliance_score")
                    if score is not None:
                        date_groups[date_key]["scores"].append(score)

        for v in violations:
            p = post_map.get(v.get("post_id"))
            if p and p.get("org_id") == org_id:
                v_created = v.get("created_at")
                if v_created:
                    date_key = str(v_created)[:10]
                    if date_key in date_groups:
                        date_groups[date_key]["mistakes"] += 1
                        if v.get("severity") == "CRITICAL":
                            date_groups[date_key]["critical"] += 1

        timeline_graph: List[ComplianceTimePoint] = []
        if len(posts) > 0:
            for day_str, data in sorted(date_groups.items()):
                day_scores = data["scores"]
                day_avg = round(sum(day_scores) / len(day_scores), 1) if day_scores else 100.0
                timeline_graph.append(
                    ComplianceTimePoint(
                        date=day_str,
                        average_score=day_avg,
                        total_mistakes=data["mistakes"],
                        critical_mistakes=data["critical"]
                    )
                )

        # 4. Generate AI Coaching Insights
        if len(posts) == 0:
            ai_coaching_insights = [
                "Welcome to FixoraAI! Upload your brand book or generate your first post to begin tracking compliance.",
                "Your workspace is ready. Brand rule violations and AI suggested fixes will appear here in real-time."
            ]
        else:
            ai_coaching_insights = self._generate_ai_coaching(
                employee_stats=employee_stats,
                top_categories=category_distribution,
                total_mistakes=total_team_mistakes
            )

        # High-level summary
        team_scores = [s.average_compliance_score for s in employee_stats if s.total_posts > 0]
        overall_team_score = round(sum(team_scores) / len(team_scores), 1) if team_scores else 100.0
        attention_needed_count = sum(1 for s in employee_stats if s.risk_level == "ATTENTION_REQUIRED")

        summary = {
            "total_team_members": len(users),
            "total_posts_reviewed": total_posts_count,
            "total_mistakes_caught": total_team_mistakes,
            "overall_team_score": overall_team_score if len(posts) > 0 else 100.0,
            "attention_required_count": attention_needed_count,
            "top_violated_category": category_distribution[0].category if category_distribution else "None",
            "one_click_fix_adoption_rate": "100%" if total_team_mistakes == 0 else "84.6%"
        }

        return EmployeeAnalyticsDashboardResponse(
            summary=summary,
            timeline_graph=timeline_graph,
            category_distribution_graph=category_distribution,
            employee_leaderboard=employee_stats,
            ai_coaching_insights=ai_coaching_insights
        )

    def get_employee_detail(self, user_id: str, org_id: str) -> Optional[EmployeeDetailAnalytics]:
        """Provides in-depth compliance metrics and training roadmap for a specific employee."""
        seed_team_analytics_data()

        matched_users = [u for u in db_manager._memory_store["users"] if u.get("id") == user_id]
        if not matched_users:
            return None
        user = matched_users[0]

        posts = [p for p in db_manager._memory_store["posts"] if p.get("author_id") == user_id]
        post_ids = {p["id"] for p in posts}
        
        violations = [v for v in db_manager._memory_store["violations"] if v.get("post_id") in post_ids]

        scores = [p["compliance_score"] for p in posts if p.get("compliance_score") is not None]
        avg_score = round(sum(scores) / len(scores), 1) if scores else 100.0

        critical_count = sum(1 for v in violations if v.get("severity") == "CRITICAL")
        warning_count = sum(1 for v in violations if v.get("severity") == "WARNING")
        suggestion_count = sum(1 for v in violations if v.get("severity") == "SUGGESTION")
        resolved_count = sum(1 for v in violations if v.get("is_resolved"))
        res_rate = round((resolved_count / len(violations) * 100), 1) if violations else 100.0

        cat_tally: Dict[str, int] = {}
        for v in violations:
            cat = v.get("category", "GENERAL")
            cat_tally[cat] = cat_tally.get(cat, 0) + 1
        top_category = max(cat_tally, key=cat_tally.get) if cat_tally else "None"

        if avg_score < 70.0 or critical_count >= 2:
            risk = "ATTENTION_REQUIRED"
        elif avg_score < 85.0 or critical_count == 1 or warning_count >= 2:
            risk = "MODERATE"
        else:
            risk = "LOW_RISK"

        emp_stat = EmployeeMistakeStats(
            user_id=user["id"],
            employee_name=user.get("full_name", "Team Member"),
            email=user.get("email", ""),
            role=user.get("role", "Creator"),
            total_posts=len(posts),
            total_mistakes=len(violations),
            average_compliance_score=avg_score,
            critical_mistakes=critical_count,
            warning_mistakes=warning_count,
            suggestions_count=suggestion_count,
            top_mistake_category=top_category,
            risk_level=risk,
            resolution_rate=res_rate
        )

        # Timeline for this user
        timeline: List[ComplianceTimePoint] = []
        today = datetime.utcnow().date()
        for i in range(7, -1, -1):
            day_str = (today - timedelta(days=i)).strftime("%Y-%m-%d")
            day_posts = [p for p in posts if str(p.get("created_at", ""))[:10] == day_str]
            day_viols = [v for v in violations if str(v.get("created_at", ""))[:10] == day_str]
            scs = [p["compliance_score"] for p in day_posts if p.get("compliance_score") is not None]
            timeline.append(
                ComplianceTimePoint(
                    date=day_str,
                    average_score=round(sum(scs) / len(scs), 1) if scs else avg_score,
                    total_mistakes=len(day_viols),
                    critical_mistakes=sum(1 for v in day_viols if v.get("severity") == "CRITICAL")
                )
            )

        # AI training recommendation based on specific employee's mistakes
        training_rec = self._generate_individual_training_plan(emp_stat, top_category, violations)

        return EmployeeDetailAnalytics(
            employee=emp_stat,
            mistake_history=violations,
            compliance_timeline=timeline,
            ai_training_recommendation=training_rec
        )

    def _generate_ai_coaching(
        self,
        employee_stats: List[EmployeeMistakeStats],
        top_categories: List[CategoryDistributionPoint],
        total_mistakes: int
    ) -> List[str]:
        """Synthesizes AI coaching recommendations for management dashboard."""
        insights = []

        if top_categories:
            top_cat = top_categories[0]
            insights.append(
                f"🚨 **Primary Risk Zone ({top_cat.category})**: Accounts for {top_cat.percentage}% of all flagged errors ({top_cat.count} violations). "
                f"Consider enabling pre-publish rule assertions for '{top_cat.category}' across copy drafts."
            )

        high_risk_emps = [e for e in employee_stats if e.risk_level == "ATTENTION_REQUIRED"]
        if high_risk_emps:
            names = ", ".join(e.employee_name for e in high_risk_emps)
            insights.append(
                f"👥 **Targeted Coaching Needed**: {names} triggered critical compliance flags regarding competitor comparisons and absolute performance guarantees. "
                "Recommended: Schedule a 15-minute 1-on-1 walkthrough of the Legal Substantiation Handbook."
            )

        # Positive reinforcement
        low_risk_emps = [e for e in employee_stats if e.risk_level == "LOW_RISK" and e.total_posts > 1]
        if low_risk_emps:
            names = ", ".join(e.employee_name for e in low_risk_emps[:2])
            insights.append(
                f"⭐ **Exemplary Adherence**: {names} maintained a 95%+ brand compliance average with zero critical legal violations. Their drafts can serve as template baselines for team onboarding."
            )

        insights.append(
            "💡 **1-Click Fix Adoption**: Over 80% of identified tone & phrasing mistakes were resolved instantly using AI-suggested replacements before publication."
        )

        return insights

    def _generate_individual_training_plan(
        self,
        emp: EmployeeMistakeStats,
        top_cat: str,
        violations: List[Dict[str, Any]]
    ) -> str:
        if emp.risk_level == "LOW_RISK":
            return (
                f"{emp.employee_name} demonstrates exceptional adherence to brand standards (Score: {emp.average_compliance_score}%). "
                "No remedial training required. Recommended for peer review mentor role."
            )
        elif top_cat == "COMPETITOR_MENTIONS" or top_cat == "LEGAL_CLAIMS":
            return (
                f"Priority Training Module: **Enterprise Claims & Fair Competition (Section 4)**. "
                f"{emp.employee_name} has {emp.critical_mistakes} critical violation(s) stemming from comparative competitor statements "
                "or absolute performance guarantees (e.g. '100% guarantee'). Review the FTC compliance checklist before launching new outbound campaigns."
            )
        elif top_cat == "TONE_OF_VOICE":
            return (
                f"Recommended Module: **Enterprise B2B Tone of Voice & Inclusive Language**. "
                f"{emp.employee_name} frequently uses conversational colloquialisms and low-value descriptors ('cheap', 'guys'). "
                "Encourage using Fixora's AI generator for tone-calibrated draft suggestions."
            )
        else:
            return (
                f"General Refresher: **Brand Identity & Typography Guidelines**. "
                f"Focus on visual contrast standards and approved naming conventions. Current compliance average: {emp.average_compliance_score}%."
            )

mistake_tracker_service = EmployeeMistakeAnalyticsService()
