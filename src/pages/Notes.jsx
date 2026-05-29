import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import NoteCard from "../components/NoteCard.jsx";

const CAT_LABEL = {
  cong_viec: "Công việc", ca_nhan: "Cá nhân",
  hoc_tap: "Học tập", tieng_trung: "Tiếng Trung",
};
const VIEW_KEY = "vtnotes-notes-view";

const IconGrid = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const IconList = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>
  </svg>
);

export default function Notes() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const cat = params.get("cat");
  const tag = params.get("tag");

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tagInfo, setTagInfo] = useState(null);
  const [view, setView] = useState(() => {
    try { return localStorage.getItem(VIEW_KEY) || "grid"; } catch { return "grid"; }
  });

  function changeView(v) {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch {}
  }

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("zhnote_notes")
      .select("*, zhnote_note_tags(zhnote_tags(id, name, color))")
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false });
    setNotes(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (tag) {
      supabase.from("zhnote_tags").select("name").eq("id", tag).maybeSingle()
        .then(({ data }) => setTagInfo(data));
    } else setTagInfo(null);
  }, [tag]);

  const shown = notes.filter((n) => {
    if (cat) return n.category === cat;
    if (tag) return (n.zhnote_note_tags || []).some((nt) => nt.zhnote_tags?.id === tag);
    return true;
  });

  const today = new Date().toLocaleDateString("vi-VN",
    { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const title =
    cat ? CAT_LABEL[cat] || "Ghi chú" :
    tag ? `Thẻ: ${tagInfo?.name || "…"}` :
    "Tất cả ghi chú";

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-sub">{today} · {shown.length} ghi chú</p>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <div className="view-toggle" title="Đổi cách hiển thị">
            <button className={view === "grid" ? "active" : ""} onClick={() => changeView("grid")} title="Dạng lưới">
              <IconGrid />
            </button>
            <button className={view === "list" ? "active" : ""} onClick={() => changeView("list")} title="Dạng danh sách">
              <IconList />
            </button>
          </div>
          <button className="btn" onClick={() => nav("/note/new")}>+ Ghi chú mới</button>
        </div>
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
      ) : view === "grid" ? (
        <div className="notes-grid">{shown.map((n) => <NoteCard key={n.id} note={n} mode="grid" />)}</div>
      ) : (
        <div className="notes-list">{shown.map((n) => <NoteCard key={n.id} note={n} mode="list" />)}</div>
      )}
    </div>
  );
}
