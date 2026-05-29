import { useEffect, useState } from "react";
import { pinyin } from "pinyin-pro";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";

function speak(word) {
  try {
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "zh-CN"; u.rate = 0.9;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (e) {}
}

// Auto-fetch chỉ translate. explain và zdic lazy load — accordion bấm vào mới gọi.
const NEEDS = {
  translate: (v) => v && v.pinyin && v.han_viet,
};

export default function Chinese() {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [word, setWord] = useState("");
  const [data, setData] = useState({});
  const [loading, setLoading] = useState({});
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
    setWord(term); setInput(term);
    const { data: row } = await supabase.from("zhnote_searches")
      .select("data").eq("word", term).maybeSingle();
    const cached = row?.data || {};
    setData(cached);
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
          <p className="page-sub">Pinyin · Hán Việt · nghĩa tự hiện. Giải thích từ Baike / zdic chỉ tải khi bấm vào.</p>
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
                <TranslateBody d={data.translate} word={word} />
              </Section>

              <Accordion title="Giải thích — Baidu Baike"
                loaded={!!data.explain} loading={loading.explain}
                onLoad={() => fetchSection(word, "explain")}
                onRefresh={() => fetchSection(word, "explain")}>
                <ExplainBody d={data.explain} />
              </Accordion>

              <Accordion title="Giải thích — zdic.net (汉典)"
                loaded={!!data.zdic} loading={loading.zdic}
                onLoad={() => fetchSection(word, "zdic")}
                onRefresh={() => fetchSection(word, "zdic")}>
                <ZdicBody d={data.zdic} />
              </Accordion>
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
            onRefresh ? <button onClick={onRefresh} title="Tải lại" style={refreshStyle}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--hover)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>↻</button> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

// Accordion: bấm vào header để mở/đóng. Lần mở đầu tiên (chưa có data) sẽ
// trigger onLoad để fetch dữ liệu. Các lần mở sau hiển thị cache.
function Accordion({ title, loaded, loading, onLoad, onRefresh, children }) {
  const [open, setOpen] = useState(false);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !loaded && !loading) onLoad?.();
  }

  return (
    <div className="card stack fade-in" style={{ overflow: "hidden" }}>
      <button onClick={toggle} className="row"
        style={{
          width: "100%", padding: "14px 18px", justifyContent: "space-between",
          background: "transparent", border: "none", cursor: "pointer",
          borderBottom: open ? "1px solid var(--border)" : "none",
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = "var(--hover)"}
        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
        <span className="field-label" style={{ margin: 0 }}>
          <span style={{ display: "inline-block", width: 14, color: "var(--accent-700)" }}>{open ? "▾" : "▸"}</span>
          {title}
        </span>
        <div className="row" style={{ gap: 6 }}>
          {loading && <div className="spinner" />}
          {open && loaded && !loading && onRefresh && (
            <span onClick={(e) => { e.stopPropagation(); onRefresh(); }}
              title="Tải lại" style={refreshStyle}>↻</span>
          )}
        </div>
      </button>
      {open && (
        <div style={{ padding: "14px 18px" }}>
          {loading && !loaded ? (
            <div className="muted tiny">Đang tải, vui lòng đợi vài giây…</div>
          ) : !loaded ? (
            <div className="muted tiny">Chưa có dữ liệu. Bấm vào tiêu đề để tải.</div>
          ) : children}
        </div>
      )}
    </div>
  );
}

const refreshStyle = {
  width: 28, height: 28, borderRadius: 6, color: "var(--text-mute)",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  fontSize: 15, transition: "background .12s", cursor: "pointer",
  border: "none", background: "transparent",
};

function TranslateBody({ d, word }) {
  if (!d) return <div className="muted tiny">Đang chờ…</div>;
  if (d.__error) return <div style={{ color: "#c2185b" }}>{d.__error}</div>;
  return (
    <div className="stack">
      {d.traditional && (
        <div><b>Phồn thể:</b> <span className="zh" style={{ fontSize: 18 }}>{d.traditional}</span>
          {d.traditional === word && <span className="tiny muted"> (giản thể và phồn thể giống nhau)</span>}
        </div>
      )}
      <div><b>Pinyin:</b> <span style={{ color: "var(--accent-700)" }}>{d.pinyin}</span></div>
      <div><b>Hán Việt:</b> {d.han_viet || "—"}</div>
      <div><b>Nghĩa:</b> {d.meaning_vi}</div>
      {d._sources && (d._sources.cedict || d._sources.wiktionary) && (
        <div className="tiny muted" style={{ marginTop: 4 }}>
          Nguồn: {d._sources.cedict && "CC-CEDICT"}{d._sources.cedict && d._sources.wiktionary && " · "}{d._sources.wiktionary && "Wiktionary"}
        </div>
      )}
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
          Không tìm thấy mục nguồn gốc tự dạng trên Baike cho từ này
          {d.source !== "baidu_baike" && " (hoặc không truy cập được Baike)"}.
        </div>
      )}
      {d.source_url && <a className="tiny" href={d.source_url} target="_blank" rel="noreferrer">Xem trên Baike →</a>}
    </div>
  );
}

function ZdicBody({ d }) {
  if (!d) return null;
  if (d.__error) return <div style={{ color: "#c2185b" }}>{d.__error}</div>;
  if (d.source === "fail") {
    return <div className="muted tiny">{d.source_note || "Không lấy được zdic."}</div>;
  }
  const hasContent = d.basic_vi || d.etymology_vi || d.shuowen_vi;
  return (
    <div className="stack">
      <span className="badge tieng_trung">Nguồn: zdic.net (汉典)</span>
      {!hasContent && (
        <div className="muted tiny">{d.source_note || "Trang zdic không có nội dung phù hợp."}</div>
      )}
      {d.basic_vi && (
        <div>
          <p className="field-label" style={{ margin: 0 }}>基本解释 — Nghĩa cơ bản</p>
          <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{d.basic_vi}</div>
        </div>
      )}
      {d.etymology_vi && (
        <div>
          <div className="divider" />
          <p className="field-label" style={{ margin: 0 }}>{d.etymology_section || "字源字形"} — Nguồn gốc tự dạng</p>
          <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{d.etymology_vi}</div>
        </div>
      )}
      {d.shuowen_vi && (
        <div>
          <div className="divider" />
          <p className="field-label" style={{ margin: 0 }}>说文解字 — Thuyết văn giải tự</p>
          <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{d.shuowen_vi}</div>
        </div>
      )}
      {d.source_url && <a className="tiny" href={d.source_url} target="_blank" rel="noreferrer">Xem trên zdic →</a>}
    </div>
  );
}
