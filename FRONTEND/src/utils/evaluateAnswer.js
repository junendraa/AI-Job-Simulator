// utils/evaluateAnswer.js
export const evaluateAnswerWithLLM = async (question, answer) => {
  const prompt = `
Anda adalah evaluator wawancara profesional untuk role Data Analyst/Data Scientist.
Berikan evaluasi jawaban berikut:
Pertanyaan: "${question}"
Jawaban user: "${answer}"

Beri output dalam format JSON:
{
  "score": 1-5,
  "positive": ["..."],
  "improvement": ["..."],
  "summary": "..."
}
`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });

  const data = await res.json();
  const text = data.choices[0].message.content;

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Error parsing LLM JSON response", text);
    return null;
  }
};
