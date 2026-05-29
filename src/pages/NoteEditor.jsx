import { useEffect, useRef, useState } from "react";
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
const DEBOUNCE_MS = 800;

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort(), sb = [...b].sort();
  return sa.every((x, i) => x === sb[i]);
}

export default function NoteEditor() {
  const { id: urlId } = useParams();
  const isNew = !urlId;
  const nav = useNavigate();
  const { user } = useAuth();

  // noteId được setter sau lần insert đầu tiên (cho note mới)
  const [noteId, setNoteId] = useState(urlId || null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("ca_nhan");
  const [pinned, setPinned] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const [noteTagIds, setNoteTagIds] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newTag, setNewTag] = useState("");

  const [status, setStatus] = useState("idle"); // idle | saving | saved | error
  const [savedAt, setSavedAt] = useState(null);

  // ===== Refs cho luồng auto-save =====
  const skipSaveRef  = useRef(true);   // không lưu cho tới khi load xong
  const saveTimerRef = useRef(null);   // timer debounce
  const savingRef    = useRef(false);  // đang lưu (chống lưu chồng)
  const queueRef     = useRef(false);  // có lần lưu xếp hàng?
  const stateRef     = useRef({});     // trạng thái mới nhất, đọc trong autoSave

  // Cập nhật stateRef trên mỗi render — autoSave luôn đọc giá trị mới
  stateRef.current = { title, content, category, pinned, noteTagIds, noteId };

  // ===== Load lần đầu =====
  useEffect(() => {
    skipSaveRef.current = true;
    setStatus("idle"); setSavedAt(null);

    async function init() {
      const tagsRes = await supabase.from("zhnote_tags").select("id,name,color").order("name");
      setAllTags(tagsRes.data || []);

      if (!isNew) {
        const { data } = await supabase.from("zhnote_notes")
          .select("*, zhnote_note_tags(tag_id)").eq("id", urlId).single();
        if (!data) { nav("/"); return; }
        setTitle(data.title || "");
        setContent(data.content || "");
        setCategory(data.category);
        setPinned(data.pinned);
        setNoteTagIds((data.zhnote_note_tags || []).map(nt => nt.tag_id));
        setNoteId(urlId);
      }
      // Bật auto-save sau khi setState đã thấm vào render (next macrotask)
      setTimeout(() => { skipSaveRef.current = false; }, 0);
    }
    init();
  }, [urlId]);

  // ===== Hẹn lưu mỗi khi state thay đổi =====
  useEffect(() => {
    if (skipSaveRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(autoSave, DEBOUNCE_MS);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, category, pinned, noteTagIds]);

  async function autoSave() {
    // Đã có lần lưu đang chạy -> xếp hàng, lần kế tiếp sẽ tự kích hoạt
    if (savingRef.current) { queueRef.current = true; return; }

    const s = stateRef.current;
    // Note MỚI mà rỗng cả title lẫn content -> không tạo row rác
    if (!s.noteId && !s.title.trim() && !s.content.trim()) {
      setStatus("idle"); return;
    }

    savingRef.current = true;
    setStatus("saving");
    try {
      const row = { title: s.title.trim(), content: s.content, category: s.category, pinned: s.pinned };
      let currentId = s.noteId;

      if (!currentId) {
        const { data, error } = await supabase.from("zhnote_notes")
          .insert({ ...row, user_id: user.id }).select("id").single();
        if (error) throw error;
        currentId = data?.id;
        if (currentId) {
          setNoteId(currentId);
          stateRef.current.noteId = currentId;
          // Đổi URL ngầm — F5 sẽ vào đúng ghi chú này
          window.history.replaceState(null, "", `/note/${currentId}`);
        }
      } else {
        const { error } = await supabase.from("zhnote_notes").update(row).eq("id", currentId);
        if (error) throw error;
      }

      // Sync thẻ: xoá hết rồi thêm lại (đơn giản, đủ nhanh cho cá nhân)
      if (currentId) {
        await supabase.from("zhnote_note_tags").delete().eq("note_id", currentId);
        if (s.noteTagIds.length > 0) {
          await supabase.from("zhnote_note_tags").insert(
            s.noteTagIds.map(tid => ({ note_id: currentId, tag_id: tid, user_id: user.id }))
          );
        }
      }

      setStatus("saved");
      setSavedAt(new Date());
    } catch (e) {
      console.error("autosave error", e);
      setStatus("error");
    } finally {
      savingRef.current = false;
    }

    // Chạy lần lưu đã xếp hàng (state có thể đã đổi trong lúc đang lưu)
    if (queueRef.current) {
      queueRef.current = false;
      autoSave();
    }
  }

  async function goBack() {
    // Huỷ debounce, đợi save đang chạy (nếu có) hoàn tất, rồi flush 1 lần cuối
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
    while (savingRef.current) await new Promise(r => setTimeout(r, 50));
    await autoSave();
    nav("/");
  }

  async function remove() {
    if (!confirm("Xoá ghi chú này?")) return;
    if (noteId) await supabase.from("zhnote_notes").delete().eq("id", noteId);
    nav("/");
  }

  async function createAndAddTag() {
    const name = newTag.trim();
    if (!name) return;
    const { data } = await supabase.from("zhnote_tags")
      .insert({ user_id: user.id, name }).select("*").single();
    if (data) {
      setAllTags(prev => [...prev, data]);
      setNoteTagIds(prev => [...prev, data.id]);
    }
    setNewTag("");
  }

  const selectedTags = allTags.filter(t => noteTagIds.includes(t.id));
  const availableTags = allTags.filter(t => !noteTagIds.includes(t.id));

  return (
    <div className="editor-page">
      <div className="editor-bar">
        <button className="btn ghost sm" onClick={goBack}>← Quay lại</button>
        <div className="row" style={{ gap: 14 }}>
          <StatusLabel status={status} savedAt={savedAt} />
          {noteId && (
            <button className="btn ghost sm" onClick={remove} style={{ color: "#c2185b" }}>Xoá</button>
          )}
        </div>
      </div>

      <div className="editor-card">
        <input className="editor-title" placeholder="Tiêu đề"
          value={title} onChange={(e) => setTitle(e.target.value)} />
        <RichEditor value={content} onChange={setContent} placeholder="Bắt đầu viết… (tự động lưu)" />
      </div>

      <div className="editor-meta">
        <div className="meta-section">
          <p className="field-label">Nhóm</p>
          <div className="chips">
            {CATS.map(c => (
              <button key={c.key} className={"chip" + (category === c.key ? " active" : "")}
                onClick={() => setCategory(c.key)}>{c.label}</button>
            ))}
          </div>
        </div>

        <div className="meta-section" style={{ position: "relative" }}>
          <p className="field-label">Thẻ</p>
          <div className="chips">
            {selectedTags.map(t => (
              <span key={t.id} className="chip active" style={{ background: t.color, borderColor: t.color }}>
                {t.name}
                <button onClick={() => setNoteTagIds(prev => prev.filter(x => x !== t.id))}
                  style={{ marginLeft: 6, color: "#fff", lineHeight: 1 }}>×</button>
              </span>
            ))}
            <button className="chip" onClick={() => setPickerOpen(v => !v)}>+ Thêm thẻ</button>
            {pickerOpen && (
              <div className="tag-popover">
                {availableTags.length > 0 ? (
                  <div className="tag-list">
                    {availableTags.map(t => (
                      <button key={t.id} className="tag-row"
                        onClick={() => setNoteTagIds(prev => [...prev, t.id])}>
                        <span style={{ color: t.color }}>🏷</span><span>{t.name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="nav-empty" style={{ padding: 8 }}>Hết thẻ để chọn.</div>
                )}
                <div className="tag-new">
                  <input className="input" style={{ padding: "7px 10px", fontSize: 13 }}
                    placeholder="Tạo thẻ mới…" value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && createAndAddTag()} />
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

function StatusLabel({ status, savedAt }) {
  if (status === "saving") return <span className="muted tiny">⌛ Đang lưu…</span>;
  if (status === "error")  return <span className="tiny" style={{ color: "#c2185b" }}>⚠ Lưu thất bại — sẽ thử lại khi bạn gõ tiếp</span>;
  if (status === "saved" && savedAt) {
    const t = savedAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    return <span className="muted tiny" style={{ color: "var(--accent-700)" }}>✓ Đã lưu lúc {t}</span>;
  }
  return null;
}
