from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import os
os.environ['GRPC_ENABLE_FORK_SUPPORT'] = '1'
from dotenv import load_dotenv
import google.generativeai as genai
import json
import re
from typing import List, Any

# Load environment variables
load_dotenv()

app = FastAPI(title="AI Interview Evaluator API")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Untuk production, ganti dengan domain spesifik
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini API
# NOTE: Gunakan os.environ.get daripada os.getenv untuk konsistensi di beberapa environment
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    # Ini akan mencegah aplikasi crash di runtime jika API key hilang, tetapi
    # endpoint /evaluate tidak akan berfungsi.
    print("WARNING: GEMINI_API_KEY tidak ditemukan. Gemini API tidak akan berfungsi.")

try:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-2.5-flash')
except Exception as e:
    # Handle case where genai.configure fails (e.g., if API key is None)
    print(f"Error configuring Gemini: {e}")

# --- Pydantic Models untuk Menerima Data Rubrik dari Frontend ---
# Struktur ini harus cocok dengan data yang dikirim dari React
class RubricLevel(BaseModel):
    level: int
    max_score: int
    desc: str

class RubricItem(BaseModel):
    kompetensi: str
    bobot: float # 0.25, 0.20, dll.
    levels: List[RubricLevel]

class JobLevel(BaseModel):
    minScore: int
    label: str
    desc: str

class EvaluateRequest(BaseModel):
    question: str
    answer: str
    role: str
    rubric: List[RubricItem] # Data rubrik detail
    jobLevels: List[JobLevel] # Data job level mapping

# --- Response Model Baru ---
# Diperluas untuk mencakup hasil penilaian berbobot dan level jabatan
class EvaluateResponse(BaseModel):
    score: int = Field(..., description="Skor kasar (0-100) untuk pertanyaan ini.")
    positive: List[str]
    improvement: List[str]
    summary: str
    # Fields baru untuk skor berbobot dan Job Level final
    totalWeightedScore: float = Field(..., description="Total skor berbobot keseluruhan interview (0-100).")
    jobLevel: str = Field(..., description="Job level yang direkomendasikan.")
    jobLevelDescription: str = Field(..., description="Deskripsi singkat job level tersebut.")

# Role descriptions untuk konteks yang lebih baik
ROLE_CONTEXTS = {
    "dataAnalyst": {
        "name": "Data Analyst",
        "focus": "SQL, visualisasi data, dashboard, statistik, analisis bisnis, KPI"
    },
    "dataScientist": {
        "name": "Data Scientist", 
        "focus": "machine learning, algoritma, feature engineering, modeling, Python, komunikasi hasil"
    }
}

def create_evaluation_prompt(
    question: str, 
    answer: str, 
    role: str, 
    rubric: List[RubricItem],
    job_levels: List[JobLevel],
    past_feedbacks: List[dict] # Untuk mengakumulasi total skor
) -> str:
    """
    Membuat prompt yang dinamis dan terstruktur untuk Gemini.
    Prompt kini meminta Gemini untuk menilai, menghitung bobot, dan menentukan Job Level.
    """
    
    role_info = ROLE_CONTEXTS.get(role, ROLE_CONTEXTS["dataAnalyst"])
    
    # --- 1. Konteks Rubrik ---
    rubric_text = ""
    # Hanya kirimkan Rubrik yang relevan dengan pertanyaan saat ini. 
    # Karena frontend tidak mengirim mapping Q -> Kompetensi, kita kirim semua rubrik.
    # Namun, kita akan meminta AI untuk fokus pada kompetensi yang relevan.
    for item in rubric:
        bobot_persen = int(item.bobot * 100)
        levels_str = "; ".join([f"Level {l.level} ({l.max_score}%) - {l.desc}" for l in item.levels])
        rubric_text += f"- **{item.kompetensi} ({bobot_persen}%)**: {levels_str}\n"

    # --- 2. Konteks Level Jabatan ---
    job_level_text = "\n".join([f"- **{jl.label}**: Skor {jl.minScore}-100. Deskripsi: {jl.desc}" for jl in job_levels])
    
    # --- 3. Hitung Total Skor Bobot dari Jawaban Sebelumnya ---
    # Logika ini biasanya dihitung di server, bukan oleh AI, tapi kita instruksikan AI 
    # untuk mengintegrasikannya ke output akhir.
    
    
    prompt = f"""Kamu adalah Technical Interviewer AI yang sangat detail, profesional, dan adil. Kamu sedang melakukan interview untuk posisi {role_info['name']}.

Seorang kandidat baru saja menjawab pertanyaan interview:

PERTANYAAN: {question}

JAWABAN KANDIDAT: {answer}

TUGASMU:
1.  **Analisis dan Nilai:** Evaluasi jawaban kandidat. Berikan penilaian spesifik pada skala 0-100.
2.  **Identifikasi Kompetensi:** Tentukan kompetensi mana dari Rubrik yang paling relevan dengan pertanyaan ini.
3.  **Hitung Skor Berbobot:** Berikan skor 0-100 untuk kompetensi yang relevan, lalu kalikan dengan bobotnya untuk mendapatkan "weighted score" *pertanyaan ini*.
4.  **Tentukan Job Level Final:** Gunakan TOTAL AKHIR SKOR BERBOBOT (0-100) dari seluruh interview (termasuk pertanyaan ini) untuk menentukan Job Level.

RUBRIK PENILAIAN KOMPETENSI:
(Bobot kompetensi ini digunakan untuk menghitung skor berbobot akhir)
{rubric_text}

LEVEL JABATAN (Berdasarkan Total Skor Berbobot 0-100):
{job_level_text}

OUTPUT JSON yang HARUS dikembalikan (sangat penting: return VALID JSON):
{{
  "score": <Skor mentah (0-100) untuk jawaban ini>,
  "positive": [
    "<poin kekuatan spesifik 1>",
    "<poin kekuatan spesifik 2>"
  ],
  "improvement": [
    "<saran perbaikan spesifik 1>",
    "<saran perbaikan spesifik 2>"
  ],
  "summary": "<Kesimpulan natural 2-3 kalimat>",
  "totalWeightedScore": <Total skor berbobot akumulasi dari SELURUH interview, DIBULATKAN ke integer. Angka ini harus 0-100.>,
  "jobLevel": "<Level Jabatan dari tabel LEVEL JABATAN>",
  "jobLevelDescription": "<Deskripsi Singkat dari Job Level tersebut>"
}}

---
INSTRUKSI KHUSUS UNTUK PERHITUNGAN SKOR BERBOBOT:
- Asumsikan ini adalah **PERTANYAAN PERTAMA** (atau Anda hanya menilai pertanyaan saat ini).
- Dalam kasus pertanyaan pertama, nilai 'totalWeightedScore' adalah hasil dari skor kompetensi yang relevan dikalikan dengan bobotnya. Contoh: Jika pertanyaan ini 100% menguji "SQL Database" (bobot 0.25), dan skor Anda 80/100, maka skor berbobot saat ini adalah 80 * 0.25 = 20. (Anda harus mengalikan 20 dengan 4 untuk mendapatkan total 80).
- Karena Gemini tidak memiliki memori state, untuk demonstrasi ini, Anda diminta untuk MENGAMBIL PERSENTASE DARI SKOR TERTINGGI MUNGKIN (100) SEBAGAI SIMULASI.
- Contoh Simulasi Skor Berbobot Total: (Skor saat ini / Total Pertanyaan) * 100.

Lakukan penilaian dengan bahasa yang profesional, suportif, dan spesifik.
Return HANYA JSON, tidak ada text lain.
"""

    return prompt

