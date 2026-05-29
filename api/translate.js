// POST { word } -> { word, pinyin, han_viet, meaning_vi }
// Bổ sung han_viet (âm Hán-Việt) cho phần Dịch tổng hợp.
import { chatJSON, isChinese } from "./_lib/openai.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const word = (req.body?.word || "").trim();
  if (!isChinese(word)) return res.status(400).json({ error: "invalid_word" });

  try {
    const data = await chatJSON({
      temperature: 0.2,
      system: "Bạn là từ điển Hán-Việt chính xác. Chỉ trả về JSON, không thêm chữ nào khác.",
      user:
        `Từ/chữ tiếng Trung: "${word}". Trả JSON đúng cấu trúc:\n` +
        `{\n` +
        `  "pinyin": "pinyin có dấu thanh, viết liền cho từ ghép (ví dụ: xuéxí)",\n` +
        `  "han_viet": "âm Hán-Việt của từng chữ, ngăn cách bằng dấu cách (ví dụ: học tập)",\n` +
        `  "meaning_vi": "nghĩa tiếng Việt ngắn gọn; nếu nhiều nghĩa thì ngăn bằng dấu chấm phẩy"\n` +
        `}`,
    });
    return res.status(200).json({ word, ...data });
  } catch (e) {
    console.error("translate", e);
    return res.status(500).json({ error: "server_error" });
  }
}
