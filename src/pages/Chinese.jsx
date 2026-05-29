import { useEffect, useState } from "react";
import { pinyin } from "pinyin-pro";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import Spinner from "../components/Spinner.jsx";
import YouglishWidget from "../components/YouglishWidget.jsx";

const ACTIONS = [
  { key: "translate", label: "Dịch", ico: "🌐" },
  { key: "explain", label: "Giải thích", ico: "📖" },
  { key: "examples", label: "Ví dụ", ico: "❝" },
  { key: "video", label: "Video", ico: "▶" },
  { key: "synonyms", label: "Đồng nghĩa", ico: "🔁" },
];

function speak(word) {
  try {
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "zh-CN"; u.rate = 0.9;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (e) {}
}

export default function Chinese() {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [word, setWord] = useState("");
  const [data, setData] = useState({});      // { translate, explain, examples, synonyms }
  const [active, setActive] = useState(null); // nút đang mở
  const [loading, setLoading] = useState(null);
  const [history, setHistory] = useState([]);

  async function loadHistory() {
    const { data: rows } = await supabase
      .from("zhnote_searches").select("word,pinyin,updated_at")
      .order("updated_at", { ascending: false }).limit(30);
    setHistory(rows || []);
  }
  useEffect(() => { loadHistory(); }, []);

  async function lookup(w) {
    const term = (w || input).trim();
    if (!term) return;
    setWord(term); setInput(term); setActive(null);
    // nạp cache nếu đã từng tra
    const { data: row } = await supabase
      .from("zhnote_searches").select("data").eq("word", term).maybeSingle();
    setData(row?.data || {});
  }

  async function run(action) {
    if (action === "video") { setActive("video"); return; }
    setActive(action);
    if (data[action]) return;            // đã có cache trong phiên/DB
    setLoading(action);
    try {
      const res = await api[action](word);
      const next = { ...data, [action]: res };
      setData(next);
      await supabase.from("zhnote_searches").upsert(
        { user_id: user.id, word, pinyin: pinyin(word, { toneType: "symbol" }), data: next },
        { onConflict: "user_id,word" }
      );
      loadHistory();
    } catch (e) {
      setData({ ...data, [action]: { __error: "Không lấy được dữ liệu, thử lại sau." } });
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <header className="app-header"><h1 className="screen-title">Tiếng Trung</h1></header>

      <div className="screen stack">
        {/* Ô tra từ */}
        <div className="row">
          <input className="input zh" value={input} placeholder="Gõ từ cần tra…"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookup()} />
          <button className="btn" onClick={() => lookup()}>Tra</button>
        </div>

        {word && (
          <>
            {/* Thẻ từ */}
            <div className="card card-pad fade-in">
              <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
                <div className="row" style={{ alignItems: "baseline", gap: 12 }}>
                  <span className="zh" style={{ fontSize: 34, fontWeight: 500 }}>{word}</span>
                  <span style={{ color: "var(--green-600)", fontWeight: 600 }}>
                    {pinyin(word, { toneType: "symbol" })}
                  </span>
                </div>
                <button onClick={() => speak(word)} title="Phát âm" style={{ fontSize: 22 }}>🔊</button>
              </div>
            </div>

            {/* Nút hành động */}
            <div className="actions">
              {ACTIONS.map((a) => (
                <button key={a.key} className={"action" + (active === a.key ? " on" : "")}
                  onClick={() => run(a.key)}>
                  <span>{a.ico}</span>{a.label}
                </button>
              ))}
            </div>

            {/* Kết quả */}
            <div className="fade-in">
              {loading && <div className="card card-pad"><Spinner label="Đang hỏi AI…" /></div>}
              {!loading && active && active !== "video" && (
                <ResultPanel action={active} payload={data[active]} />
              )}
              {!loading && active === "video" && (
                <div className="card card-pad"><YouglishWidget word={word} /></div>
              )}
            </div>
          </>
        )}

        {/* Lịch sử */}
        {history.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <p className="field-label">🕘 Lịch sử tra cứu</p>
            <div className="card">
              {history.map((h, i) => (
                <div key={h.word} onClick={() => lookup(h.word)}
                  className="row" style={{ padding: "11px 14px", cursor: "pointer",
                    borderTop: i ? "1px solid var(--border)" : "none" }}>
                  <span className="zh" style={{ fontSize: 18 }}>{h.word}</span>
                  <span className="tiny" style={{ color: "var(--green-600)" }}>{h.pinyin}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function ResultPanel({ action, payload }) {
  if (!payload) return null;
  if (payload.__error) return <div className="card card-pad" style={{ color: "#d4537e" }}>{payload.__error}</div>;

  if (action === "translate")
    return (
      <div className="card card-pad stack">
        <div><b>Pinyin:</b> <span style={{ color: "var(--green-600)" }}>{payload.pinyin}</span></div>
        <div><b>Nghĩa:</b> {payload.meaning_vi}</div>
        <div className="muted" style={{ fontSize: 14 }}>{payload.explanation_vi}</div>
      </div>
    );

  if (action === "explain")
    return (
      <div className="card card-pad stack">
        <span className={"badge " + (payload.source === "baidu_baike" ? "tieng_trung" : "hoc_tap")}>
          {payload.source === "baidu_baike" ? "Nguồn: Baidu Baike" : "Nguồn: AI"}
        </span>
        <div>{payload.intro_vi}</div>
        <div className="divider" />
        <p className="field-label" style={{ margin: 0 }}>字源演变 — Nguồn gốc tự dạng {payload.etymology_found ? "" : "(AI tổng hợp)"}</p>
        <div className="muted" style={{ fontSize: 14 }}>{payload.etymology_vi}</div>
        {payload.source_url && <a className="tiny" href={payload.source_url} target="_blank" rel="noreferrer">Xem trên Baike →</a>}
      </div>
    );

  if (action === "synonyms")
    return (
      <div className="card card-pad stack">
        {(payload.synonyms || []).map((s, i) => (
          <div key={i}>
            <div className="row"><span className="zh" style={{ fontSize: 18 }}>{s.word}</span>
              <span className="tiny" style={{ color: "var(--green-600)" }}>{s.pinyin}</span></div>
            <div style={{ fontSize: 14 }}>{s.meaning_vi}</div>
            {s.note_vi && <div className="tiny muted">↳ {s.note_vi}</div>}
          </div>
        ))}
      </div>
    );

  if (action === "examples")
    return (
      <div className="stack">
        {(payload.examples || []).map((ex, i) => (
          <div className="card card-pad stack" key={i}>
            <div className="zh" style={{ fontSize: 18 }}>{ex.zh}</div>
            <div className="tiny" style={{ color: "var(--green-600)" }}>{ex.pinyin}</div>
            <div style={{ fontSize: 14 }}>{ex.translation_vi}</div>
            {ex.breakdown?.length > 0 && (
              <div className="tiny muted">
                {ex.breakdown.map((b, j) => (
                  <span key={j}><span className="zh">{b.token}</span> ({b.pinyin}): {b.meaning_vi}{j < ex.breakdown.length - 1 ? " · " : ""}</span>
                ))}
              </div>
            )}
            {ex.grammar_vi && <div className="tiny" style={{ background: "var(--green-50)", padding: "6px 10px", borderRadius: 8 }}>📌 {ex.grammar_vi}</div>}
          </div>
        ))}
      </div>
    );

  return null;
}
