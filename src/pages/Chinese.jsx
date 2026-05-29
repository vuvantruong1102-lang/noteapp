import { useEffect, useState } from "react";
import { pinyin } from "pinyin-pro";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import Spinner from "../components/Spinner.jsx";
import YouglishWidget from "../components/YouglishWidget.jsx";

const ACTIONS = [
  { key: "translate", label: "Dịch",        ico: "🌐" },
  { key: "explain",   label: "Giải thích",  ico: "📖" },
  { key: "examples",  label: "Ví dụ",       ico: "❝" },
  { key: "video",     label: "Video",       ico: "▶" },
  { key: "synonyms",  label: "Đồng nghĩa",  ico: "🔁" },
];

function speak(word) {
  try {
    const u = new SpeechSynthesisUtterance(word); u.lang = "zh-CN"; u.rate = 0.9;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (e) {}
}

export default function Chinese() {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [word, setWord] = useState("");
  const [data, setData] = useState({});
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(null);
  const [history, setHistory] = useState([]);

  async function loadHistory() {
    const { data: rows } = await supabase.from("zhnote_searches")
      .select("word,pinyin,updated_at").order("updated_at", { ascending: false }).limit(40);
    setHistory(rows || []);
  }
  useEffect(() => { loadHistory(); }, []);

  async function lookup(w) {
    const term = (w || input).trim();
    if (!term) return;
    setWord(term); setInput(term); setActive("translate"); setLoading(null);
    const { data: row } = await supabase.from("zhnote_searches").select("data").eq("word", term).maybeSingle();
    const cached = row?.data || {};
    setData(cached);
    if (!cached.translate) run("translate", term, cached);
  }

  async function run(action, forceWord, baseData) {
    const w = forceWord || word;
    if (action === "video") { setActive("video"); return; }
    setActive(action);
    const cur = baseData || data;
    if (cur[action]) return;
    setLoading(action);
    try {
      const res = await api[action](w);
      const next = { ...cur, [action]: res };
      setData(next);
      await supabase.from("zhnote_searches").upsert(
        { user_id: user.id, word: w, pinyin: pinyin(w, { toneType: "symbol" }), data: next },
        { onConflict: "user_id,word" });
      loadHistory();
    } catch (e) {
      setData((d) => ({ ...d, [action]: { __error: "Không lấy được dữ liệu, thử lại sau." } }));
    } finally { setLoading(null); }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Tiếng Trung</h1>
          <p className="page-sub">Tra từ, giải thích, ví dụ và video phát âm</p>
        </div>
      </div>

      <div className="zh-layout">
        <div className="stack">
          <div className="row">
            <input className="input zh" value={input} placeholder="Gõ từ / chữ Hán cần tra…"
              style={{ fontSize: 17 }}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lookup()} />
            <button className="btn" onClick={() => lookup()}>Tra cứu</button>
          </div>

          {!word && (
            <div className="empty">
              <div className="big">🀄</div>
              Nhập một từ tiếng Trung rồi bấm <b>Tra cứu</b>.<br />
              Sau đó dùng các nút Dịch · Giải thích · Ví dụ · Video · Đồng nghĩa.
            </div>
          )}

          {word && (
            <>
              <div className="card card-pad fade-in">
                <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
                  <div className="row" style={{ alignItems: "baseline", gap: 14 }}>
                    <span className="zh" style={{ fontSize: 40, fontWeight: 500 }}>{word}</span>
                    <span style={{ color: "var(--green-600)", fontWeight: 600, fontSize: 18 }}>
                      {pinyin(word, { toneType: "symbol" })}
                    </span>
                  </div>
                  <button className="btn ghost sm" onClick={() => speak(word)}>🔊 Phát âm</button>
                </div>
              </div>

              <div className="actions">
                {ACTIONS.map((a) => (
                  <button key={a.key} className={"action" + (active === a.key ? " on" : "")}
                    onClick={() => run(a.key)}><span>{a.ico}</span>{a.label}</button>
                ))}
              </div>

              <div className="fade-in">
                {loading ? (
                  <div className="card card-pad"><Spinner label="Đang hỏi AI…" /></div>
                ) : active === "video" ? (
                  <div className="card card-pad"><YouglishWidget word={word} /></div>
                ) : active ? (
                  <ResultPanel action={active} payload={data[active]} />
                ) : null}
              </div>
            </>
          )}
        </div>

        <aside className="zh-aside">
          <p className="field-label">🕘 Lịch sử tra cứu</p>
          {history.length === 0 ? (
            <div className="card card-pad tiny muted">Chưa có từ nào.</div>
          ) : (
            <div className="card">
              {history.map((h, i) => (
                <div key={h.word} onClick={() => lookup(h.word)} className="row"
                  style={{ padding: "11px 14px", cursor: "pointer", borderTop: i ? "1px solid var(--border)" : "none" }}>
                  <span className="zh" style={{ fontSize: 18 }}>{h.word}</span>
                  <span className="tiny" style={{ color: "var(--green-600)" }}>{h.pinyin}</span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
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
        <div className="muted">{payload.explanation_vi}</div>
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
        <div className="muted">{payload.etymology_vi}</div>
        {payload.source_url && <a className="tiny" href={payload.source_url} target="_blank" rel="noreferrer">Xem trên Baike →</a>}
      </div>
    );

  if (action === "synonyms")
    return (
      <div className="card card-pad stack">
        {(payload.synonyms || []).map((s, i) => (
          <div key={i}>
            <div className="row"><span className="zh" style={{ fontSize: 19 }}>{s.word}</span>
              <span className="tiny" style={{ color: "var(--green-600)" }}>{s.pinyin}</span></div>
            <div>{s.meaning_vi}</div>
            {s.note_vi && <div className="tiny muted">↳ {s.note_vi}</div>}
          </div>
        ))}
      </div>
    );

  if (action === "examples")
    return (
      <div className="ex-grid">
        {(payload.examples || []).map((ex, i) => (
          <div className="card card-pad stack" key={i}>
            <div className="zh" style={{ fontSize: 19 }}>{ex.zh}</div>
            <div className="tiny" style={{ color: "var(--green-600)" }}>{ex.pinyin}</div>
            <div>{ex.translation_vi}</div>
            {ex.breakdown?.length > 0 && (
              <div className="tiny muted">
                {ex.breakdown.map((b, j) => (
                  <span key={j}><span className="zh">{b.token}</span> ({b.pinyin}): {b.meaning_vi}{j < ex.breakdown.length - 1 ? " · " : ""}</span>
                ))}
              </div>
            )}
            {ex.grammar_vi && <div className="tiny" style={{ background: "var(--green-50)", padding: "7px 11px", borderRadius: 8 }}>📌 {ex.grammar_vi}</div>}
          </div>
        ))}
      </div>
    );
  return null;
}
