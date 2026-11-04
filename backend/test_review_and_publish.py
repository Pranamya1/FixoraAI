import json
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_send_for_review_higherups():
    print("Testing POST /api/audit/send-for-review across Gmail, WhatsApp, Slack, Teams...")
    post_id = "post-sample-demo-1"
    payload = {
        "post_id": post_id,
        "channels": ["GMAIL", "WHATSAPP", "SLACK", "TEAMS"],
        "recipient_emails": ["vp-marketing@fixora.ai", "legal-review@fixora.ai"],
        "recipient_phones": ["+14155552671"],
        "reviewer_notes": "Please verify Q4 competitive comparison statements before Friday release."
    }
    res = client.post("/api/audit/send-for-review", json=payload)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    
    data = res.json()
    assert data["post_id"] == post_id
    assert data["total_dispatched"] >= 4
    print(f"✅ Dispatched review to {data['total_dispatched']} destination(s):")
    for r in data["results"]:
        print(f"   - Channel: {r['channel']}, Status: {r['status']}, Recipient: {r['recipient']}")
        assert r["status"] in ["SENT", "SIMULATED"]
        assert r["message_id"] is not None

def test_social_post_upload():
    print("\nTesting POST /api/publish across LinkedIn, Twitter/X, Facebook, Instagram...")
    post_id = "post-sample-demo-2"
    payload = {
        "post_id": post_id,
        "platforms": ["LINKEDIN", "TWITTER", "FACEBOOK", "INSTAGRAM"]
    }
    res = client.post("/api/publish", json=payload)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

    data = res.json()
    assert len(data) == 4
    print(f"✅ Published across {len(data)} social channels:")
    for p in data:
        print(f"   - Platform: {p['platform']}, Status: {p['status']}, URL: {p['external_url']}")
        assert p["status"] == "PUBLISHED"
        assert p["external_url"] is not None

def test_connected_channels():
    print("\nTesting GET /api/publish/channels ...")
    res = client.get("/api/publish/channels")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    channels = res.json()["channels"]
    print(f"✅ Connected channels: {[c['platform'] for c in channels]}")
    assert len(channels) == 4

if __name__ == "__main__":
    test_send_for_review_higherups()
    test_social_post_upload()
    test_connected_channels()
    print("\n🎉 ALL REVIEW DISPATCH & SOCIAL PUBLISHING TESTS PASSED!")
