import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../context/AuthContext.jsx";
import RichEditor from "../components/RichEditor.jsx";

const CATS = [
  { key: "cong_viec", label: "Công việc" },
  { key: "ca_nhan",   label: "Cá nhân" },
  { key: "hoc_tap",   label: "Học tập" },
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
  const [allTags, setAllTags] = useState([]);
  const [noteTagIds, setNoteTagIds] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("zhnote_tags").select("id, name, color").order("name")
      .then(({ data }) => setAllTags(data || []));
    if (isNew) return;
    supabase.from("zhnote_notes")
      .select("*, zhnote_note_tags(tag_id)").eq("id", id).single()
      .then(({ data }) => {
        if (!data) return nav("/");
        setTitle(data.title || ""); setContent(data.content || "");
        setCategory(data.category); setPinned(data.pinned);
        setNoteTagIds((data.zhnote_note_tags || []).map((nt) => nt.tag_id));
      });
  }, [id]);

  async function save() {
    if (!title.trim() && !content.trim()) return nav("/");
    setBusy(true);
    const row = { title: title.trim(), content, category, pinned };
    let noteId = id;
    if (isNew) {
      const { data } = await supabase.from("zhnote_notes")
        .insert({ ...row, user_id: user.id }).select("id").single();
      noteId = data?.id;
    } else {
      await supabase.from("zhnote_notes").update(row).eq("id", id);
    }
    if (noteId) {
      await supabase.from("zhnote_note_tags").delete().eq("note_id", noteId);
      if (noteTagIds.length > 0) {
        await supabase.from("zhnote_note_tags").insert(
          noteTagIds.map((tid) => ({ note_id: noteId, tag_id: tid, user_id: user.id }))
        );
      }
    }
    setBusy(false); nav("/");
  }

  async function remove() {
    if (!confirm("Xoá ghi chú này?")) return;
    await supabase.from("zhnote_notes").delete().eq("id", id);
    nav("/");
  }

  async function createAndAddTag() {
    const name = newTag.trim();
    if (!name) return;
    const { data } = await supabase.from("zhnote_tags")
      .insert({ user_id: user.id, name }).select("*").single();
    if (data) {
      setAllTags((prev) => [...prev, data]);
      setNoteTagIds((prev) => [...prev, data.id]);
    }
    setNewTag("");
  }

  const selectedTags = allTags.filter((t) => noteTagIds.includes(t.id));
  const availableTags = allTags.filter((t) => !noteTagIds.includes(t.id));

  return (
    <div className="editor-page">
      <div className="editor-bar">
        <button className="btn ghost sm" onClick={() => nav("/")}>← Quay lại</button>
        <div className="row" style={{ gap: 8 }}>
          {!isNew && <button className="btn ghost sm" onClick={remove} style={{ color: "#d4537e" }}>Xoá</button>}
          <button className="btn sm" onClick={save} disabled={busy}>{busy ? "Đang lưu…" : "Lưu"}</button>
        </div>
      </div>

      <div className="editor-card">
        <input className="editor-title" placeholder="Tiêu đề"
          value={title} onChange={(e) => setTitle(e.target.value)} />
        <RichEditor value={content} onChange={setContent} placeholder="Bắt đầu viết…" />
      </div>

      <div className="editor-meta">
        <div className="meta-section">
          <p className="field-label">Nhóm</p>
          <div className="chips">
            {CATS.map((c) => (
              <button key={c.key} className={"chip" + (category === c.key ? " active" : "")}
                onClick={() => setCategory(c.key)}>{c.label}</button>
            ))}
          </div>
        </div>

        <div className="meta-section" style={{ position: "relative" }}>
          <p className="field-label">Thẻ</p>
          <div className="chips">
            {selectedTags.map((t) => (
              <span key={t.id} className="chip active" style={{ background: t.color, borderColor: t.color }}>
                {t.name}
                <button onClick={() => setNoteTagIds((prev) => prev.filter((x) => x !== t.id))}
                  style={{ marginLeft: 6, color: "#fff", lineHeight: 1 }}>×</button>
              </span>
            ))}
            <button className="chip" onClick={() => setPickerOpen((v) => !v)}>+ Thêm thẻ</button>
            {pickerOpen && (
              <div className="tag-popover">
                {availableTags.length > 0 ? (
                  <div className="tag-list">
                    {availableTags.map((t) => (
                      <button key={t.id} className="tag-row"
                        onClick={() => { setNoteTagIds((prev) => [...prev, t.id]); }}>
                        <span style={{ color: t.color }}>🏷</span>
                        <span>{t.name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="ts-empty" style={{ padding: 8 }}>Hết thẻ để chọn.</div>
                )}
                <div className="tag-new">
                  <input className="input" style={{ padding: "7px 10px", fontSize: 13 }}
                    placeholder="Tạo thẻ mới…" value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createAndAddTag()} />
                  <button className="btn sm" onClick={createAndAddTag} disabled={!newTag.trim()}>Tạo</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <label className="row">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
          <span>Ghim lên đầu</span>
        </label>
      </div>
    </div>
  );
}
