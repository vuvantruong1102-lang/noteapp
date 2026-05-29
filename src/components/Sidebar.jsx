import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../context/AuthContext.jsx";
import { exportBackup } from "../lib/backup.js";

// ===== Icons (inline SVG, nét mảnh) =====
const stroke = { stroke: "currentColor", fill: "none", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" };
const IconBook = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
);
const IconType = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}><path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
);
const IconGlobe = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/></svg>
);
const IconDownload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
);
const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
);

// Mỗi nhóm có 1 màu chấm tròn riêng (lấy từ CSS variable)
const CATS = [
  { key: "all",         label: "Tất cả",       color: "#8a8e96" },
  { key: "cong_viec",   label: "Công việc",    color: "#2563eb" },
  { key: "ca_nhan",     label: "Cá nhân",      color: "#db2777" },
  { key: "hoc_tap",     label: "Học tập",      color: "#b97714" },
  { key: "tieng_trung", label: "Tiếng Trung",  color: "#00a82d" },
];
const TOOLS = [
  { to: "/zh",           label: "Tra Tiếng Trung",  Icon: IconBook },
  { to: "/translate",    label: "Dịch tiếng Trung", Icon: IconType },
  { to: "/translate-en", label: "Dịch tiếng Anh",   Icon: IconGlobe },
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
      <div className="nav-scroll">
        <div className="brand">
          <span className="brand-mark">V</span>
          <span className="brand-name">VTNotes</span>
        </div>

        <div className="nav-section">
          <div className="nav-head"><span>Ghi chú</span></div>
          {CATS.map((c) => (
            <Link key={c.key}
              to={c.key === "all" ? "/" : `/?cat=${c.key}`}
              className={"nav-item" + (catActive(c.key) ? " active" : "")}>
              <span className="nav-dot" style={{ background: c.color }}></span>
              <span className="nav-label">{c.label}</span>
            </Link>
          ))}
        </div>

        <div className="nav-section">
          <div className="nav-head">
            <span>Thẻ</span>
            <button className="nav-add" onClick={() => setCreating(true)} title="Tạo thẻ">+</button>
          </div>
          {creating && (
            <input autoFocus className="nav-input" value={newName} placeholder="Tên thẻ…"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createTag();
                if (e.key === "Escape") { setCreating(false); setNewName(""); }
              }}
              onBlur={() => { if (!newName.trim()) setCreating(false); }} />
          )}
          {!creating && tags.length === 0 && <div className="nav-empty">Bấm + để tạo thẻ.</div>}
          {tags.map((t) => (
            <Link key={t.id} to={`/?tag=${t.id}`}
              className={"nav-item" + (tagActive(t.id) ? " active" : "")}>
              <span className="nav-dot" style={{ background: t.color || "#00a82d" }}></span>
              <span className="nav-label">{t.name}</span>
              <span className="nav-del" onClick={(e) => deleteTag(t.id, e)}>×</span>
            </Link>
          ))}
        </div>

        <div className="nav-section">
          <div className="nav-head"><span>Công cụ</span></div>
          {TOOLS.map(({ to, label, Icon }) => (
            <Link key={to} to={to}
              className={"nav-item" + (loc.pathname === to ? " active" : "")}>
              <span className="nav-ico"><Icon /></span>
              <span className="nav-label">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="nav-bottom">
        <button className="nav-item" onClick={doBackup} disabled={backingUp}>
          <span className="nav-ico"><IconDownload /></span>
          <span className="nav-label">{backingUp ? "Đang tải…" : "Sao lưu dữ liệu"}</span>
        </button>
        <button className="nav-item signout" onClick={() => signOut()}>
          <span className="nav-ico"><IconLogout /></span>
          <span className="nav-label">Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
