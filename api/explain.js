// POST { word } -> { word, source, source_url, intro_vi, etymology_vi, etymology_found }
// QUY TẮC: 字源演变 CHỈ dịch từ nội dung Baike. Không có Baike / không có mục đó
//          -> etymology_vi = "" và etymology_found = false. KHÔNG nhờ AI bịa.
import * as cheerio from "cheerio";
import { chatJSON, isChinese } from "./_lib/openai.js";

const NEXT_SECTION_MARKERS = [
  "详细释义", "现代释义", "古籍释义", "字形书法",
  "音韵汇集", "词性变化", "基本释义", "康熙字典", "近义词", "反义词",
];
const BLOCK_MARKERS = ["百度安全验证", "请输入验证码", "网络不给力", "antispider"];

function htmlToText(html) {
  const $ = cheerio.load(html);
  $("script, style, noscript, header, footer, nav").remove();
  return $("body").text().replace(/\s+/g, " ").trim();
}

function extractIntro(html) {
  const $ = cheerio.load(html);
  const sels = [".lemmaSummary", ".lemma-summary", ".J-summary",
    '[class*="lemmaSummary"]', '[class*="lemma-summary"]'];
  for (const sel of sels) {
    const t = $(sel).first().text().replace(/\s+/g, " ").trim();
    if (t && t.length > 10) return t;
  }
  return null;
}

// Lấy FULL đoạn quanh "字源演变" cho tới mục kế tiếp.
// Cap an toàn 10k ký tự để tránh phình token bất ngờ.
function extractEtymology(text) {
  const idx = text.indexOf("字源演变");
  if (idx === -1) return null;
  const start = idx + "字源演变".length;
  let end = text.length;
  for (const m of NEXT_SECTION_MARKERS) {
    const mi = text.indexOf(m, start);
    if (mi !== -1 && mi < end) end = mi;
  }
  end = Math.min(end, start + 10000);
  const slice = text.slice(start, end).trim();
  return slice.length > 20 ? slice : null;
}

async function fetchBaike(word) {
  const url = `https://baike.baidu.com/item/${encodeURIComponent(word)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const r = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "zh-CN,zh;q=0.9",
        Accept: "text/html,application/xhtml+xml",
        Referer: "https://baike.baidu.com/",
      },
    });
    if (!r.ok) return { ok: false, reason: `HTTP ${r.status}` };
    const html = await r.text();
    if (BLOCK_MARKERS.some((m) => html.includes(m))) return { ok: false, reason: "blocked" };
    return { ok: true, html, url };
  } catch (e) {
    return { ok: false, reason: e.name === "AbortError" ? "timeout" : "fetch_error" };
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const word = (req.body?.word || "").trim();
  if (!isChinese(word)) return res.status(400).json({ error: "invalid_word" });

  try {
    const baike = await fetchBaike(word);

    let introZh = null, etymologyZh = null;
    if (baike.ok) {
      const text = htmlToText(baike.html);
      introZh = extractIntro(baike.html) || text.slice(0, 600);
      etymologyZh = extractEtymology(text);
    }

    // Trường hợp Baike OK + có 字源演变: dịch FULL cả 2 đoạn từ Baike.
    // Trường hợp Baike OK nhưng không có 字源演变: chỉ dịch mở đầu, etymology để trống.
    // Trường hợp Baike fail: intro do AI giải thích sơ lược, etymology để trống.
    let payload;
    if (baike.ok && etymologyZh) {
      payload = await chatJSON({
        temperature: 0.2,
        system: "Bạn là chuyên gia từ nguyên Hán ngữ. Dịch tiếng Việt tự nhiên, đầy đủ, không tự bịa thêm. Chỉ trả JSON.",
        user:
          `Nội dung trích từ Baidu Baike cho chữ "${word}".\n` +
          `[MỞ ĐẦU]\n${introZh}\n\n[字源演变]\n${etymologyZh}\n\n` +
          `Dịch ĐẦY ĐỦ sang tiếng Việt, giữ trọn nội dung gốc, không rút gọn, không bịa.\n` +
          `JSON: {"intro_vi":"dịch phần mở đầu","etymology_vi":"dịch full mục 字源演变"}`,
      });
      return res.status(200).json({
        word, source: "baidu_baike", source_url: baike.url,
        intro_vi: payload.intro_vi || "", etymology_vi: payload.etymology_vi || "",
        etymology_found: true,
      });
    }

    if (baike.ok && !etymologyZh) {
      payload = await chatJSON({
        temperature: 0.2,
        system: "Dịch sang tiếng Việt tự nhiên. Chỉ trả JSON.",
        user: `Dịch phần mở đầu sau từ Baike cho chữ "${word}":\n${introZh}\n\nJSON: {"intro_vi":"dịch tiếng Việt"}`,
      });
      return res.status(200).json({
        word, source: "baidu_baike", source_url: baike.url,
        intro_vi: payload.intro_vi || "", etymology_vi: "",
        etymology_found: false,
      });
    }

    // Baike thất bại hoàn toàn — chỉ giải thích sơ lược, etymology để trống.
    payload = await chatJSON({
      temperature: 0.3,
      system: "Bạn giải thích chữ Hán cho người Việt học. Chỉ trả JSON.",
      user: `Giải thích nghĩa và cách dùng chữ "${word}" bằng tiếng Việt ngắn gọn. ` +
        `JSON: {"intro_vi":"giải thích"}`,
    });
    return res.status(200).json({
      word, source: "ai_fallback", source_url: null,
      source_note: `Không lấy được Baike (${baike.reason}).`,
      intro_vi: payload.intro_vi || "", etymology_vi: "",
      etymology_found: false,
    });
  } catch (e) {
    console.error("explain", e);
    return res.status(500).json({ error: "server_error" });
  }
}
