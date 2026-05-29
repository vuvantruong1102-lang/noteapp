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
      `${text.trim()}\n\n【Dịch】 ${res.translation_vi}\n\n【Ngữ pháp】 ${res.explanation_vi}\n\n` +
      `【Từ mới】\n` + (res.new_words || []).map((w) => `• ${w.word} (${w.pinyin}): ${w.meaning_vi}`).join("\n");
    await supabase.from("zhnote_notes").insert({
      user_id: user.id, category: "tieng_trung",
      title: text.trim().slice(0, 30), content: body,
    });
    setSaved(true);
  }

  return (
    <>
      <header className="app-header"><h1 className="screen-title">Dịch câu</h1></header>

      <div className="screen stack">
        <div>
          <p className="field-label">Dán câu / đoạn tiếng Trung</p>
          <textarea className="textarea zh" value={text}
            placeholder="我从越南来，正在学习中文。"
            onChange={(e) => setText(e.target.value)} />
        </div>
        <button className="btn block" onClick={analyze} disabled={loading || !text.trim()}>
          {loading ? "Đang phân tích…" : "Phân tích & tạo pinyin"}
        </button>

        {loading && <div className="card card-pad"><Spinner label="Đang tách từ & dịch…" /></div>}

        {res && !res.__error && (
          <div className="stack fade-in">
            {/* Câu kèm pinyin theo từng từ */}
            <div className="card card-pad">
              <p className="field-label">Câu kèm pinyin</p>
              <div style={{ lineHeight: 2 }}>
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

            {/* Dịch nghĩa */}
            <div className="card card-pad stack">
              <div><b>Dịch:</b> {res.translation_vi}</div>
              {res.explanation_vi && <div className="muted" style={{ fontSize: 14 }}>📐 {res.explanation_vi}</div>}
            </div>

            {/* Từ mới */}
            {res.new_words?.length > 0 && (
              <div className="card card-pad stack">
                <p className="field-label" style={{ margin: 0 }}>Từ mới</p>
                {res.new_words.map((w, i) => (
                  <div className="row" key={i} style={{ justifyContent: "space-between" }}>
                    <div>
                      <span className="zh" style={{ fontSize: 17 }}>{w.word}</span>{" "}
                      <span className="tiny" style={{ color: "var(--green-600)" }}>{w.pinyin}</span>
                      <div style={{ fontSize: 14 }}>{w.meaning_vi}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button className="btn ghost block" onClick={saveNote} disabled={saved}>
              {saved ? "✓ Đã lưu vào Ghi chú" : "💾 Lưu vào ghi chú (Tiếng Trung)"}
            </button>
          </div>
        )}

        {res?.__error && <div className="card card-pad" style={{ color: "#d4537e" }}>{res.__error}</div>}
      </div>
    </>
  );
}
