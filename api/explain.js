// POST { word } -> { word, source, source_url, source_note, intro_vi, etymology_vi, etymology_found }
// Fetch baike.baidu.com -> bóc phần mở đầu + mục 字源演变 -> OpenAI dịch sang tiếng Việt.
import * as cheerio from "cheerio";
import { chatJSON, isChinese } from "./_lib/openai.js";

const NEXT_SECTION_MARKERS = [
  "详细释义", "现代释义", "古籍释义", "字形书法",
  "音韵汇集", "词性变化", "基本释义", "康熙字典",
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

function extractEtymology(text) {
  const idx = text.indexOf("字源演变");
  if (idx === -1) return null;
  const start = idx + "字源演变".length;
  let end = text.length;
  for (const m of NEXT_SECTION_MARKERS) {
    const mi = text.indexOf(m, start);
    if (mi !== -1 && mi < end) end = mi;
  }
  const slice = text.slice(start, Math.min(end, start + 2500)).trim();
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
      introZh = extractIntro(baike.html) || text.slice(0, 400);
      etymologyZh = extractEtymology(text);
    }

    const sys = "Bạn là chuyên gia từ nguyên Hán ngữ, dịch sang tiếng Việt tự nhiên và chính xác. Chỉ trả về JSON.";
    const user = baike.ok
      ? `Nội dung từ Baidu Baike cho chữ "${word}".\n[MỞ ĐẦU]\n${introZh || "(trống)"}\n[字源演变]\n${etymologyZh || "(không tìm thấy)"}\n\nTrả JSON: {"intro_vi":"dịch phần mở đầu, rút gọn nếu dài","etymology_vi":"dịch mục 字源演变 mạch lạc","etymology_found":${etymologyZh ? "true" : "false"}}. Nếu không có mục 字源演变, hãy tự viết ngắn về nguồn gốc tự dạng chữ "${word}" và đặt etymology_found=false.`
      : `Không lấy được Baike cho chữ "${word}". Tự soạn, trả JSON: {"intro_vi":"giải thích nghĩa và cách dùng","etymology_vi":"nguồn gốc và diễn biến tự dạng","etymology_found":false}`;

    const data = await chatJSON({ system: sys, user, temperature: 0.3 });

    return res.status(200).json({
      word,
      source: baike.ok ? "baidu_baike" : "ai_fallback",
      source_url: baike.ok ? baike.url : null,
      source_note: baike.ok ? null : `Không lấy được Baike (${baike.reason}), nội dung do AI tạo.`,
      ...data,
    });
  } catch (e) {
    console.error("explain", e);
    return res.status(500).json({ error: "server_error" });
  }
}
