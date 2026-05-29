// POST { word } -> { word, source, source_url, basic_vi, etymology_vi, shuowen_vi, version }
// Tra zdic.net (汉典) cho chữ Hán. Trích 3 mục:
//   - 基本解释  -> nghĩa cơ bản
//   - 字源字形 / 字源演变 / 字形演变 -> nguồn gốc tự dạng
//   - 说文解字 -> trích dẫn Thuyết văn giải tự
import * as cheerio from "cheerio";
import { chatJSON, isChinese } from "./_lib/openai.js";

const SCHEMA_VERSION = 1;
const ETY_HEADINGS = ["字源字形", "字源演变", "字形演变", "字源解说", "字源"];
const NEXT_MARKERS = [
  "基本解释", "详细解释", "国语辞典", "康熙字典", "说文解字",
  "音韵方言", "字义", "笔顺", "百科", "网络解释", "方言集汇",
];
const BLOCK_MARKERS = ["请输入验证码", "您的访问频率过高", "antispider"];

function htmlToText(html) {
  const $ = cheerio.load(html);
  $("script, style, noscript, header, footer, nav").remove();
  return $("body").text().replace(/\s+/g, " ").trim();
}

function sliceBetween(text, startMarker, capChars = 3000) {
  const idx = text.indexOf(startMarker);
  if (idx === -1) return null;
  const start = idx + startMarker.length;
  let end = text.length;
  for (const m of NEXT_MARKERS) {
    if (m === startMarker) continue;
    const mi = text.indexOf(m, start);
    if (mi !== -1 && mi < end) end = mi;
  }
  end = Math.min(end, start + capChars);
  const s = text.slice(start, end).trim().replace(/^(?:\s|播报|编辑|更多)+/, "").trim();
  return s.length > 20 ? s : null;
}

function extractEtymology(text) {
  const all = [];
  for (const h of ETY_HEADINGS) {
    let pos = 0;
    while (true) {
      const idx = text.indexOf(h, pos);
      if (idx === -1) break;
      const start = idx + h.length;
      let end = text.length;
      for (const m of NEXT_MARKERS) {
        const mi = text.indexOf(m, start);
        if (mi !== -1 && mi < end) end = mi;
      }
      for (const h2 of ETY_HEADINGS) {
        if (h2 === h) continue;
        const hi = text.indexOf(h2, start);
        if (hi !== -1 && hi < end) end = hi;
      }
      end = Math.min(end, start + 5000);
      const s = text.slice(start, end).trim().replace(/^(?:\s|播报|编辑)+/, "").trim();
      all.push({ heading: h, slice: s });
      pos = idx + 1;
    }
  }
  if (!all.length) return null;
  all.sort((a, b) => b.slice.length - a.slice.length);
  return all[0].slice.length > 30 ? all[0] : null;
}

async function fetchZdic(word) {
  const url = `https://www.zdic.net/hans/${encodeURIComponent(word)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal, redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "zh-CN,zh;q=0.9",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!r.ok) return { ok: false, reason: `HTTP ${r.status}` };
    const html = await r.text();
    if (BLOCK_MARKERS.some(m => html.includes(m))) return { ok: false, reason: "blocked" };
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
    const z = await fetchZdic(word);
    if (!z.ok) {
      return res.status(200).json({
        word, source: "fail", source_url: null,
        source_note: `Không lấy được zdic (${z.reason}).`,
        basic_vi: "", etymology_vi: "", shuowen_vi: "",
        etymology_section: null, version: SCHEMA_VERSION,
      });
    }

    const text = htmlToText(z.html);
    const basic = sliceBetween(text, "基本解释", 2500);
    const ety = extractEtymology(text);
    const shuowen = sliceBetween(text, "说文解字", 1500);

    if (!basic && !ety && !shuowen) {
      return res.status(200).json({
        word, source: "zdic", source_url: z.url,
        source_note: "Trang zdic có nhưng không trích được nội dung phù hợp.",
        basic_vi: "", etymology_vi: "", shuowen_vi: "",
        etymology_section: null, version: SCHEMA_VERSION,
      });
    }

    const parts = [];
    if (basic)        parts.push(`[基本解释]\n${basic}`);
    if (ety)          parts.push(`[${ety.heading}]\n${ety.slice}`);
    if (shuowen)      parts.push(`[说文解字]\n${shuowen}`);

    const payload = await chatJSON({
      temperature: 0.2,
      system: "Bạn là chuyên gia Hán ngữ học. Dịch tiếng Việt tự nhiên, đầy đủ, không bịa thêm. Chỉ trả JSON.",
      user:
        `Dữ liệu trích từ zdic.net (汉典) cho chữ "${word}":\n\n${parts.join("\n\n")}\n\n` +
        `Yêu cầu: dịch ĐẦY ĐỦ sang tiếng Việt, giữ thuật ngữ Hán ngữ học chuẩn ` +
        `(giáp cốt văn, kim văn, triện thư, chữ hình thanh, chữ hội ý, v.v.). ` +
        `Trích dẫn 说文解字 dịch nghĩa rồi ghi nguyên văn Hán trong ngoặc.\n` +
        `JSON: {"basic_vi":"dịch 基本解释 nếu có, không thì rỗng","etymology_vi":"dịch 字源 nếu có","shuowen_vi":"dịch 说文解字 nếu có"}`,
    });

    return res.status(200).json({
      word, source: "zdic", source_url: z.url,
      basic_vi: payload.basic_vi || "",
      etymology_vi: payload.etymology_vi || "",
      shuowen_vi: payload.shuowen_vi || "",
      etymology_section: ety?.heading || null,
      version: SCHEMA_VERSION,
    });
  } catch (e) {
    console.error("zdic", e);
    return res.status(500).json({ error: "server_error" });
  }
}
