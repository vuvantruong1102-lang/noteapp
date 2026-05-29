import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../context/AuthContext.jsx";

const CATS = [
  { key: "cong_viec", label: "Công việc" },
  { key: "ca_nhan", label: "Cá nhân" },
  { key: "hoc_tap", label: "Học tập" },
  { key: "tieng_trung", label: "Tiếng Trung" },
];

export default function NoteEditor() {
  const { id } = useParams();
  const isNew = !id;
  const nav = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("ca_nhan");
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isNew) return;
    supabase.from("zhnote_notes").select("*").eq("id", id).single().then(({ data }) => {
      if (!data) return nav("/");
      setTitle(data.title || ""); setContent(data.content || "");
      setCategory(data.category); setPinned(data.pinned);
    });
  }, [id]);

  async function save() {
    if (!title.trim() && !content.trim()) return nav("/");
    setBusy(true);
    const row = { title: title.trim(), content: content.trim(), category, pinned };
    if (isNew) await supabase.from("zhnote_notes").insert({ ...row, user_id: user.id });
    else await supabase.from("zhnote_notes").update(row).eq("id", id);
    setBusy(false);
    nav("/");
  }

  async function remove() {
    if (!confirm("Xoá ghi chú này?")) return;
    await supabase.from("zhnote_notes").delete().eq("id", id);
    nav("/");
  }

  return (
    <div className="screen stack" style={{ paddingTop: 14 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <button className="btn ghost sm" onClick={() => nav("/")}>← Huỷ</button>
        <div className="row" style={{ gap: 8 }}>
          {!isNew && <button className="btn ghost sm" onClick={remove} style={{ color: "#d4537e" }}>Xoá</button>}
          <button className="btn sm" onClick={save} disabled={busy}>{busy ? "…" : "Lưu"}</button>
        </div>
      </div>

      <input className="input" style={{ fontSize: 18, fontWeight: 600, border: "none", padding: "8px 2px" }}
        placeholder="Tiêu đề" value={title} onChange={(e) => setTitle(e.target.value)} />

      <textarea className="textarea" style={{ border: "none", minHeight: 220, padding: "0 2px" }}
        placeholder="Nội dung ghi chú…" value={content} onChange={(e) => setContent(e.target.value)} />

      <div className="divider" />

      <p className="field-label">Nhóm</p>
      <div className="chips">
        {CATS.map((c) => (
          <button key={c.key} className={"chip" + (category === c.key ? " active" : "")}
            onClick={() => setCategory(c.key)}>{c.label}</button>
        ))}
      </div>

      <label className="row" style={{ marginTop: 6 }}>
        <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
        <span>Ghim lên đầu</span>
      </label>
    </div>
  );
}
