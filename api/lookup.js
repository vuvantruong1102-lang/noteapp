// POST { word } -> { traditional, definition_en, cedict_pinyin, han_viet, in_cedict }
// Tra TỨC THÌ: CC-CEDICT (local DB) + Wiktionary (Hán Việt). KHÔNG gọi AI.
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import { isChinese } from "./_lib/openai.js";

const sb = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function cedictLookup(word) {
  try {
    const { data } = await sb.from("zhnote_cedict")
      .select("traditional, simplified, pinyin, definition")
      .or(`simplified.eq."${word}",traditional.eq."${word}"`)
      .limit(6);
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
      headers: { "User-Agent": "VTNotes/1.0 (educational)", Accept: "text/html" },
    });
    clearTimeout(timer);
    if (!r.ok) return null;
    const html = await r.text();
    const $ = cheerio.load(html);
    const readings = new Set();
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
    const [hits, hanVietList] = await Promise.all([
      cedictLookup(word),
      scrapeWiktionaryHanViet(word),
    ]);

    const inCedict = hits.length > 0;
    let traditional = null, definition_en = null, cedict_pinyin = null;
    if (inCedict) {
      traditional = hits[0].traditional;
      cedict_pinyin = hits[0].pinyin;
      // Gộp các âm đọc + nghĩa, mỗi dòng 1 âm
      definition_en = hits.map(e => `[${e.pinyin}] ${e.definition}`).join("\n");
    }
    const han_viet = (hanVietList && hanVietList.length) ? hanVietList.join(", ") : null;

    return res.status(200).json({
      traditional, definition_en, cedict_pinyin, han_viet, in_cedict: inCedict,
    });
  } catch (e) {
    console.error("lookup", e);
    return res.status(500).json({ error: "server_error" });
  }
}
