import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { pinyin } from "pinyin-pro";
import { api } from "../lib/api.js";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../context/AuthContext.jsx";
import Spinner from "../components/Spinner.jsx";

const hasHan = (s) => /[\u4e00-\u9fff]/.test(s || "");

export default function Translate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  function clearText() {
    setText(""); setRes(null); setSaved(false);
  }

  // Bấm 1 cụm từ -> sang trang Tra Tiếng Trung và tra luôn từ đó
  function lookupWord(w) {
    if (hasHan(w)) navigate(`/zh?w=${encodeURIComponent(w.trim())}`);
  }

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
          <p className="page-sub">Dán câu tiếng Trung để tách từ, sinh pinyin và giải thích. Bấm vào từng cụm từ để tra nghĩa.</p>
        </div>
      </div>

      <div className="stack">
        <div className="card card-pad stack">
          <div className="ta-wrap">
            <textarea className="textarea zh" value={text} style={{ fontSize: 17, minHeight: 130 }}
              placeholder="我从越南来，正在学习中文。" onChange={(e) => setText(e.target.value)} />
            {text && (
              <button type="button" className="ta-clear" onClick={clearText}
                title="Xoá nội dung" aria-label="Xoá nội dung">×</button>
            )}
          </div>
          <button className="btn" onClick={analyze} disabled={loading || !text.trim()}
            style={{ alignSelf: "flex-start" }}>
            {loading ? "Đang phân tích…" : "Phân tích & tạo pinyin"}
          </button>
        </div>

        {loading && <div className="card card-pad"><Spinner label="Đang tách từ & dịch…" /></div>}

        {res && !res.__error && (
          <div className="stack fade-in">
            <div className="card card-pad">
              <p className="field-label">Câu kèm pinyin <span className="tiny muted">— bấm vào cụm từ để tra</span></p>
              <div style={{ lineHeight: 2.2 }}>
                {(res.tokens || []).map((t, i) => {
                  const isHan = hasHan(t.token);
                  return (
                    <span className={"ruby" + (isHan ? " clickable" : "")} key={i}
                      title={isHan ? `${t.meaning_vi || ""} — bấm để tra` : t.meaning_vi}
                      onClick={isHan ? () => lookupWord(t.token) : undefined}>
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
                <p className="field-label" style={{ margin: 0 }}>Từ mới <span className="tiny muted">— bấm để tra</span></p>
                {res.new_words.map((w, i) => (
                  <div key={i}>
                    <span className="zh zh-link" style={{ fontSize: 18 }}
                      onClick={() => lookupWord(w.word)} title="Bấm để tra">{w.word}</span>{" "}
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
