import React from "react";
import { FileText } from "lucide-react";

const ResultsPanel = ({ feedbacks }) => {
  return (
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
};

export default ResultsPanel;
