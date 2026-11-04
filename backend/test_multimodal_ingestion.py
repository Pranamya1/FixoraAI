import io
import pymupdf
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_multimodal_ingestion():
    print("\n🚀 ========================================================")
    print("   MULTIMODAL BRAND GUIDELINES INGESTION TEST SUITE")
    print("   Testing: 1. Raw Text/Markdown | 2. Images | 3. PDFs")
    print("========================================================\n")

    # ----------------------------------------------------
    # 1. Test Raw Text / Markdown Ingestion
    # ----------------------------------------------------
    print("📝 --- 1. Testing Raw Text & Markdown Ingestion ---")
    raw_markdown = """
# Fixora Global Editorial & Tone Standards

## Voice and Persona
Our voice is authoritative, helpful, and energetic. We never use passive constructions or corporate fluff.
Always communicate with clarity and precision. Avoid colloquialisms and casual slang in enterprise whitepapers.

## Legal Guarantees & Claims
All customer ROI claims must be verified by case study data. Absolute performance guarantees are strictly prohibited.
Never claim zero downtime or 100% bug-free delivery without an explicit legal asterisk.

## Color Palette Rules
Official brand primary is Fixora Violet (#6366F1). Secondary accents include Slate Grey (#64748B) and Emerald Green (#10B981).
High contrast compliance with WCAG AA is mandatory across all digital touchpoints.
"""
    res_text = client.post("/api/guidelines/raw", json={
        "name": "Editorial & Tone Standards (Raw Markdown)",
        "content": raw_markdown,
        "version": "v2.0"
    })
    assert res_text.status_code == 200, f"Raw text ingestion failed: {res_text.text}"
    text_data = res_text.json()
    print(f"✅ Raw text ingested! ID: {text_data['id']}, Rules Indexed: {text_data['total_rules_extracted']}")

    # ----------------------------------------------------
    # 2. Test Image Ingestion (Logo Specs / Palette Board)
    # ----------------------------------------------------
    print("\n🖼️ --- 2. Testing Image Guideline Ingestion ---")
    img = Image.new("RGB", (600, 300), color=(99, 102, 241))
    img_buf = io.BytesIO()
    img.save(img_buf, format="PNG")
    img_buf.seek(0)

    res_img = client.post(
        "/api/guidelines/upload",
        files={"file": ("fixora_logo_specifications.png", img_buf, "image/png")},
        data={"name": "Primary Wordmark Logo & Spacing Guide (PNG)", "version": "v1.2"}
    )
    assert res_img.status_code == 200, f"Image ingestion failed: {res_img.text}"
    img_data = res_img.json()
    print(f"✅ Image guideline ingested! ID: {img_data['id']}, Rules Indexed: {img_data['total_rules_extracted']}")

    # ----------------------------------------------------
    # 3. Test PDF Ingestion (Multi-page Style Guide)
    # ----------------------------------------------------
    print("\n📄 --- 3. Testing PDF Document Ingestion ---")
    pdf_doc = pymupdf.open()
    
    # Page 1: Introduction & Brand Mission
    p1 = pdf_doc.new_page()
    p1.insert_text((50, 72), "Fixora Brand Governance Handbook - Page 1\nMission: Automate compliance verification for global marketing teams.", fontsize=14)

    # Page 2: Competitor Policy
    p2 = pdf_doc.new_page()
    p2.insert_text((50, 72), "Competitor Mention Policy - Page 2\nDirect disparagement of named competitors like Salesforce, HubSpot, or Microsoft is strictly prohibited.\nAll comparisons must cite independent third-party benchmarks.", fontsize=14)

    # Page 3: Typography & Fonts
    p3 = pdf_doc.new_page()
    p3.insert_text((50, 72), "Typography Guidelines - Page 3\nPrimary font family is Inter. Secondary font for code and specs is JetBrains Mono.\nHeadings must use Bold (700) weight with tight tracking.", fontsize=14)

    pdf_bytes = pdf_doc.write()
    pdf_doc.close()

    pdf_buf = io.BytesIO(pdf_bytes)

    res_pdf = client.post(
        "/api/guidelines/upload",
        files={"file": ("fixora_brand_handbook.pdf", pdf_buf, "application/pdf")},
        data={"name": "Complete Brand Governance Handbook (PDF)", "version": "v3.0"}
    )
    assert res_pdf.status_code == 200, f"PDF ingestion failed: {res_pdf.text}"
    pdf_data = res_pdf.json()
    print(f"✅ PDF guideline ingested! ID: {pdf_data['id']}, Rules Indexed: {pdf_data['total_rules_extracted']}")

    # ----------------------------------------------------
    # 4. Verify Guideline Listing & Rule Retrieval
    # ----------------------------------------------------
    print("\n🔍 --- 4. Verifying All Ingested Guidelines in Store ---")
    list_res = client.get("/api/guidelines")
    assert list_res.status_code == 200
    all_guides = list_res.json()
    print(f"Total Guidelines in System: {len(all_guides)}")
    for g in all_guides:
        print(f" - [{g.get('file_type', 'DOC')}] {g['name']} (Rules: {g['total_rules_extracted']})")

    print("\n🎉 ALL MULTIMODAL INGESTION TESTS (RAW TEXT, IMAGE, PDF) PASSED SUCCESSFULLY!\n")

if __name__ == "__main__":
    test_multimodal_ingestion()
