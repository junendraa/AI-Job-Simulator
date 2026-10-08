// FILE: AIInterviewSimulator.jsx
// React frontend (single-file component). This version removes any client-side API key
// and instead calls your backend endpoints to evaluate answers using Gemini.

import React, { useState, useRef, useEffect } from "react"
import { Send, Bot, User, Loader, FileText, Sparkles, ClipboardList } from "lucide-react"

// --- RUBRIC DATA (Hidden from User UI, Sent to Backend for Weighted Scoring) ---
const DATA_ANALYST_RUBRIC = [
  {
    kompetensi: "SQL Database",
    bobot: 0.25, // Diubah menjadi float untuk perhitungan
    levels: [
      { level: 1, max_score: 25, desc: "Tidak dapat menjelaskan query optimization atau melakukan JOIN sederhana." },
      { level: 2, max_score: 50, desc: "Dapat melakukan INNER JOIN sederhana." },
      { level: 3, max_score: 75, desc: "Mahir menggunakan berbagai jenis JOIN (LEFT, RIGHT, FULL)." },
      { level: 4, max_score: 100, desc: "Expert dalam complex JOIN dan multiple subqueries." },
    ],
  },
  {
    kompetensi: "Data Visualization",
    bobot: 0.20,
    levels: [
      { level: 1, max_score: 25, desc: "Dashboard tidak informatif." },
      { level: 2, max_score: 50, desc: "Memahami kapan menggunakan chart tertentu." },
      { level: 3, max_score: 75, desc: "Membuat dashboard interaktif yang informatif." },
      { level: 4, max_score: 100, desc: "Expert dalam data storytelling dengan narrative flow." },
    ],
  },
  {
    kompetensi: "Statistical Analysis",
    bobot: 0.15,
    levels: [
      { level: 1, max_score: 25, desc: "Hanya memahami basic mean, median, mode." },
      { level: 2, max_score: 50, desc: "Dapat melakukan basic hypothesis testing (ttest, chi-square)." },
      { level: 3, max_score: 75, desc: "Memahami berbagai statistical tests (t-test, chi-square, ANOVA)." },
      { level: 4, max_score: 100, desc: "Dapat menjelaskan limitations dan assumption dari statistical methods." },
    ],
  },
  {
    kompetensi: "Business Understanding & Problem Solving",
    bobot: 0.25,
    levels: [
      { level: 1, max_score: 25, desc: "Tidak dapat mengidentifikasi KPI yang relevan." },
      { level: 2, max_score: 50, desc: "Memahami business context secara umum." },
      { level: 3, max_score: 75, desc: "Dapat mengidentifikasi KPI yang tepat untuk berbagai business scenario." },
      { level: 4, max_score: 100, desc: "Expert dalam stakeholder management dan problem framing." },
    ],
  },
]

const DATA_SCIENTIST_RUBRIC = [
  {
    kompetensi: "Machine Learning Algorithms & Models",
    bobot: 0.30,
    levels: [
      { level: 1, max_score: 25, desc: "Tidak dapat menjelaskan cara kerja algoritma." },
      { level: 2, max_score: 50, desc: "Familiar dengan supervised learning dasar (linear regression, logistic regression)." },
      { level: 3, max_score: 75, desc: "Mahir dengan berbagai algoritma (tree-based, ensemble methods, SVM)." },
      { level: 4, max_score: 100, desc: "Expert dalam berbagai ML algorithms termasuk advanced methods." },
    ],
  },
  {
    kompetensi: "Feature Engineering",
    bobot: 0.10,
    levels: [
      { level: 1, max_score: 25, desc: "Hanya menggunakan raw feature." },
      { level: 2, max_score: 50, desc: "Memahami one-hot encoding." },
      { level: 3, max_score: 75, desc: "Mahir dalam feature creation dari domain knowledge." },
      { level: 4, max_score: 100, desc: "Dapat menggunakan advanced techniques." },
    ],
  },
  {
    kompetensi: "Model Evaluation & Validation",
    bobot: 0.10,
    levels: [
      { level: 1, max_score: 25, desc: "Hanya paham accuracy metric." },
      { level: 2, max_score: 50, desc: "Memahami berbagai metrics (precision, recall, F1)." },
      { level: 3, max_score: 75, desc: "Memahami ROC curve dan AUC." },
      { level: 4, max_score: 100, desc: "Memahami advanced validation techniques (nested CV, time series CV)." },
    ],
  },
  {
    kompetensi: "Programming – Python/R",
    bobot: 0.20,
    levels: [
      { level: 1, max_score: 25, desc: "Hanya dapat menulis basic scripts." },
      { level: 2, max_score: 50, desc: "Dapat menggunakan Pandas dan NumPy untuk basic operations." },
      { level: 3, max_score: 75, desc: "Code terstruktur dengan good practices; memahami vectorization dan optimization." },
      { level: 4, max_score: 100, desc: "Expert dalam Python/R ecosystem untuk data science." },
    ],
  },
  {
    kompetensi: "Advanced Statistics",
    bobot: 0.15,
    levels: [
      { level: 1, max_score: 25, desc: "Hanya paham basic descriptive statistic." },
      { level: 2, max_score: 50, desc: "Memahami common probability distributions." },
      { level: 3, max_score: 75, desc: "Memahami Bayesian." },
      { level: 4, max_score: 100, desc: "Expert dalam statistical theory." },
    ],
  },
  {
    kompetensi: "Business Acumen & Problem Solving",
    bobot: 0.10,
    levels: [
      { level: 1, max_score: 25, desc: "Fokus hanya pada model accuracy tanpa business impact." },
      { level: 2, max_score: 50, desc: "Dapat basic problem formulation." },
      { level: 3, max_score: 75, desc: "Dapat balance technical excellence dengan practical constraints." },
      { level: 4, max_score: 100, desc: "Expert dalam end-to-end ML product development." },
    ],
  },
]
// --- END RUBRIC DATA ---

