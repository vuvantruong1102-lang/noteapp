// POST { word } -> { word, source, source_url, intro_vi, etymology_vi, etymology_found, version }
// FIX v2: "字源演变" thường xuất hiện 2 lần trên trang Baike (mục lục + tiêu đề
// section thật). Trước đây code lấy lần xuất hiện đầu tiên (trong mục lục)
// nên cắt đoạn rỗng. Bản này quét tất cả vị trí và lấy đoạn dài nhất.
import * as cheerio from "cheerio";
import { chatJSON, isChinese } from "./_lib/openai.js";

const SCHEMA_VERSION = 2; // bump khi đổi cách bóc text -> cache cũ tự refetch

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

// FIX chính: quét toàn bộ vị trí "字源演变", lấy đoạn DÀI NHẤT.
function extractEtymology(text) {
  const matches = [];
  let pos = 0;
  while (true) {
    const idx = text.indexOf("字源演变", pos);
    if (idx === -1) break;
    const start = idx + "字源演变".length;
    let end = text.length;
    for (const m of NEXT_SECTION_MARKERS) {
      const mi = text.indexOf(m, start);
      if (mi !== -1 && mi < end) end = mi;
    }
    end = Math.min(end, start + 10000);
    let slice = text.slice(start, end).trim();
    // Bỏ nhãn widget "播报" "编辑" còn dính ở đầu (nút trên Baike sau strip HTML)
    slice = slice.replace(/^(?:\s|播报|编辑)+/, "").trim();
    matches.push(slice);
    pos = idx + 1;
  }
  if (matches.length === 0) return null;
  matches.sort((a, b) => b.length - a.length);
  return matches[0].length > 50 ? matches[0] : null;
}

async function fetchBaike(word) {
  const url = `https://baike.baidu.com/item/${encodeURIComponent(word)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const r = await fetch(url, {
      signal: controller.signal, redirect: "follow",
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
      // Lấy nhiều text hơn cho intro để AI có đủ ngữ cảnh sàng lọc.
      introZh = extractIntro(baike.html) || text.slice(0, 1500);
      etymologyZh = extractEtymology(text);
    }

    if (baike.ok && etymologyZh) {
      const payload = await chatJSON({
        temperature: 0.2,
        system: "Bạn là chuyên gia từ nguyên Hán ngữ. Dịch tiếng Việt tự nhiên, đầy đủ, không tự bịa thêm. Chỉ trả JSON.",
        user:
          `Văn bản trích từ Baidu Baike cho chữ "${word}".\n\n` +
          `[VĂN BẢN ĐẦU TRANG — có thể chứa mục lục và bảng thông tin cơ bản]\n${introZh}\n\n` +
          `[MỤC 字源演变]\n${etymologyZh}\n\n` +
          `Yêu cầu:\n` +
          `1. Từ phần đầu trang, BỎ QUA mục lục (TOC) và bảng thông tin cơ bản ` +
          `(中文名/拼音/部首/笔画 v.v.), chỉ trích lấy phần mô tả/định nghĩa chính của từ, ` +
          `dịch ĐẦY ĐỦ sang tiếng Việt.\n` +
          `2. Dịch ĐẦY ĐỦ mục 字源演变, giữ trọn nội dung, không rút gọn, không bịa thêm.\n` +
          `JSON: {"intro_vi":"...","etymology_vi":"..."}`,
      });
      return res.status(200).json({
        word, source: "baidu_baike", source_url: baike.url,
        intro_vi: payload.intro_vi || "", etymology_vi: payload.etymology_vi || "",
        etymology_found: true, version: SCHEMA_VERSION,
      });
    }

    if (baike.ok && !etymologyZh) {
      const payload = await chatJSON({
        temperature: 0.2,
        system: "Dịch sang tiếng Việt tự nhiên, bỏ qua mục lục và bảng thông tin. Chỉ trả JSON.",
        user: `Văn bản đầu trang Baike cho chữ "${word}":\n${introZh}\n\n` +
          `Bỏ qua mục lục và bảng thông tin cơ bản, chỉ dịch phần mô tả chính sang tiếng Việt.\n` +
          `JSON: {"intro_vi":"..."}`,
      });
      return res.status(200).json({
        word, source: "baidu_baike", source_url: baike.url,
        intro_vi: payload.intro_vi || "", etymology_vi: "",
        etymology_found: false, version: SCHEMA_VERSION,
      });
    }

    // Baike fail -> AI giải thích sơ lược, etymology để trống
    const payload = await chatJSON({
      temperature: 0.3,
      system: "Bạn giải thích chữ Hán cho người Việt học. Chỉ trả JSON.",
      user: `Giải thích nghĩa và cách dùng chữ "${word}" bằng tiếng Việt ngắn gọn. ` +
        `JSON: {"intro_vi":"giải thích"}`,
    });
    return res.status(200).json({
      word, source: "ai_fallback", source_url: null,
      source_note: `Không lấy được Baike (${baike.reason}).`,
      intro_vi: payload.intro_vi || "", etymology_vi: "",
      etymology_found: false, version: SCHEMA_VERSION,
    });
  } catch (e) {
    console.error("explain", e);
    return res.status(500).json({ error: "server_error" });
  }
}
