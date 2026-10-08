"use client"

// FILE: AIInterviewSimulator.jsx
// React frontend (single-file component). This version removes any client-side API key
// and instead calls your backend endpoints to evaluate answers using Gemini.

import { useState, useRef, useEffect } from "react"
import { Send, Bot, User, Loader, FileText, Sparkles } from "lucide-react"

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
    },
    dataScientist: {
      name: "Data Scientist",
      questions: [
        "Apa pengalaman Anda dalam membangun model machine learning?",
        "Bagaimana Anda memilih algoritma yang sesuai untuk dataset tertentu?",
        "Ceritakan tantangan terbesar Anda saat melakukan feature engineering.",
        "Bagaimana Anda mengkomunikasikan hasil model ke stakeholder non-teknis?",
      ],
    },
  },
  stages: {
    SETUP: "setup",
    INTRO: "intro",
    QUESTIONS: "questions",
    COMPLETE: "complete",
  },
}

// Results Panel Component
const ResultsPanel = ({ feedbacks }) => {
  const avgScore =
    feedbacks.length === 0 ? 0 : (feedbacks.reduce((sum, fb) => sum + fb.score, 0) / feedbacks.length).toFixed(1)

  return (
    <div className="mt-6 bg-white rounded-xl border-2 border-indigo-200 p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <FileText className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-800">Hasil Interview</h3>
          <p className="text-sm text-gray-600">Rata-rata: {avgScore}/5 ⭐</p>
        </div>
      </div>

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
        `Terima kasih! Saya akan menguji kemampuan Anda untuk posisi ${INTERVIEW_CONFIG.roles[selectedRole].name}. Siap memulai?`,
      )
      setTimeout(() => {
        setStage(INTERVIEW_CONFIG.stages.QUESTIONS)
        addMessage(INTERVIEW_CONFIG.roles[selectedRole].questions[0])
        setCurrentQ(0)
      }, 800)
    }, 300)
  }

  // Calls backend to evaluate (backend holds GEMINI_API_KEY securely)
  const evaluateAnswerBackend = async (question, answer) => {
    // Prefer env override; fallback to local Python server
    const base = process.env.NEXT_PUBLIC_EVAL_API_URL || "http://localhost:8000"

    const payload = { question, answer, role: selectedRole }
    const res = await fetch(`${base}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // include credentials if you later scope CORS to specific origin + cookies
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      throw new Error(`Server responded ${res.status}`)
    }

    const data = await res.json()
    return data // expected: { score, positive, improvement, summary }
  }

  const handleQuestion = async () => {
    const answer = input.trim()
    if (!answer) return

    const question = INTERVIEW_CONFIG.roles[selectedRole].questions[currentQ]

    addMessage(answer, "user")
    setInput("")
    setLoading(true)
    addMessage("⏳ Mengevaluasi jawaban Anda...")

    try {
      const feedback = await evaluateAnswerBackend(question, answer)
      setFeedbacks((prev) => [...prev, feedback])

      setLoading(false)
      const nextQ = currentQ + 1
      const questions = INTERVIEW_CONFIG.roles[selectedRole].questions

      if (nextQ < questions.length) {
        setTimeout(() => {
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
              <h1 className="text-2xl font-bold text-gray-800">AI Interview Simulator</h1>
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
          </div>

          <button
            onClick={startInterview}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg px-6 py-3 font-semibold hover:from-indigo-700 hover:to-purple-700 transition transform hover:scale-105 shadow-lg"
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
                <h1 className="text-lg font-bold">AI Interview Simulator</h1>
                <p className="text-xs opacity-90">{INTERVIEW_CONFIG.roles[selectedRole].name}</p>
              </div>
            </div>
            <div className="text-xs bg-white/20 px-3 py-1 rounded-full">
              {currentQ + 1}/{INTERVIEW_CONFIG.roles[selectedRole].questions.length}
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

              {stage === INTERVIEW_CONFIG.stages.COMPLETE && <ResultsPanel feedbacks={feedbacks} />}

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