// --- JOB LEVEL MAPPING (For Final Result Display - HR/Interviewer View) ---
const JOB_LEVELS = {
    dataAnalyst: [
        { minScore: 86, label: "Lead/Principal Analyst", desc: "Strategic thinker. Dapat drive data strategy dan influence business decisions." },
        { minScore: 76, label: "Senior Data Analyst", desc: "Expert dalam analisis. Dapat lead projects dan mentor junior." },
        { minScore: 61, label: "Mid-Level Data Analyst", desc: "Mandiri dalam tugas sehari-hari. Dapat handle analisis medium complexity." },
        { minScore: 41, label: "Junior Data Analyst", desc: "Dapat handle tugas dasar dengan supervisi. Perlu guidance untuk analisis kompleks." },
        { minScore: 0, label: "Not Ready", desc: "Belum memenuhi minimum requirements. Perlu fundamental training." },
    ],
    dataScientist: [
        { minScore: 89, label: "Lead/Staff Data Scientist", desc: "Strategic ML leadership. Drive ML strategy dan innovation." },
        { minScore: 79, label: "Senior Data Scientist", desc: "Expert dalam ML. Dapat design complex solutions dan mentor team." },
        { minScore: 66, label: "Mid-Level Data Scientist", desc: "Mandiri end-to-end ML projects. Good understanding of ML lifecycle." },
        { minScore: 46, label: "Junior Data Scientist", desc: "Dapat build basic models dengan guidance. Perlu supervisi untuk production." },
        { minScore: 0, label: "Not Ready", desc: "Belum siap untuk DS role. Perlu foundational training." },
    ],
};
// --- END JOB LEVEL MAPPING ---


// Interview Configuration
const INTERVIEW_CONFIG = {
  roles: {
    dataAnalyst: {
      name: "Data Analyst",
      questions: [
        "Ceritakan pengalaman Anda menggunakan SQL dalam analisis data.",
        "Bagaimana pendekatan Anda dalam membuat dashboard atau visualisasi data?",
        "Metode statistik apa yang sering Anda gunakan dalam analisis?",
        "Bagaimana Anda mengidentifikasi masalah bisnis dan menentukan KPI?",
      ],
      rubric: DATA_ANALYST_RUBRIC, 
      jobLevels: JOB_LEVELS.dataAnalyst,
    },
    dataScientist: {
      name: "Data Scientist",
      questions: [
        "Apa pengalaman Anda dalam membangun model machine learning?",
        "Bagaimana Anda memilih algoritma yang sesuai untuk dataset tertentu?",
        "Ceritakan tantangan terbesar Anda saat melakukan feature engineering.",
        "Bagaimana Anda mengkomunikasikan hasil model ke stakeholder non-teknis?",
        "Jelaskan peran statistik lanjutan (mis. Bayesian) dalam proyek ML Anda.",
        "Bagaimana Anda menyeimbangkan teknikalitas model dengan kebutuhan bisnis?",
      ],
      rubric: DATA_SCIENTIST_RUBRIC,
      jobLevels: JOB_LEVELS.dataScientist,
    },
  },
  stages: {
    SETUP: "setup",
    INTRO: "intro",
    QUESTIONS: "questions",
    COMPLETE: "complete",
  },
}

// Helper function to determine job level based on total score (0-100)
const getJobLevel = (roleKey, totalScore) => {
    const levels = JOB_LEVELS[roleKey];
    if (!levels) return { label: "Unknown Role", desc: "" };

    // Find the highest matching level
    for (const level of levels) {
        if (totalScore >= level.minScore) {
            return level;
        }
    }
    return { label: "Error", desc: "Score mapping failed." };
};


