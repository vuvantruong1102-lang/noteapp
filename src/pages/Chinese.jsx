import { useEffect, useState } from "react";
import { pinyin } from "pinyin-pro";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import YouglishWidget from "../components/YouglishWidget.jsx";

function speak(word) {
  try {
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "zh-CN"; u.rate = 0.9;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (e) {}
}

// CHỈ translate được auto-fetch khi tra từ.
// explain (Baike + AI dịch ~15 VND) lazy load — user bấm nút mới fetch.
// Nhưng nếu đã có trong cache thì vẫn hiện luôn (đọc cache miễn phí).
const NEEDS = {
  translate: (v) => v && v.pinyin && v.han_viet,
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
    const { data: row } = await supabase.from("zhnote_searches")
      .select("data").eq("word", term).maybeSingle();
    const cached = row?.data || {};
    setData(cached);
    // Chỉ auto-fetch những key trong NEEDS (translate). Explain bị bỏ ra
    // ngoài NEEDS nên không tự gọi - user phải bấm nút "Tải giải thích".
    const todo = Object.keys(NEEDS).filter((k) => !NEEDS[k](cached[k]));
    todo.forEach((k) => fetchSection(term, k));
  }

  async function fetchSection(w, key) {
    const target = w || word;
    if (!target) return;
    setLoading((p) => ({ ...p, [key]: true }));
    try {
      const res = await api[key](target);
      setData((prev) => {
        const next = { ...prev, [key]: res };
        supabase.from("zhnote_searches").upsert(
          { user_id: user.id, word: target, pinyin: pinyin(target, { toneType: "symbol" }), data: next },
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
          <p className="page-sub">Pinyin · Hán Việt · nghĩa tự hiện. Giải thích từ Baike chỉ tải khi bấm.</p>
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
              Nhập một từ tiếng Trung rồi bấm <b>Tra cứu</b>.
            </div>
          )}

          {word && (
            <>
              <div className="card card-pad fade-in">
                <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
                  <div className="row" style={{ alignItems: "baseline", gap: 14 }}>
                    <span className="zh" style={{ fontSize: 42, fontWeight: 500 }}>{word}</span>
                    <span style={{ color: "var(--accent-700)", fontWeight: 600, fontSize: 19 }}>
                      {pinyin(word, { toneType: "symbol" })}
                    </span>
                  </div>
                  <button className="btn ghost sm" onClick={() => speak(word)}>🔊 Phát âm</button>
                </div>
              </div>

              <Section title="Pinyin · Hán Việt · Nghĩa"
                loading={loading.translate} onRefresh={() => fetchSection(word, "translate")}>
                <TranslateBody d={data.translate} />
              </Section>

              <Section title="Giải thích — Baidu Baike"
                loading={loading.explain}
                onRefresh={data.explain ? () => fetchSection(word, "explain") : null}>
                {data.explain ? (
                  <ExplainBody d={data.explain} />
                ) : (
                  <div className="stack">
                    <p className="muted tiny" style={{ margin: 0 }}>
                      Chưa tải. Bấm bên dưới để gọi Baidu Baike và AI dịch sang tiếng Việt.
                    </p>
                    <button className="btn ghost sm"
                      onClick={() => fetchSection(word, "explain")}
                      title="Sẽ tốn ~15 VND/từ. Sau đó cache miễn phí khi tra lại."
                      style={{ alignSelf: "flex-start" }}>
                      ▼ Tải giải thích từ Baike
                    </button>
                  </div>
                )}
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
                  <span className="tiny" style={{ color: "var(--accent-700)" }}>{h.pinyin}</span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Section({ title, loading, onRefresh, children }) {
  return (
    <div className="card card-pad stack fade-in">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <p className="field-label" style={{ margin: 0 }}>{title}</p>
        <div className="row" style={{ gap: 6 }}>
          {loading ? <div className="spinner" /> :
            onRefresh ? <button onClick={onRefresh} title="Tải lại" style={{ width: 28, height: 28, borderRadius: 6, color: "var(--text-mute)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 15, transition: "background .12s" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--hover)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>↻</button> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

function TranslateBody({ d }) {
  if (!d) return <div className="muted tiny">Đang chờ…</div>;
  if (d.__error) return <div style={{ color: "#c2185b" }}>{d.__error}</div>;
  return (
    <div className="stack">
      <div><b>Pinyin:</b> <span style={{ color: "var(--accent-700)" }}>{d.pinyin}</span></div>
      <div><b>Hán Việt:</b> {d.han_viet || "—"}</div>
      <div><b>Nghĩa:</b> {d.meaning_vi}</div>
    </div>
  );
}

function ExplainBody({ d }) {
  if (!d) return null;
  if (d.__error) return <div style={{ color: "#c2185b" }}>{d.__error}</div>;
  const heading = d.etymology_section || "字源演变";
  return (
    <div className="stack">
      {d.source === "baidu_baike" ? (
        <span className="badge tieng_trung">Nguồn: Baidu Baike</span>
      ) : (
        <span className="badge hoc_tap">Không lấy được Baike</span>
      )}
      {d.intro_vi && <div>{d.intro_vi}</div>}
      <div className="divider" />
      <p className="field-label" style={{ margin: 0 }}>{heading} — Nguồn gốc tự dạng</p>
      {d.etymology_found && d.etymology_vi ? (
        <div style={{ whiteSpace: "pre-wrap" }}>{d.etymology_vi}</div>
      ) : (
        <div className="muted tiny">
          Không tìm thấy mục nguồn gốc tự dạng (字源演变 / 文字源流 / 字源解说) trên Baike cho từ này
          {d.source !== "baidu_baike" && " (hoặc không truy cập được Baike)"}.
          Bấm nút <b>↻</b> ở góc phải để thử lại.
        </div>
      )}
      {d.source_url && <a className="tiny" href={d.source_url} target="_blank" rel="noreferrer">Xem trên Baike →</a>}
    </div>
  );
}
