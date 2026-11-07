from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from app.core.database import db_manager
from app.core.security import get_current_user, UserContext
from app.models.employee_analytics import (
    EmployeeAnalyticsDashboardResponse,
    EmployeeDetailAnalytics
)
from app.services.analytics.mistake_tracker import mistake_tracker_service

router = APIRouter(prefix="/analytics", tags=["Dashboard & Analytics"])

@router.get("/overview")
async def get_analytics_overview(user: UserContext = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Returns enterprise brand governance statistics — reads live from Supabase.
    """
    # Live summary from Supabase (falls back to memory automatically)
    summary_data = await db_manager.get_posts_summary(org_id=user.org_id)

    # Guidelines + chunks still from memory store
    guidelines = [g for g in db_manager._memory_store["brand_guidelines"] if g.get("org_id") == user.org_id]
    chunks = [c for c in db_manager._memory_store["guideline_chunks"] if c.get("org_id") == user.org_id]

    # Violation categories from memory
    cat_counts: Dict[str, int] = {}
    for v in db_manager._memory_store["violations"]:
        cat = v.get("category", "GENERAL")
        cat_counts[cat] = cat_counts.get(cat, 0) + 1

    top_violation_categories = [
        {"category": k, "count": v} for k, v in sorted(cat_counts.items(), key=lambda x: x[1], reverse=True)
    ]

    # Recent activity — fetch live posts from Supabase
    recent_posts = (await db_manager.get_posts(org_id=user.org_id))[:5]

    return {
        "summary": {
            **summary_data,
            "guidelines_count": len(guidelines),
            "indexed_rules_count": len(chunks)
        },
        "top_violation_categories": top_violation_categories,
        "recent_activity": [
            {
                "id": p.get("id"),
                "title": p.get("title"),
                "status": p.get("status"),
                "score": p.get("compliance_score"),
                "channel": (p.get("intent_tags") or {}).get("target_channel")
            }
            for p in recent_posts
        ]
    }

@router.get("/employees", response_model=EmployeeAnalyticsDashboardResponse)
async def get_employee_mistakes_analytics(
    user: UserContext = Depends(get_current_user)
):
    """
    AI Employee Compliance & Mistake Tracking Feature:
    - Catches all mistakes/violations made across team members.
    - Generates timeline graph points (daily compliance score & mistake spikes) ready for line/area charts.
    - Generates category breakdown graph points (Legal, Tone, Competitor claims) for pie/bar charts.
    - Provides Employee Leaderboard with risk scoring (Low, Moderate, Attention Required).
    - Synthesizes proactive AI coaching insights for team leads.
    """
    return mistake_tracker_service.get_dashboard_analytics(org_id=user.org_id)

@router.get("/employees/{user_id}", response_model=EmployeeDetailAnalytics)
async def get_employee_individual_analytics(
    user_id: str,
    user: UserContext = Depends(get_current_user)
):
    """
    Deep dive into a specific employee's mistakes:
    - Complete mistake/violation audit log (rule titles, offending phrases, AI explanations, resolution state)
    - Personal 7-day compliance timeline graph
    - AI-generated personalized coaching & training curriculum
    """
    analytics = mistake_tracker_service.get_employee_detail(user_id=user_id, org_id=user.org_id)
    if not analytics:
        raise HTTPException(status_code=404, detail="Employee not found")
    return analytics

