import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../context/AuthContext.jsx";
import NoteCard from "../components/NoteCard.jsx";

const FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "cong_viec", label: "Công việc" },
  { key: "ca_nhan", label: "Cá nhân" },
  { key: "hoc_tap", label: "Học tập" },
  { key: "tieng_trung", label: "Tiếng Trung" },
];

export default function Notes() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [notes, setNotes] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("zhnote_notes")
      .select("*")
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false });
    setNotes(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const shown = filter === "all" ? notes : notes.filter((n) => n.category === filter);
  const today = new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <>
      <header className="app-header">
        <div>
          <p className="date">{today}</p>
          <h1 className="screen-title">Ghi chú</h1>
        </div>
        <button className="navitem" style={{ flex: "none" }} onClick={() => signOut()} title="Đăng xuất">
          <span className="ico">⏻</span>
        </button>
      </header>

      <div className="screen stack">
        {/* Ô viết nhanh */}
        <div className="card card-pad row" style={{ color: "var(--text-mute)", cursor: "pointer" }}
          onClick={() => nav("/note/new")}>
          <span style={{ fontSize: 18 }}>✏️</span>
          <span>Viết gì đó… chọn nhóm sau</span>
        </div>

        {/* Lọc theo nhóm */}
        <div className="chips" style={{ overflowX: "auto", flexWrap: "nowrap", paddingBottom: 2 }}>
          {FILTERS.map((f) => (
            <button key={f.key}
              className={"chip" + (filter === f.key ? " active" : "")}
              onClick={() => setFilter(f.key)}>{f.label}</button>
          ))}
        </div>

        {/* Danh sách */}
        {loading ? (
          <div className="center" style={{ padding: 40 }}><div className="spinner" /></div>
        ) : shown.length === 0 ? (
          <div className="empty">Chưa có ghi chú nào.<br />Bấm ô phía trên để viết.</div>
        ) : (
          <div className="stack">{shown.map((n) => <NoteCard key={n.id} note={n} />)}</div>
        )}
      </div>

      {/* Nút + nổi */}
      <button className="btn" onClick={() => nav("/note/new")}
        style={{ position: "fixed", right: "max(16px, calc(50% - 240px + 16px))", bottom: 92,
          width: 54, height: 54, borderRadius: 27, fontSize: 26, zIndex: 15, boxShadow: "var(--shadow)" }}>
        +
      </button>
    </>
  );
}
