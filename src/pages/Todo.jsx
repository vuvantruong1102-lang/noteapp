import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../context/AuthContext.jsx";

const pad = (n) => String(n).padStart(2, "0");
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
function dm(iso) { if (!iso) return ""; const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; }
function dayKey(iso) { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function sortActive(a, b) {
  return (a.position || 0) - (b.position || 0) || (a.created_at || "").localeCompare(b.created_at || "");
}
function groupLabel(k) {
  if (k === "unknown") return "Không rõ ngày";
  const today = dayKey(new Date().toISOString());
  const y = new Date(); y.setDate(y.getDate() - 1);
  const [Y, M, D] = k.split("-");
  const dmy = `${D}/${M}/${Y}`;
  if (k === today) return `Hôm nay · ${dmy}`;
  if (k === dayKey(y.toISOString())) return `Hôm qua · ${dmy}`;
  return dmy;
}

export default function Todo() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [openDays, setOpenDays] = useState({});
  const [editing, setEditing] = useState(null);
  const [editText, setEditText] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("zhnote_todos").select("*")
      .order("position", { ascending: true }).order("created_at", { ascending: true });
    setItems(data || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const active = items.filter(i => !i.done).sort(sortActive);
  const doneItems = items.filter(i => i.done);

  // Nhóm việc đã hoàn thành theo NGÀY hoàn thành
  const groups = {};
  doneItems.forEach(it => {
    const k = it.completed_at ? dayKey(it.completed_at) : "unknown";
    (groups[k] = groups[k] || []).push(it);
  });
  Object.keys(groups).forEach(k =>
    groups[k].sort((a, b) => (b.completed_at || "").localeCompare(a.completed_at || "")));
  const groupKeys = Object.keys(groups).sort((a, b) =>
    a === "unknown" ? 1 : b === "unknown" ? -1 : b.localeCompare(a));

  async function add() {
    const t = title.trim(); if (!t) return;
    setTitle("");
    const pos = items.length ? Math.max(...items.map(x => x.position || 0)) + 1 : 0;
    const { data } = await supabase.from("zhnote_todos")
      .insert({ user_id: user.id, title: t, position: pos }).select().single();
    if (data) setItems(prev => [...prev, data]);
  }
  async function toggle(it) {
    const isDone = !it.done;
    const completed_at = isDone ? new Date().toISOString() : null;
    setItems(prev => prev.map(x => x.id === it.id ? { ...x, done: isDone, completed_at } : x));
    await supabase.from("zhnote_todos").update({ done: isDone, completed_at }).eq("id", it.id);
  }
  async function remove(it) {
    setItems(prev => prev.filter(x => x.id !== it.id));
    await supabase.from("zhnote_todos").delete().eq("id", it.id);
  }
  function startEdit(it) { setEditing(it.id); setEditText(it.title); }
  async function saveEdit(it) {
    const t = editText.trim(); setEditing(null);
    if (!t || t === it.title) return;
    setItems(prev => prev.map(x => x.id === it.id ? { ...x, title: t } : x));
    await supabase.from("zhnote_todos").update({ title: t }).eq("id", it.id);
  }

  const now = new Date();
  const header = `Hôm nay, ${cap(now.toLocaleDateString("vi-VN", { weekday: "long" }))}, ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

  return (
    <div className="page todo-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Việc cần làm</h1>
          <p className="todo-head-date">{header}</p>
        </div>
      </div>

      <div className="row">
        <input className="input" value={title} placeholder="Thêm việc cần làm…"
          onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
        <button className="btn" onClick={add} disabled={!title.trim()}>Thêm</button>
      </div>

      {loading ? (
        <div className="card card-pad muted" style={{ marginTop: 14 }}>Đang tải…</div>
      ) : (
        <>
          <div className="card" style={{ marginTop: 14 }}>
            {active.length === 0 ? (
              <div className="todo-list muted tiny">Chưa có việc nào cần làm.</div>
            ) : (
              <div className="todo-list">
                {active.map(it => (
                  <div key={it.id} className="todo-row">
                    <button className="todo-check" onClick={() => toggle(it)} aria-label="Hoàn thành" />
                    {editing === it.id ? (
                      <input className="input todo-edit" autoFocus value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveEdit(it); if (e.key === "Escape") setEditing(null); }}
                        onBlur={() => saveEdit(it)} />
                    ) : (
                      <span className="todo-title" onClick={() => startEdit(it)} title="Bấm để sửa">{it.title}</span>
                    )}
                    <span className="todo-date">{dm(it.created_at)}</span>
                    <button className="todo-del" onClick={() => remove(it)} title="Xoá">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card todo-done-box" style={{ marginTop: 10 }}>
            <button className="todo-done-head" onClick={() => setShowDone(v => !v)}>
              <span className="todo-day-caret">{showDone ? "▾" : "▸"}</span>
              <span style={{ flex: 1 }}>Việc đã hoàn thành</span>
              <span className="todo-day-count">{doneItems.length}</span>
            </button>
            {showDone && (
              <div className="todo-list todo-cwrap" style={{ borderTop: "1px solid var(--border)" }}>
                {doneItems.length === 0 ? (
                  <div className="muted tiny">Chưa có việc nào hoàn thành.</div>
                ) : groupKeys.map(k => {
                  const list = groups[k];
                  const isOpen = !!openDays[k];
                  return (
                    <div key={k} className="todo-cgroup">
                      <button className="todo-cday-head" onClick={() => setOpenDays(o => ({ ...o, [k]: !o[k] }))}>
                        <span className="todo-day-caret">{isOpen ? "▾" : "▸"}</span>
                        <span style={{ flex: 1 }}>{groupLabel(k)}</span>
                        <span className="todo-day-count">{list.length}</span>
                      </button>
                      {isOpen && (
                        <div className="todo-cday-body">
                          {list.map(it => (
                            <div key={it.id} className="todo-row done">
                              <button className="todo-check on" onClick={() => toggle(it)} aria-label="Bỏ hoàn thành">✓</button>
                              <span className="todo-title">{it.title}</span>
                              <button className="todo-del" onClick={() => remove(it)} title="Xoá">×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
