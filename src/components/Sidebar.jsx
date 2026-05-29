import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../context/AuthContext.jsx";
import { exportBackup } from "../lib/backup.js";

const CATS = [
  { key: "all",         label: "Tất cả",       ico: "📋" },
  { key: "cong_viec",   label: "Công việc",    ico: "💼" },
  { key: "ca_nhan",     label: "Cá nhân",      ico: "🏠" },
  { key: "hoc_tap",     label: "Học tập",      ico: "📚" },
  { key: "tieng_trung", label: "Tiếng Trung",  ico: "🏮" },
];
const TOOLS = [
  { to: "/zh",        label: "Tra Tiếng Trung", ico: "🀄" },
  { to: "/translate", label: "Dịch câu",        ico: "🔤" },
];

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const loc = useLocation();
  const [params] = useSearchParams();
  const cat = params.get("cat");
  const tag = params.get("tag");
  const isNotes = loc.pathname === "/";

  const [tags, setTags] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [backingUp, setBackingUp] = useState(false);

  async function loadTags() {
    const { data } = await supabase.from("zhnote_tags").select("id,name,color").order("name");
    setTags(data || []);
  }
  useEffect(() => { loadTags(); }, []);

  async function createTag() {
    const name = newName.trim();
    if (!name) return;
    await supabase.from("zhnote_tags").insert({ user_id: user.id, name });
    setNewName(""); setCreating(false); loadTags();
  }
  async function deleteTag(id, e) {
    e.preventDefault(); e.stopPropagation();
    if (!confirm("Xoá thẻ này khỏi mọi ghi chú?")) return;
    await supabase.from("zhnote_tags").delete().eq("id", id);
    loadTags();
  }

  async function doBackup() {
    setBackingUp(true);
    try { await exportBackup(user); } finally { setBackingUp(false); }
  }

  const catActive = (k) => isNotes && ((k === "all" && !cat && !tag) || (k !== "all" && cat === k));
  const tagActive = (id) => isNotes && tag === id;

  return (
    <aside className="sidebar">
      <div className="sb-scroll">
        <div className="brand">
          <span className="logo">🀄</span>
          <span className="name">VTNotes</span>
        </div>

        <div className="sb-section">
          <div className="sb-head"><span>Ghi chú</span></div>
          {CATS.map((c) => (
            <Link key={c.key}
              to={c.key === "all" ? "/" : `/?cat=${c.key}`}
              className={"sb-item" + (catActive(c.key) ? " active" : "")}>
              <span className="sb-ico">{c.ico}</span><span>{c.label}</span>
            </Link>
          ))}
        </div>

        <div className="sb-section">
          <div className="sb-head">
            <span>Thẻ</span>
            <button className="sb-add" onClick={() => setCreating(true)} title="Tạo thẻ">+</button>
          </div>
          {creating && (
            <input autoFocus className="sb-input" value={newName} placeholder="Tên thẻ…"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createTag();
                if (e.key === "Escape") { setCreating(false); setNewName(""); }
              }}
              onBlur={() => { if (!newName.trim()) setCreating(false); }} />
          )}
          {!creating && tags.length === 0 && <div className="sb-empty">Bấm + để tạo thẻ.</div>}
          {tags.map((t) => (
            <Link key={t.id} to={`/?tag=${t.id}`}
              className={"sb-item" + (tagActive(t.id) ? " active" : "")}>
              <span className="sb-ico" style={{ color: t.color }}>🏷</span>
              <span style={{ flex: 1 }}>{t.name}</span>
              <span className="sb-del" onClick={(e) => deleteTag(t.id, e)}>×</span>
            </Link>
          ))}
        </div>

        <div className="sb-section">
          <div className="sb-head"><span>Công cụ</span></div>
          {TOOLS.map((t) => (
            <Link key={t.to} to={t.to}
              className={"sb-item" + (loc.pathname === t.to ? " active" : "")}>
              <span className="sb-ico">{t.ico}</span><span>{t.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="sb-bottom">
        <button className="sb-item" onClick={doBackup} disabled={backingUp}>
          <span className="sb-ico">💾</span>
          <span>{backingUp ? "Đang tải…" : "Sao lưu dữ liệu"}</span>
        </button>
        <button className="sb-item signout" onClick={() => signOut()}>
          <span className="sb-ico">⏻</span><span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
