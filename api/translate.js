// POST { word } -> { pinyin, han_viet, meaning_vi, _sources }
// 3 nguồn dữ liệu (graceful, không có thì AI tự lo):
//   1) CC-CEDICT trong bảng zhnote_cedict -> pinyin + định nghĩa Anh (làm context)
//   2) Wiktionary scrape -> âm Hán Việt (Sino-Vietnamese)
//   3) AI gộp lại + dịch sang Việt
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import { chatJSON, isChinese } from "./_lib/openai.js";

const sb = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function cedictLookup(word) {
  try {
    const { data } = await sb.from("zhnote_cedict")
      .select("traditional, simplified, pinyin, definitions")
      .or(`simplified.eq."${word}",traditional.eq."${word}"`)
      .limit(5);
    return data || [];
  } catch (e) { return []; }
}

async function scrapeWiktionaryHanViet(word) {
  try {
    const url = `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3500);
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "VTNotes/1.0 (https://noteapp-beryl-ten.vercel.app)",
        Accept: "text/html",
      },
    });
    clearTimeout(timer);
    if (!r.ok) return null;
    const html = await r.text();
    const $ = cheerio.load(html);
    const readings = new Set();

    // Cách 1: tìm element text "Sino-Vietnamese", lấy lang="vi" gần đó
    $("li").each((_, el) => {
      const t = $(el).text();
      if (t.includes("Sino-Vietnamese")) {
        $(el).find('[lang="vi"]').each((_, vi) => {
          const w = $(vi).text().trim();
          if (w && w.length <= 20 && /^[a-záàảãạăâêôơưữựứốúìíỉĩịỳỵỹéèẻẽẹếềểễệấầẩẫậýỳỷỹỵòỏõọốồổỗộớờởỡợùủũụứừửữựầểễếỉ]+$/i.test(w)) {
            readings.add(w);
          }
        });
      }
    });

    return readings.size > 0 ? Array.from(readings).slice(0, 4) : null;
  } catch (e) { return null; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const word = (req.body?.word || "").trim();
  if (!isChinese(word)) return res.status(400).json({ error: "invalid_word" });

  try {
    // Chạy 2 lookup song song để giảm latency
    const [cedictHits, hanVietList] = await Promise.all([
      cedictLookup(word),
      scrapeWiktionaryHanViet(word),
    ]);

    const hasCedict = cedictHits.length > 0;
    const hasWiktionary = hanVietList && hanVietList.length > 0;

    // Build context cho AI
    let context = "";
    if (hasCedict) {
      const lines = cedictHits.map(e =>
        `- ${e.traditional}${e.simplified !== e.traditional ? `/${e.simplified}` : ""} [${e.pinyin}]: ${e.definitions.join("; ")}`
      ).join("\n");
      context += `\n[CC-CEDICT (Hán-Anh):]\n${lines}\n`;
    }
    if (hasWiktionary) {
      context += `\n[Âm Hán Việt từ Wiktionary: ${hanVietList.join(", ")}]\n`;
    }

    const payload = await chatJSON({
      temperature: 0.2,
      system: "Bạn là từ điển Hán-Việt chính xác. Chỉ trả JSON, không thêm chữ nào khác.",
      user:
        `Tra cứu chữ/từ tiếng Trung: "${word}"\n` + context +
        `\nTrả về JSON với 3 trường:\n` +
        `- pinyin: pinyin có dấu thanh (vd "lóng")\n` +
        `- han_viet: âm Hán Việt${hasWiktionary ? " (DÙNG dữ liệu Wiktionary trên, nếu có nhiều âm ghi cả: 'lung, lông')" : ""}\n` +
        `- meaning_vi: nghĩa tiếng Việt rõ ràng${hasCedict ? " (DỊCH từ định nghĩa CC-CEDICT đã cho sang tiếng Việt tự nhiên, đủ ý)" : ""}, 1-3 dòng\n` +
        `JSON only.`,
    });

    return res.status(200).json({
      pinyin: payload.pinyin || "",
      han_viet: payload.han_viet || "",
      meaning_vi: payload.meaning_vi || "",
      _sources: { cedict: hasCedict, wiktionary: hasWiktionary },
    });
  } catch (e) {
    console.error("translate", e);
    return res.status(500).json({ error: "server_error" });
  }
}
