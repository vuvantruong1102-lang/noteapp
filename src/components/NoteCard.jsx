import { useNavigate } from "react-router-dom";

const LABEL = { cong_viec: "Công việc", ca_nhan: "Cá nhân", hoc_tap: "Học tập", tieng_trung: "Tiếng Trung" };
const fmt = (s) => new Date(s).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

export default function NoteCard({ note }) {
  const nav = useNavigate();
  const preview = (note.content || "").slice(0, 160);
  return (
    <div className="card card-pad hover fade-in" onClick={() => nav(`/note/${note.id}`)}
      style={{ display: "flex", flexDirection: "column", minHeight: 130 }}>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <span className={"badge " + note.category}>{LABEL[note.category]}</span>
        {note.pinned && <span title="Đã ghim">📌</span>}
      </div>
      {note.title && <div style={{ fontWeight: 600, marginBottom: 4 }}
        className={note.category === "tieng_trung" ? "zh" : ""}>{note.title}</div>}
      {preview && <div className="muted" style={{ fontSize: 14, flex: 1 }}>{preview}{note.content.length > 160 ? "…" : ""}</div>}
      <div className="tiny muted" style={{ marginTop: 10 }}>{fmt(note.updated_at)}</div>
    </div>
  );
}
