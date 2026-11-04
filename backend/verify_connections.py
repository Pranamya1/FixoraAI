import os
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
gemini_key = os.getenv("GEMINI_API_KEY")

print(f"Supabase URL: {supabase_url}")
print(f"Supabase Key starts with: {supabase_key[:12] if supabase_key else 'None'}")
print(f"Gemini Key starts with: {gemini_key[:8] if gemini_key else 'None'}")

# 1. Test Supabase
print("\n--- Testing Supabase Connection ---")
try:
    from supabase import create_client
    sb = create_client(supabase_url, supabase_key)
    res = sb.table("brand_guidelines").select("*").limit(5).execute()
    print("✅ Supabase connection successful! 'brand_guidelines' table queried live in the cloud.")
    print("   Data:", res.data)
except Exception as e:
    print(f"❌ Supabase test encountered an issue: {e}")

# 2. Test Gemini API
print("\n--- Testing Google GenAI SDK ---")
try:
    from google import genai
    client = genai.Client(api_key=gemini_key)
    resp = client.models.generate_content(
        model=os.getenv("GEMINI_MODEL", "gemini-3.8-flash"),
        contents="Respond in 3 words: FixoraAI backend live."
    )
    print(f"✅ Gemini API connection successful! Live response: {resp.text.strip()}")
except Exception as e:
    print(f"❌ Gemini API test encountered an issue: {e}")
