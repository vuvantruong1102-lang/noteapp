import { useState } from "react";
import { pinyin } from "pinyin-pro";
import { api } from "../lib/api.js";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../context/AuthContext.jsx";
import Spinner from "../components/Spinner.jsx";

export default function Translate() {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function analyze() {
    if (!text.trim()) return;
    setLoading(true); setRes(null); setSaved(false);
    try { setRes(await api.sentence(text.trim())); }
    catch (e) { setRes({ __error: "Không phân tích được, kiểm tra lại câu tiếng Trung." }); }
    finally { setLoading(false); }
  }

  async function saveNote() {
    if (!res || res.__error) return;
    const body =
      `${text.trim()}\n\n【Dịch】 ${res.translation_vi}\n\n【Ngữ pháp】 ${res.explanation_vi}\n\n【Từ mới】\n` +
      (res.new_words || []).map((w) => `• ${w.word} (${w.pinyin}): ${w.meaning_vi}`).join("\n");
    await supabase.from("zhnote_notes").insert({
      user_id: user.id, category: "tieng_trung", title: text.trim().slice(0, 30), content: body });
    setSaved(true);
  }

  return (
    <div className="page" style={{ maxWidth: 920 }}>
      <div className="page-head">
        <div>
          <h1 className="page-title">Dịch câu</h1>
          <p className="page-sub">Dán câu tiếng Trung để tách từ, sinh pinyin và giải thích</p>
        </div>
      </div>

      <div className="stack">
        <div className="card card-pad stack">
          <textarea className="textarea zh" value={text} style={{ fontSize: 17, minHeight: 130 }}
            placeholder="我从越南来，正在学习中文。" onChange={(e) => setText(e.target.value)} />
          <button className="btn" onClick={analyze} disabled={loading || !text.trim()}
            style={{ alignSelf: "flex-start" }}>
            {loading ? "Đang phân tích…" : "Phân tích & tạo pinyin"}
          </button>
        </div>

        {loading && <div className="card card-pad"><Spinner label="Đang tách từ & dịch…" /></div>}

        {res && !res.__error && (
          <div className="stack fade-in">
            <div className="card card-pad">
              <p className="field-label">Câu kèm pinyin</p>
              <div style={{ lineHeight: 2.2 }}>
                {(res.tokens || []).map((t, i) => {
                  const isHan = /[\u4e00-\u9fff]/.test(t.token);
                  return (
                    <span className="ruby" key={i} title={t.meaning_vi}>
                      <span className="py">{isHan ? (t.pinyin || pinyin(t.token, { toneType: "symbol" })) : ""}</span>
                      <span className="hz zh">{t.token}</span>
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="card card-pad stack">
              <div><b>Dịch:</b> {res.translation_vi}</div>
              {res.explanation_vi && <div className="muted">📐 {res.explanation_vi}</div>}
            </div>

            {res.new_words?.length > 0 && (
              <div className="card card-pad stack">
                <p className="field-label" style={{ margin: 0 }}>Từ mới</p>
                {res.new_words.map((w, i) => (
                  <div key={i}>
                    <span className="zh" style={{ fontSize: 18 }}>{w.word}</span>{" "}
                    <span className="tiny" style={{ color: "var(--green-600)" }}>{w.pinyin}</span>
                    <div>{w.meaning_vi}</div>
                  </div>
                ))}
              </div>
            )}

            <button className="btn ghost" onClick={saveNote} disabled={saved} style={{ alignSelf: "flex-start" }}>
              {saved ? "✓ Đã lưu vào Ghi chú" : "💾 Lưu vào ghi chú (Tiếng Trung)"}
            </button>
          </div>
        )}

        {res?.__error && <div className="card card-pad" style={{ color: "#d4537e" }}>{res.__error}</div>}
      </div>
    </div>
  );
}
