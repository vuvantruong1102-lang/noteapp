import { useEffect, useState } from "react";
import { pinyin } from "pinyin-pro";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import Spinner from "../components/Spinner.jsx";
import YouglishWidget from "../components/YouglishWidget.jsx";

function speak(word) {
  try {
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "zh-CN"; u.rate = 0.9;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (e) {}
}

// Các phần đều có cache trong cùng row zhnote_searches.data.
// translate cũ thiếu han_viet ➜ vẫn coi là chưa cache để refetch.
const NEEDS = {
  translate: (v) => v && v.pinyin && v.han_viet,
  synonyms:  (v) => v && Array.isArray(v.synonyms),
  examples:  (v) => v && Array.isArray(v.examples),
  explain:   (v) => v && (v.intro_vi !== undefined),
};

export default function Chinese() {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [word, setWord] = useState("");
  const [data, setData] = useState({});
  const [loading, setLoading] = useState({});
  const [videoOpen, setVideoOpen] = useState(false);
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
    setWord(term); setInput(term); setVideoOpen(false);

    // Nạp cache
    const { data: row } = await supabase.from("zhnote_searches")
      .select("data").eq("word", term).maybeSingle();
    const cached = row?.data || {};
    setData(cached);

    // Fire song song những phần còn thiếu (hoặc cache cũ chưa đủ field)
    const todo = Object.keys(NEEDS).filter((k) => !NEEDS[k](cached[k]));
    todo.forEach((k) => fetchSection(term, k, cached));
  }

  async function fetchSection(w, key, baseData) {
    setLoading((p) => ({ ...p, [key]: true }));
    try {
      const res = await api[key](w);
      setData((prev) => {
        const next = { ...prev, [key]: res };
        supabase.from("zhnote_searches").upsert(
          { user_id: user.id, word: w, pinyin: pinyin(w, { toneType: "symbol" }), data: next },
          { onConflict: "user_id,word" }
        ).then(() => loadHistory());
        return next;
      });
    } catch (e) {
      setData((p) => ({ ...p, [key]: { __error: "Lỗi tải dữ liệu, thử lại sau." } }));
    } finally {
      setLoading((p) => ({ ...p, [key]: false }));
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Tra Tiếng Trung</h1>
          <p className="page-sub">Pinyin · Hán Việt · nghĩa · đồng nghĩa · ví dụ · giải thích từ Baike</p>
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
              Tất cả phần (pinyin, Hán Việt, nghĩa, đồng nghĩa, ví dụ, giải thích) sẽ nạp tự động.
            </div>
          )}

          {word && (
            <>
              <div className="card card-pad fade-in">
                <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
                  <div className="row" style={{ alignItems: "baseline", gap: 14 }}>
                    <span className="zh" style={{ fontSize: 42, fontWeight: 500 }}>{word}</span>
                    <span style={{ color: "var(--green-600)", fontWeight: 600, fontSize: 19 }}>
                      {pinyin(word, { toneType: "symbol" })}
                    </span>
                  </div>
                  <button className="btn ghost sm" onClick={() => speak(word)}>🔊 Phát âm</button>
                </div>
              </div>

              <Section title="Pinyin · Hán Việt · Nghĩa" loading={loading.translate}>
                <TranslateBody d={data.translate} />
              </Section>

              <Section title="Từ đồng nghĩa" loading={loading.synonyms}>
                <SynonymsBody d={data.synonyms} />
              </Section>

              <Section title="Ví dụ" loading={loading.examples}>
                <ExamplesBody d={data.examples} />
              </Section>

              <Section title="Giải thích — Baidu Baike" loading={loading.explain}>
                <ExplainBody d={data.explain} />
              </Section>

              <div className="card card-pad">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <p className="field-label" style={{ margin: 0 }}>▶ Video phát âm (Youglish)</p>
                  <button className="btn ghost sm" onClick={() => setVideoOpen((v) => !v)}>
                    {videoOpen ? "Ẩn" : "Mở"}
                  </button>
                </div>
                {videoOpen && <div style={{ marginTop: 12 }}><YouglishWidget word={word} /></div>}
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

function Section({ title, loading, children }) {
  return (
    <div className="card card-pad stack fade-in">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <p className="field-label" style={{ margin: 0 }}>{title}</p>
        {loading && <div className="spinner" />}
      </div>
      {children}
    </div>
  );
}

function TranslateBody({ d }) {
  if (!d) return <div className="muted tiny">Đang chờ…</div>;
  if (d.__error) return <div style={{ color: "#d4537e" }}>{d.__error}</div>;
  return (
    <div className="stack">
      <div><b>Pinyin:</b> <span style={{ color: "var(--green-600)" }}>{d.pinyin}</span></div>
      <div><b>Hán Việt:</b> {d.han_viet || "—"}</div>
      <div><b>Nghĩa:</b> {d.meaning_vi}</div>
    </div>
  );
}

function SynonymsBody({ d }) {
  if (!d) return <div className="muted tiny">Đang chờ…</div>;
  if (d.__error) return <div style={{ color: "#d4537e" }}>{d.__error}</div>;
  if (!d.synonyms?.length) return <div className="muted tiny">Không có từ đồng nghĩa.</div>;
  return (
    <div className="stack">
      {d.synonyms.map((s, i) => (
        <div key={i}>
          <div className="row"><span className="zh" style={{ fontSize: 19 }}>{s.word}</span>
            <span className="tiny" style={{ color: "var(--green-600)" }}>{s.pinyin}</span></div>
          <div>{s.meaning_vi}</div>
          {s.note_vi && <div className="tiny muted">↳ {s.note_vi}</div>}
        </div>
      ))}
    </div>
  );
}

function ExamplesBody({ d }) {
  if (!d) return <div className="muted tiny">Đang chờ…</div>;
  if (d.__error) return <div style={{ color: "#d4537e" }}>{d.__error}</div>;
  if (!d.examples?.length) return <div className="muted tiny">Không có ví dụ.</div>;
  return (
    <div className="ex-grid">
      {d.examples.map((ex, i) => (
        <div className="card card-pad stack" key={i} style={{ background: "var(--bg)" }}>
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
}

function ExplainBody({ d }) {
  if (!d) return <div className="muted tiny">Đang chờ…</div>;
  if (d.__error) return <div style={{ color: "#d4537e" }}>{d.__error}</div>;
  return (
    <div className="stack">
      {d.source === "baidu_baike" ? (
        <span className="badge tieng_trung">Nguồn: Baidu Baike</span>
      ) : (
        <span className="badge hoc_tap">Không lấy được Baike</span>
      )}
      {d.intro_vi && <div>{d.intro_vi}</div>}
      <div className="divider" />
      <p className="field-label" style={{ margin: 0 }}>字源演变 — Nguồn gốc tự dạng</p>
      {d.etymology_found && d.etymology_vi ? (
        <div style={{ whiteSpace: "pre-wrap" }}>{d.etymology_vi}</div>
      ) : (
        <div className="muted tiny">
          Không có mục 字源演变 trên Baike cho từ này
          {d.source !== "baidu_baike" && " (hoặc không truy cập được Baike)"}.
        </div>
      )}
      {d.source_url && <a className="tiny" href={d.source_url} target="_blank" rel="noreferrer">Xem trên Baike →</a>}
    </div>
  );
}
