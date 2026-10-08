# File: backend/test_simple.py
import requests
import json

print("🧪 Testing Backend API...\n")

# Test evaluasi
payload = {
    "question": "Buatkan saya puisi tentang AI",
    "answer": "AI adalah teknologi masa depan yang mengubah dunia",
    "role": "dataAnalyst"
}

print("📤 Mengirim request ke backend...")
response = requests.post("http://127.0.0.1:5173/evaluate", json=payload)

print(f"\n✅ Status: {response.status_code}")
print(f"📥 Response dari Gemini:\n")
print(json.dumps(response.json(), indent=2, ensure_ascii=False))