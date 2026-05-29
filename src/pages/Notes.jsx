import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import NoteCard from "../components/NoteCard.jsx";

const CAT_LABEL = {
  cong_viec: "Công việc", ca_nhan: "Cá nhân",
  hoc_tap: "Học tập", tieng_trung: "Tiếng Trung",
};

export default function Notes() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const cat = params.get("cat");
  const tag = params.get("tag");

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tagInfo, setTagInfo] = useState(null);

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
        <button className="btn" onClick={() => nav("/note/new")}>+ Ghi chú mới</button>
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
    </div>
  );
}
