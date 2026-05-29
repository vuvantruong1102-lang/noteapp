import { useNavigate } from "react-router-dom";

const LABEL = { cong_viec: "Công việc", ca_nhan: "Cá nhân", hoc_tap: "Học tập", tieng_trung: "Tiếng Trung" };
const fmt = (s) => new Date(s).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

// Bỏ tag HTML khỏi nội dung để preview gọn (vì content giờ là HTML).
function stripHtml(html) {
  if (!html) return "";
  const t = document.createElement("div");
  t.innerHTML = html;
  return (t.textContent || "").replace(/\s+/g, " ").trim();
}

export default function NoteCard({ note }) {
  const nav = useNavigate();
  const text = stripHtml(note.content);
  const preview = text.slice(0, 160);
  const tags = (note.zhnote_note_tags || []).map((nt) => nt.zhnote_tags).filter(Boolean);

  return (
    <div className="card card-pad hover fade-in" onClick={() => nav(`/note/${note.id}`)}
      style={{ display: "flex", flexDirection: "column", minHeight: 130 }}>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <span className={"badge " + note.category}>{LABEL[note.category]}</span>
        {note.pinned && <span title="Đã ghim">📌</span>}
      </div>
      {note.title && <div style={{ fontWeight: 600, marginBottom: 4 }}
        className={note.category === "tieng_trung" ? "zh" : ""}>{note.title}</div>}
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
