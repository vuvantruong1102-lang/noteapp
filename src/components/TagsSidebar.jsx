import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../context/AuthContext.jsx";

const CATS = [
  { key: "all",         label: "Tất cả ghi chú", ico: "📋" },
  { key: "cong_viec",   label: "Công việc",      ico: "💼" },
  { key: "ca_nhan",     label: "Cá nhân",        ico: "🏠" },
  { key: "hoc_tap",     label: "Học tập",        ico: "📚" },
  { key: "tieng_trung", label: "Tiếng Trung",    ico: "🀄" },
];

export default function TagsSidebar({ selected, onSelect }) {
  const { user } = useAuth();
  const [tags, setTags] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  async function load() {
    const { data } = await supabase.from("zhnote_tags")
      .select("id, name, color").order("name");
    setTags(data || []);
  }
  useEffect(() => { load(); }, []);

  async function createTag() {
    const name = newName.trim();
    if (!name) return;
    await supabase.from("zhnote_tags").insert({ user_id: user.id, name });
    setNewName(""); setCreating(false); load();
  }
  async function deleteTag(id, e) {
    e.stopPropagation();
    if (!confirm("Xoá thẻ này khỏi mọi ghi chú?")) return;
    await supabase.from("zhnote_tags").delete().eq("id", id);
    if (selected?.type === "tag" && selected.value === id) onSelect({ type: "all" });
    load();
  }

  const isSel = (type, value) =>
    (type === "all" && (!selected || selected.type === "all")) ||
    (selected?.type === type && selected?.value === value);

  return (
    <aside className="tags-sidebar">
      <div className="ts-section">
        {CATS.map((c) => (
          <button key={c.key} className={"ts-item" + (isSel(c.key === "all" ? "all" : "category", c.key) ? " active" : "")}
            onClick={() => onSelect(c.key === "all" ? { type: "all" } : { type: "category", value: c.key })}>
            <span className="ts-ico">{c.ico}</span><span>{c.label}</span>
          </button>
        ))}
      </div>

      <div className="ts-divider" />

      <div className="ts-section">
        <div className="ts-head">
          <span>Thẻ</span>
          <button className="ts-add" onClick={() => setCreating(true)} title="Thêm thẻ">+</button>
        </div>
        {creating && (
          <div className="ts-new">
            <input autoFocus className="input" style={{ padding: "7px 10px", fontSize: 13 }}
              value={newName} placeholder="Tên thẻ…"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createTag();
                if (e.key === "Escape") { setCreating(false); setNewName(""); }
              }} onBlur={() => { if (!newName.trim()) setCreating(false); }} />
          </div>
        )}
        {!creating && tags.length === 0 && <div className="ts-empty">Chưa có thẻ. Bấm + để tạo.</div>}
        {tags.map((t) => (
          <button key={t.id} className={"ts-item" + (isSel("tag", t.id) ? " active" : "")}
            onClick={() => onSelect({ type: "tag", value: t.id, name: t.name })}>
            <span className="ts-ico" style={{ color: t.color }}>🏷</span>
            <span style={{ flex: 1, textAlign: "left" }}>{t.name}</span>
            <span className="ts-del" onClick={(e) => deleteTag(t.id, e)}>×</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
