import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import NoteCard from "../components/NoteCard.jsx";

const FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "cong_viec", label: "Công việc" },
  { key: "ca_nhan", label: "Cá nhân" },
  { key: "hoc_tap", label: "Học tập" },
  { key: "tieng_trung", label: "Tiếng Trung" },
];

export default function Notes() {
  const nav = useNavigate();
  const [notes, setNotes] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("zhnote_notes").select("*")
      .order("pinned", { ascending: false }).order("updated_at", { ascending: false });
    setNotes(data || []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const shown = filter === "all" ? notes : notes.filter((n) => n.category === filter);
  const today = new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Ghi chú</h1>
          <p className="page-sub">{today}</p>
        </div>
        <button className="btn" onClick={() => nav("/note/new")}>+ Ghi chú mới</button>
      </div>

      <div className="chips" style={{ marginBottom: 20 }}>
        {FILTERS.map((f) => (
          <button key={f.key} className={"chip" + (filter === f.key ? " active" : "")}
            onClick={() => setFilter(f.key)}>{f.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="center" style={{ padding: 60 }}><div className="spinner" /></div>
      ) : shown.length === 0 ? (
        <div className="empty">
          <div className="big">📝</div>
          Chưa có ghi chú nào trong mục này.
          <div style={{ marginTop: 14 }}>
            <button className="btn sm" onClick={() => nav("/note/new")}>Viết ghi chú đầu tiên</button>
          </div>
        </div>
      ) : (
        <div className="notes-grid">{shown.map((n) => <NoteCard key={n.id} note={n} />)}</div>
      )}
    </>
  );
}
