import { useNavigate } from "react-router-dom";

const LABEL = { cong_viec: "Công việc", ca_nhan: "Cá nhân", hoc_tap: "Học tập", tieng_trung: "Tiếng Trung" };

function fmtDate(s) {
  const d = new Date(s);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export default function NoteCard({ note }) {
  const nav = useNavigate();
  const preview = (note.content || "").slice(0, 110);
  return (
    <div className="card card-pad fade-in" onClick={() => nav(`/note/${note.id}`)} style={{ cursor: "pointer" }}>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
        <span className={"badge " + note.category}>{LABEL[note.category]}</span>
        {note.pinned && <span title="Đã ghim">📌</span>}
      </div>
      {note.title && <div style={{ fontWeight: 600, marginBottom: 2 }} className={note.category === "tieng_trung" ? "zh" : ""}>{note.title}</div>}
      {preview && <div className="muted" style={{ fontSize: 14 }}>{preview}{note.content.length > 110 ? "…" : ""}</div>}
      <div className="tiny muted" style={{ marginTop: 8 }}>{fmtDate(note.updated_at)}</div>
    </div>
  );
}
