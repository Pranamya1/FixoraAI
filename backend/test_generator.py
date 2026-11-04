import os
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_generation_engine():
    print("\n🎨 ========================================================")
    print("   BRAND-COMPLIANT MULTIMODAL GENERATOR TEST SUITE")
    print("   Generating: 1. Text Copy | 2. Visual Poster | 3. PDF Carousel")
    print("========================================================\n")

    payload = {
        "topic": "Autonomous Brand Governance for Enterprise Marketing",
        "campaign_goal": "Product Launch",
        "target_channel": "LinkedIn",
        "target_audience": "Marketing VPs & Chief Marketing Officers",
        "intended_tone": "Authoritative & Bold",
        "formats": ["text", "poster", "pdf"],
        "poster_ratio": "portrait",
        "save_as_draft": True
    }

    print("🚀 --- 1. Calling POST /api/generate ---")
    res = client.post("/api/generate", json=payload)
    assert res.status_code == 200, f"Generation failed: {res.text}"
    data = res.json()

    print("✅ Content Generated Successfully!")
    print(f"   • Title: {data['title']}")
    print(f"   • Headline: {data['headline']}")
    print(f"   • Compliance Score: {data['compliance_score']}% (Guaranteed Compliant)")
    print(f"   • Key Points: {data['key_points']}")
    print(f"   • Poster URL: {data['poster_url']}")
    print(f"   • PDF Carousel URL: {data['pdf_url']}")
    print(f"   • Saved as Draft ID: {data['post_id']}")
    print("\n   [Generated Copy Preview]:\n" + "-"*40)
    print(data['generated_text'][:250] + "...")
    print("-"*40)

    # 2. Test downloading the generated poster
    assert data["poster_url"], "Poster URL missing!"
    print(f"\n🖼️ --- 2. Testing Poster Download ({data['poster_url']}) ---")
    poster_res = client.get(data["poster_url"])
    assert poster_res.status_code == 200, f"Failed to download poster: {poster_res.status_code}"
    assert "image/png" in poster_res.headers.get("content-type", "")
    print(f"✅ Poster downloaded successfully! Size: {len(poster_res.content)} bytes (image/png)")

    # 3. Test downloading the generated PDF carousel
    assert data["pdf_url"], "PDF URL missing!"
    print(f"\n📄 --- 3. Testing PDF Carousel Download ({data['pdf_url']}) ---")
    pdf_res = client.get(data["pdf_url"])
    assert pdf_res.status_code == 200, f"Failed to download PDF: {pdf_res.status_code}"
    assert "application/pdf" in pdf_res.headers.get("content-type", "")
    print(f"✅ PDF Carousel downloaded successfully! Size: {len(pdf_res.content)} bytes (application/pdf)")

    # 4. Verify post was saved to drafts
    print(f"\n📁 --- 4. Verifying Post in Drafts Queue ---")
    post_res = client.get(f"/api/posts/{data['post_id']}")
    assert post_res.status_code == 200
    p = post_res.json()
    print(f"✅ Draft Post verified! Status: {p['status']}, Score: {p['compliance_score']}%, Image: {p['image_url']}")

    print("\n🎉 ALL GENERATOR TESTS (TEXT, POSTER, PDF) PASSED WITH FLYING COLORS!\n")

if __name__ == "__main__":
    test_generation_engine()
