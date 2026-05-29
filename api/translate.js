// POST { word } -> { word, pinyin, meaning_vi, explanation_vi }
import { chatJSON, isChinese } from "./_lib/openai.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const word = (req.body?.word || "").trim();
  if (!isChinese(word)) return res.status(400).json({ error: "invalid_word" });

  try {
    const data = await chatJSON({
      system: "Bạn là từ điển Hán - Việt chính xác, súc tích. Chỉ trả về JSON.",
      user:
        `Từ/chữ tiếng Trung: "${word}". Trả JSON:\n` +
        `{"pinyin":"pinyin có dấu thanh","meaning_vi":"nghĩa tiếng Việt ngắn gọn (có thể nhiều nghĩa, ngăn cách bằng dấu chấm phẩy)","explanation_vi":"giải thích cách dùng, từ loại, sắc thái trong 2-4 câu"}`,
    });
    return res.status(200).json({ word, ...data });
  } catch (e) {
    console.error("translate", e);
    return res.status(500).json({ error: "server_error" });
  }
}
