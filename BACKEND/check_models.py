# File: backend/check_models.py
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

print("🔍 Mengecek model Gemini yang tersedia...\n")

try:
    models = genai.list_models()
    print("✅ Model yang tersedia:\n")
    
    for model in models:
        if 'generateContent' in model.supported_generation_methods:
            print(f"✓ {model.name}")
            print(f"  Display Name: {model.display_name}")
            print(f"  Description: {model.description[:100]}...")
            print()
            
except Exception as e:
    print(f"❌ Error: {e}")