// Results Panel Component
// Component ini diasumsikan menerima weightedScore dari Backend
const ResultsPanel = ({ feedbacks, roleKey }) => {
  // Asumsi: Backend mengirimkan total_weighted_score (0-100) di salah satu feedback,
  // atau kita hitung rata-rata skor 1-5 di sini jika backend belum siap.
  
  // Karena struktur feedback saat ini belum final dari backend, kita gunakan simulasi total score 
  // atau rata-rata skor 1-5 saja untuk sementara.

  // TODO: Hapus rata-rata sederhana ini dan gunakan total_weighted_score dari backend
  const avgScore5 =
    feedbacks.length === 0 ? 0 : (feedbacks.reduce((sum, fb) => sum + fb.score, 0) / feedbacks.length).toFixed(1);
    
  // SIMULASI: Anggap saja weighted score dikirimkan di `feedbacks[0].totalWeightedScore`
  // Untuk demonstrasi, kita akan menggunakan nilai random antara 40 dan 95
  const simulatedWeightedScore = Math.floor(Math.random() * (95 - 40 + 1)) + 40; 
  const finalJobLevel = getJobLevel(roleKey, simulatedWeightedScore);


  return (
    <div className="mt-6 bg-white rounded-xl border-2 border-indigo-200 p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <FileText className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-800">Hasil Interview</h3>
          <p className="text-sm text-gray-600">Rata-rata Skor (Skala 1-5): {avgScore5} ⭐</p>
        </div>
      </div>

      {/* --- Job Level Mapping (Hanya diketahui Interviewer/HR) --- */}
      <div className="bg-indigo-50 border-2 border-indigo-300 rounded-xl p-4 mb-6">
        <h4 className="text-lg font-bold text-indigo-800 mb-2 flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Job Level yang Direkomendasikan
        </h4>
        <p className="text-3xl font-extrabold text-indigo-600">{finalJobLevel.label}</p>
        <p className="text-sm text-gray-700 mt-2">
            Total Score (Simulasi): **{simulatedWeightedScore}/100**
        </p>
        <p className="text-xs text-gray-600 mt-1 italic">
            Deskripsi: {finalJobLevel.desc}
        </p>
      </div>
      {/* ----------------------------------------------------------- */}

      <h4 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Feedback Detil per Pertanyaan</h4>
      <div className="space-y-6">
        {feedbacks.map((fb, i) => (
          <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="bg-indigo-600 text-white px-2 py-1 rounded text-sm">Q{i + 1}</span>
              Skor: {fb.score}/5
            </h4>

            {fb.positive?.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-green-700 mb-2">✓ Kekuatan</p>
                {fb.positive.map((p, idx) => (
                  <p key={idx} className="text-sm text-gray-700 pl-4 border-l-4 border-green-500 mb-1 py-1">
                    {p}
                  </p>
                ))}
              </div>
            )}

            {fb.improvement?.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-orange-700 mb-2">△ Saran Perbaikan</p>
                {fb.improvement.map((imp, idx) => (
                  <p key={idx} className="text-sm text-gray-700 pl-4 border-l-4 border-orange-500 mb-1 py-1">
                    {imp}
                  </p>
                ))}
              </div>
            )}

            {fb.summary && (
              <div className="bg-indigo-50 rounded p-3 mt-3">
                <p className="text-sm text-gray-700">{fb.summary}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Main Component
const AIInterviewSimulator = () => {
  const [stage, setStage] = useState(INTERVIEW_CONFIG.stages.SETUP)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState("dataAnalyst")
  const [currentQ, setCurrentQ] = useState(0)
  const [feedbacks, setFeedbacks] = useState([])
  const messagesEndRef = useRef(null)

  // Get current role configuration
  const currentRole = INTERVIEW_CONFIG.roles[selectedRole]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const addMessage = (content, role = "assistant") => {
    setMessages((prev) => [...prev, { role, content }])
  }

  const startInterview = () => {
    // No API key on client. Backend handles it.
    setStage(INTERVIEW_CONFIG.stages.INTRO)
    addMessage("Halo! Saya AI Interviewer. Boleh perkenalkan diri Anda? (Nama, umur, pendidikan, role yang dilamar)")
  }

  const handleIntro = () => {
    addMessage(input, "user")
    setInput("")

    setTimeout(() => {
      addMessage(
        `Terima kasih! Saya akan menguji kemampuan Anda untuk posisi ${currentRole.name}. Siap memulai?`,
      )
      setTimeout(() => {
        setStage(INTERVIEW_CONFIG.stages.QUESTIONS)
        addMessage(currentRole.questions[0])
        setCurrentQ(0)
      }, 800)
    }, 300)
  }

  // Calls backend to evaluate (backend holds GEMINI_API_KEY securely)
  const evaluateAnswerBackend = async (question, answer) => {
    // Prefer env override; fallback to local Python server
    const base = "http://127.0.0.1:8010"

    // --- MENGIRIM RUBRIK KE BACKEND ---
    const payload = { 
      question, 
      answer, 
      role: selectedRole, 
      // Kirim seluruh rubrik untuk role yang dipilih agar backend dapat menghitung weighted score
      rubric: currentRole.rubric,
      // Kirim Job Levels agar Backend tahu batas skor totalnya
      jobLevels: currentRole.jobLevels
    }
    // -----------------------------------------------------------------

    const res = await fetch(`${base}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // include credentials if you later scope CORS to specific origin + cookies
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      throw new Error(`Server responded ${res.status}`)
    }

    // Expected: { score, positive, improvement, summary, totalWeightedScore }
    const data = await res.json()
    return data 
  }

  const handleQuestion = async () => {
    const answer = input.trim()
    if (!answer) return

    const question = currentRole.questions[currentQ]

    addMessage(answer, "user")
    setInput("")
    setLoading(true)
    // Hapus pesan evaluasi sementara untuk menjaga alur chat tetap bersih
    // addMessage("⏳ Mengevaluasi jawaban Anda...") 

    try {
      const feedback = await evaluateAnswerBackend(question, answer)
      setFeedbacks((prev) => [...prev, feedback])

      setLoading(false)
      const nextQ = currentQ + 1
      const questions = currentRole.questions

      if (nextQ < questions.length) {
        setTimeout(() => {
          // Tambahkan jeda antara pertanyaan (opsional, tergantung preferensi UX)
          // addMessage(`Terima kasih. Sekarang pertanyaan berikutnya:`) 
          addMessage(questions[nextQ])
          setCurrentQ(nextQ)
        }, 800)
      } else {
        setTimeout(() => {
          addMessage("🎉 Interview selesai! Berikut hasil evaluasi Anda:")
          setStage(INTERVIEW_CONFIG.stages.COMPLETE)
        }, 800)
      }
    } catch (error) {
      setLoading(false)
      addMessage("❌ Terjadi kesalahan saat evaluasi. Coba lagi nanti.")
      console.error(error)
    }
  }

  const handleSend = () => {
    if (!input.trim() || loading) return

    if (stage === INTERVIEW_CONFIG.stages.INTRO) {
      handleIntro()
    } else if (stage === INTERVIEW_CONFIG.stages.QUESTIONS) {
      handleQuestion()
    }
  }

  // Setup Screen
  if (stage === INTERVIEW_CONFIG.stages.SETUP) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800"> Selamat Datang di InterviewinAja!</h1>
              <p className="text-sm text-gray-600">Powered by Gemini AI (server-side)</p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Pilih Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition"
            >
              {Object.entries(INTERVIEW_CONFIG.roles).map(([key, role]) => (
                <option key={key} value={key}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6 text-sm text-gray-600">
            <p>API key disimpan dan digunakan di server — tidak perlu memasukkan dari client.</p>
            <p className="mt-2 text-indigo-600 font-semibold">
                Kriteria penilaian HR akan diterapkan di backend untuk menentukan level jabatan akhir Anda (0-100).
            </p>
          </div>

          {/* RUBRIC TABLE COMPONENT DIHAPUS DARI SINI */}

          <button
            onClick={startInterview}
            className="w-full mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg px-6 py-3 font-semibold hover:from-indigo-700 hover:to-purple-700 transition transform hover:scale-105 shadow-lg"
          >
            Mulai Interview 🚀
          </button>
        </div>
      </div>
    )
  }

  // Interview Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ height: "90vh" }}>
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="w-6 h-6" />
              <div>
                <h1 className="text-lg font-bold">InterviewinAja!</h1>
                <p className="text-xs opacity-90">{currentRole.name}</p>
              </div>
            </div>
            <div className="text-xs bg-white/20 px-3 py-1 rounded-full">
              {currentQ + 1}/{currentRole.questions.length}
            </div>
          </div>

          <div className="p-6 overflow-y-auto" style={{ height: "calc(90vh - 160px)" }}>
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-2xl rounded-2xl p-4 ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-gray-700" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-3 items-center">
                  <Loader className="w-6 h-6 text-indigo-600 animate-spin" />
                  <span className="text-sm text-gray-500">Processing...</span>
                </div>
              )}

              {/* Tambahkan roleKey ke ResultsPanel */}
              {stage === INTERVIEW_CONFIG.stages.COMPLETE && <ResultsPanel feedbacks={feedbacks} roleKey={selectedRole} />}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {stage !== INTERVIEW_CONFIG.stages.COMPLETE && (
            <div className="p-4 bg-white border-t-2 flex items-center gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={loading}
                className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition disabled:bg-gray-50"
                placeholder="Ketik jawaban Anda..."
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl p-3 hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AIInterviewSimulator
