import { useNavigate } from "react-router-dom";

const LABEL = { cong_viec: "Công việc", ca_nhan: "Cá nhân", hoc_tap: "Học tập", tieng_trung: "Tiếng Trung" };
const CAT_COLOR = { cong_viec: "#2563eb", ca_nhan: "#db2777", hoc_tap: "#b97714", tieng_trung: "#00a82d" };
const fmt = (s) => new Date(s).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

function stripHtml(html) {
  if (!html) return "";
  const t = document.createElement("div");
  t.innerHTML = html;
  return (t.textContent || "").replace(/\s+/g, " ").trim();
}

export default function NoteCard({ note, mode = "grid" }) {
  const nav = useNavigate();
  const text = stripHtml(note.content);
  const preview = text.slice(0, mode === "list" ? 100 : 160);
  const tags = (note.zhnote_note_tags || []).map((nt) => nt.zhnote_tags).filter(Boolean);
  const isZh = note.category === "tieng_trung";

  if (mode === "list") {
    return (
      <div className="card list-item fade-in" onClick={() => nav(`/note/${note.id}`)}>
        <span className="cat-dot" style={{ background: CAT_COLOR[note.category] }} />
        <div className="list-main">
          <div className="list-row1">
            <span className={"list-title" + (isZh ? " zh" : "")}>
              {note.title || <span className="muted">(không tiêu đề)</span>}
              {note.pinned && <span title="Đã ghim" style={{ marginLeft: 6, fontSize: 12 }}>📌</span>}
            </span>
            <span className="list-cat">{LABEL[note.category]}</span>
            {tags.slice(0, 3).map((t) => (
              <span key={t.id} className="tag-chip-sm" style={{ color: t.color, fontSize: 11 }}>{t.name}</span>
            ))}
            <span className="list-date">{fmt(note.updated_at)}</span>
          </div>
          {preview && <div className="list-preview">{preview}{text.length > 100 ? "…" : ""}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="card card-pad hover fade-in" onClick={() => nav(`/note/${note.id}`)}
      style={{ display: "flex", flexDirection: "column", minHeight: 130 }}>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <span className={"badge " + note.category}>{LABEL[note.category]}</span>
        {note.pinned && <span title="Đã ghim">📌</span>}
      </div>
      {note.title && <div style={{ fontWeight: 600, marginBottom: 4 }} className={isZh ? "zh" : ""}>{note.title}</div>}
      {preview && <div className="muted" style={{ fontSize: 14, flex: 1 }}>{preview}{text.length > 160 ? "…" : ""}</div>}
      {tags.length > 0 && (
        <div className="row" style={{ flexWrap: "wrap", gap: 5, marginTop: 10 }}>
          {tags.map((t) => (
            <span key={t.id} className="tag-chip-sm" style={{ color: t.color }}>{t.name}</span>
          ))}
        </div>
      )}
      <div className="tiny muted" style={{ marginTop: 8 }}>{fmt(note.updated_at)}</div>
    </div>
  );
}
