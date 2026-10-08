const ResultsPanel = ({ feedbacks }) => (
    <div className="mt-6 space-y-6">
      <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-6 h-6 text-orange-600" />
          <h3 className="text-xl font-bold text-gray-800">Interview Feedback</h3>
        </div>
        {feedbacks.map((fb, i) => (
          <div key={i} className="mb-4">
            <ul className="space-y-2 text-gray-700">
              {fb.feedback.map((f, idx) => (
                <li
                  key={idx}
                  className={`pl-4 border-l-4 ${
                    f.includes("△") ? "border-orange-500" : "border-green-500"
                  }`}
                >
                  {f}
                </li>
              ))}
            </ul>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200 mt-2">
              <p className="text-gray-800">Rata-rata Skor: {fb.avg.toFixed(1)} / 5</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden" style={{ height: "90vh" }}>
          <div className="bg-indigo-600 text-white p-4 flex items-center gap-3">
            <Bot className="w-6 h-6" />
            <h1 className="text-xl font-bold">AI Interview Simulator</h1>
          </div>

          <div className="p-6 overflow-y-auto" style={{ height: "calc(90vh - 160px)" }}>
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-indigo-600" />
                    </div>
                  )}
                  <div
                    className={`max-w-2xl rounded-lg p-4 ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-700" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Loader className="w-5 h-5 text-indigo-600 animate-spin" />
                  </div>
                  <div className="bg-gray-100 rounded-lg p-4">
                    <p className="text-gray-500">AI sedang memproses...</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {showResults && <ResultsPanel feedbacks={interviewState.feedbacks} />}
          </div>

          <div className="p-4 bg-white border-t flex items-center gap-3">
            <input
              type="text"
              className="flex-1 border rounded-lg px-4 py-2 focus:outline-none"
              placeholder="Ketik jawaban Anda..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button
              onClick={handleSend}
              disabled={loading}
              className="bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 transition disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
;