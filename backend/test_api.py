import sys
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_tests():
    print("\n🔍 --- 1. Testing Health Check ---")
    res = client.get("/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("✅ /health passed:", res.json())

    print("\n🔍 --- 2. Testing Brand Guidelines Listing (Pre-seeded vector rules) ---")
    res = client.get("/api/guidelines")
    assert res.status_code == 200, f"List guidelines failed: {res.text}"
    guidelines = res.json()
    assert len(guidelines) > 0, "No guidelines found"
    print(f"✅ /api/guidelines passed: Found {len(guidelines)} guideline(s). Name: '{guidelines[0]['name']}'")

    print("\n🔍 --- 3. Testing Draft Posts Listing ---")
    res = client.get("/api/posts")
    assert res.status_code == 200, f"List posts failed: {res.text}"
    posts = res.json()
    assert len(posts) >= 2, "Expected seed posts not found"
    print(f"✅ /api/posts passed: Found {len(posts)} posts. First title: '{posts[0]['title']}'")

    print("\n🔍 --- 4. Testing Create Draft Post with Intent-Aware Tagging ---")
    new_post_payload = {
        "title": "Automated Brand Audit Announcement",
        "body": "Fixora is the best in the world! We guarantee instant compliance and we are better than Salesforce for cheap enterprise workflows.",
        "image_url": "https://images.unsplash.com/photo-1460925895917-afdab827c52f",
        "intent_tags": {
            "category": "Social Media",
            "target_audience": "Tech Executives",
            "campaign_goal": "Product Launch",
            "intended_tone": "Bold",
            "target_channel": "LinkedIn"
        }
    }
    res = client.post("/api/posts", json=new_post_payload)
    assert res.status_code == 200, f"Create post failed: {res.text}"
    created_post = res.json()
    post_id = created_post["id"]
    print(f"✅ /api/posts (create) passed: Created post ID '{post_id}'")

    print("\n🔍 --- 5. Testing AI Compliance Audit & Citation Engine ---")
    audit_res = client.post("/api/audit/evaluate", json={"post_id": post_id})
    assert audit_res.status_code == 200, f"Audit evaluation failed: {audit_res.text}"
    audit_data = audit_res.json()
    print(f"✅ /api/audit/evaluate passed:")
    print(f"   Score: {audit_data['compliance_score']}% | Verdict: {audit_data['verdict']}")
    print(f"   Found {len(audit_data['violations'])} violation(s):")
    for v in audit_data["violations"]:
        print(f"   - [{v['severity']}] {v['rule_title']} (Page {v['page_ref']}): '{v['offending_fragment']}' -> Fix: '{v['suggested_fix']}'")

    assert len(audit_data["violations"]) > 0, "Expected violations to be detected!"
    first_viol = audit_data["violations"][0]

    print("\n🔍 --- 6. Testing 1-Click Suggested Fix ---")
    fix_payload = {
        "post_id": post_id,
        "violation_id": first_viol["id"],
        "offending_fragment": first_viol["offending_fragment"],
        "suggested_fix": first_viol["suggested_fix"]
    }
    fix_res = client.post("/api/audit/apply-fix", json=fix_payload)
    assert fix_res.status_code == 200, f"Apply fix failed: {fix_res.text}"
    fix_data = fix_res.json()
    print(f"✅ /api/audit/apply-fix passed:")
    print(f"   Updated Score: {fix_data['new_score']}% | Remaining violations: {fix_data['remaining_violations']}")
    print(f"   Updated Body Preview: {fix_data['post']['body'][:120]}...")

    print("\n🔍 --- 7. Testing Direct Publishing Hub ---")
    pub_res = client.post("/api/publish", json={
        "post_id": post_id,
        "platforms": ["LINKEDIN", "TWITTER"]
    })
    assert pub_res.status_code == 200, f"Publish post failed: {pub_res.text}"
    pub_data = pub_res.json()
    print(f"✅ /api/publish passed: Published to {len(pub_data)} platform(s):")
    for p in pub_data:
        print(f"   - Platform: {p['platform']} | Status: {p['status']} | URL: {p['external_url']}")

    print("\n🔍 --- 8. Testing Dashboard Analytics ---")
    analytics_res = client.get("/api/analytics/overview")
    assert analytics_res.status_code == 200, f"Analytics overview failed: {analytics_res.text}"
    analytics_data = analytics_res.json()
    print(f"✅ /api/analytics/overview passed:")
    print("   Summary:", analytics_data["summary"])
    print("   Top Violation Categories:", analytics_data["top_violation_categories"])

    print("\n🎉 ALL BACKEND TESTS PASSED CLEANLY!\n")

if __name__ == "__main__":
    run_tests()
