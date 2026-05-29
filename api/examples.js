// POST { word } -> { word, examples: [{ zh, pinyin, breakdown[], translation_vi, grammar_vi }] }
import { chatJSON, isChinese } from "./_lib/openai.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const word = (req.body?.word || "").trim();
  if (!isChinese(word)) return res.status(400).json({ error: "invalid_word" });

  try {
    const data = await chatJSON({
      temperature: 0.6,
      system: "Bạn là giáo viên tiếng Trung. Đặt câu ví dụ tự nhiên, đúng ngữ pháp, từ ngữ cảnh thực tế. Chỉ trả về JSON.",
      user:
        `Cho khoảng 5 câu ví dụ dùng "${word}". Mỗi câu: pinyin cả câu, ` +
        `phân tích từng từ (breakdown), dịch sát nghĩa tiếng Việt, và một ghi chú ngữ pháp ngắn. JSON:\n` +
        `{"examples":[{"zh":"câu chữ Hán","pinyin":"pinyin cả câu","breakdown":[{"token":"từ","pinyin":"","meaning_vi":""}],"translation_vi":"dịch","grammar_vi":"điểm ngữ pháp"}]}`,
    });
    return res.status(200).json({ word, ...data });
  } catch (e) {
    console.error("examples", e);
    return res.status(500).json({ error: "server_error" });
  }
}
