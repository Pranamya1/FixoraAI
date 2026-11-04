import json
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_employee_analytics_dashboard():
    print("Testing GET /api/analytics/employees ...")
    res = client.get("/api/analytics/employees")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    
    data = res.json()
    assert "summary" in data
    assert "timeline_graph" in data
    assert "category_distribution_graph" in data
    assert "employee_leaderboard" in data
    assert "ai_coaching_insights" in data

    summary = data["summary"]
    print(f"✅ Summary: {json.dumps(summary, indent=2)}")
    assert summary["total_mistakes_caught"] > 0
    assert summary["total_posts_reviewed"] > 0

    timeline = data["timeline_graph"]
    print(f"✅ Timeline Graph Points: {len(timeline)} days")
    assert len(timeline) > 0
    first_pt = timeline[0]
    assert "date" in first_pt
    assert "average_score" in first_pt
    assert "total_mistakes" in first_pt
    print(f"   Sample Day: {first_pt}")

    categories = data["category_distribution_graph"]
    print(f"✅ Category Breakdown: {len(categories)} categories")
    for cat in categories:
        print(f"   - {cat['category']}: {cat['count']} ({cat['percentage']}%)")

    leaderboard = data["employee_leaderboard"]
    print(f"✅ Employee Leaderboard: {len(leaderboard)} employees")
    for emp in leaderboard:
        print(f"   - {emp['employee_name']} ({emp['role']}): Score={emp['average_compliance_score']}%, Mistakes={emp['total_mistakes']}, Risk={emp['risk_level']}")

    insights = data["ai_coaching_insights"]
    print(f"✅ AI Coaching Insights: {len(insights)} items")
    for ins in insights:
        print(f"   * {ins}")

def test_individual_employee_detail():
    marcus_id = "00000000-0000-0000-0000-000000000004"
    print(f"\nTesting GET /api/analytics/employees/{marcus_id} ...")
    res = client.get(f"/api/analytics/employees/{marcus_id}")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

    detail = res.json()
    assert "employee" in detail
    assert "mistake_history" in detail
    assert "compliance_timeline" in detail
    assert "ai_training_recommendation" in detail

    emp = detail["employee"]
    print(f"✅ Employee: {emp['employee_name']} ({emp['risk_level']})")
    print(f"   Mistakes Count: {len(detail['mistake_history'])}")
    print(f"   AI Training Recommendation:\n   👉 {detail['ai_training_recommendation']}")

if __name__ == "__main__":
    test_employee_analytics_dashboard()
    test_individual_employee_detail()
    print("\n🎉 ALL EMPLOYEE MISTAKE ANALYTICS TESTS PASSED!")