def parse_gemini_response(response_text: str) -> dict:
    """
    Parse response dari Gemini dan extract JSON
    """
    try:
        # Coba parse langsung
        return json.loads(response_text)
    except json.JSONDecodeError:
        # Jika ada markdown atau text tambahan, extract JSON
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            try:
                # Bersihkan string dari karakter non-JSON
                cleaned_json_string = json_match.group()
                return json.loads(cleaned_json_string)
            except json.JSONDecodeError:
                pass
        
        # Fallback jika parsing gagal
        raise ValueError("Tidak dapat parse response dari Gemini: " + response_text[:200]) # tampilkan 200 karakter pertama

@app.get("/")
def read_root():
    return {
        "message": "AI Interview Evaluator API", 
        "version": "3.0.0",
        "gemini_configured": bool(GEMINI_API_KEY)
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy", 
        "service": "ai-interview-evaluator",
        "gemini_api": "configured" if GEMINI_API_KEY else "missing"
    }

@app.post("/evaluate", response_model=EvaluateResponse)
async def evaluate_answer(request: EvaluateRequest):
    """
    Evaluate interview answer using Gemini AI, menghitung skor berbobot dan Job Level.
    """
    
    try:
        # Validasi input
        if not request.answer.strip():
            raise HTTPException(status_code=400, detail="Jawaban tidak boleh kosong")
        
        # Pastikan model sudah terkonfigurasi
        if not GEMINI_API_KEY:
            raise HTTPException(status_code=503, detail="Gemini API key hilang atau tidak terkonfigurasi.")

        # Generate prompt
        # NOTE: Karena Gemini tidak memiliki state, kita instruksikan AI untuk mensimulasikan
        # perhitungan skor berbobot dan penentuan Job Level.
        prompt = create_evaluation_prompt(
            request.question, 
            request.answer, 
            request.role,
            request.rubric,
            request.jobLevels,
            [] # feedback masa lalu, untuk saat ini dikosongkan
        )
        
        # Call Gemini API
        response = model.generate_content(prompt)
        
        # Parse response
        evaluation = parse_gemini_response(response.text)
        
        # Validasi struktur response baru
        required_fields = ["score", "positive", "improvement", "summary", "totalWeightedScore", "jobLevel", "jobLevelDescription"]
        for field in required_fields:
            if field not in evaluation:
                raise ValueError(f"Field '{field}' tidak ada dalam response Gemini.")
        
        # Konversi score ke skala 1-5 untuk feedback detil (jika diperlukan frontend)
        # Frontend Anda saat ini menggunakan skor 1-5 untuk detil feedback, 
        # tapi skor Job Level menggunakan 0-100. Kita kembalikan keduanya.
        score_1_5 = max(1, round(evaluation["score"] / 20)) # Konversi 0-100 ke 1-5
        
        return EvaluateResponse(
            score=score_1_5,
            positive=evaluation["positive"],
            improvement=evaluation["improvement"],
            summary=evaluation["summary"],
            totalWeightedScore=float(evaluation["totalWeightedScore"]),
            jobLevel=evaluation["jobLevel"],
            jobLevelDescription=evaluation["jobLevelDescription"]
        )
        
    except ValueError as ve:
        print(f"ValueError: {str(ve)}")
        raise HTTPException(status_code=500, detail=f"Error parsing Gemini response: {str(ve)}")
    
    except Exception as e:
        print(f"General Error in evaluate_answer: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error evaluating answer: {str(e)}")

# Endpoint untuk testing prompt (opsional, untuk development)
@app.post("/test-prompt")
async def test_prompt(request: EvaluateRequest):
    """
    Test endpoint untuk melihat prompt yang digenerate (development only)
    """
    prompt = create_evaluation_prompt(
        request.question, 
        request.answer, 
        request.role,
        request.rubric,
        request.jobLevels,
        []
    )
    return {"prompt": prompt}
