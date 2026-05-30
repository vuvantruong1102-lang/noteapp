import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../context/AuthContext.jsx";

function toDateStr(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function label(str) {
  const now = new Date();
  const today = toDateStr(now);
  const y = new Date(now); y.setDate(y.getDate() - 1);
  const t = new Date(now); t.setDate(t.getDate() + 1);
  if (str === today) return "Hôm nay";
  if (str === toDateStr(y)) return "Hôm qua";
  if (str === toDateStr(t)) return "Ngày mai";
  return new Date(str + "T00:00:00").toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" });
}
function sortItems(arr) {
  return [...arr].sort((a, b) =>
    (a.done ? 1 : 0) - (b.done ? 1 : 0) ||
    (b.important ? 1 : 0) - (a.important ? 1 : 0) ||
    (a.position || 0) - (b.position || 0) ||
    (a.created_at || "").localeCompare(b.created_at || ""));
}

export default function Todo() {
  const { user } = useAuth();
  const todayStr = toDateStr(new Date());
  const [date, setDate] = useState(todayStr);
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [overdue, setOverdue] = useState(0);
  const [editing, setEditing] = useState(null);
  const [editText, setEditText] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("zhnote_todos").select("*").eq("due_date", date);
    setItems(sortItems(data || []));
    if (date === todayStr) {
      const { count } = await supabase.from("zhnote_todos")
        .select("id", { count: "exact", head: true })
        .lt("due_date", todayStr).eq("done", false);
      setOverdue(count || 0);
    } else setOverdue(0);
  }, [date, todayStr]);

  useEffect(() => { load(); }, [load]);

  async function add() {
    const t = title.trim(); if (!t) return;
    setTitle("");
    const pos = items.length ? Math.max(...items.map(i => i.position || 0)) + 1 : 0;
    const { data } = await supabase.from("zhnote_todos")
      .insert({ user_id: user.id, title: t, due_date: date, position: pos }).select().single();
    if (data) setItems(prev => sortItems([...prev, data]));
  }
  async function toggle(it) {
    const done = !it.done;
    setItems(prev => sortItems(prev.map(x => x.id === it.id ? { ...x, done } : x)));
    await supabase.from("zhnote_todos").update({ done, completed_at: done ? new Date().toISOString() : null }).eq("id", it.id);
  }
  async function star(it) {
    const important = !it.important;
    setItems(prev => sortItems(prev.map(x => x.id === it.id ? { ...x, important } : x)));
    await supabase.from("zhnote_todos").update({ important }).eq("id", it.id);
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
  async function carryOver() {
    await supabase.from("zhnote_todos").update({ due_date: todayStr }).lt("due_date", todayStr).eq("done", false);
    load();
  }
  async function clearDone() {
    const ids = items.filter(i => i.done).map(i => i.id);
    if (!ids.length) return;
    setItems(prev => prev.filter(i => !i.done));
    await supabase.from("zhnote_todos").delete().in("id", ids);
  }
  function shiftDay(n) {
    const d = new Date(date + "T00:00:00"); d.setDate(d.getDate() + n); setDate(toDateStr(d));
  }

  const doneCount = items.filter(i => i.done).length;
  const pct = items.length ? Math.round(doneCount / items.length * 100) : 0;

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="page-head">
        <div>
          <h1 className="page-title">Việc cần làm</h1>
          <p className="page-sub">Ghi việc theo ngày, hoàn thành thì tick. Việc chưa xong có thể dồn về hôm nay.</p>
        </div>
      </div>

      <div className="stack">
        <div className="todo-datebar card">
          <button className="btn ghost sm" onClick={() => shiftDay(-1)}>‹</button>
          <div className="todo-date">
            <b>{label(date)}</b>
            {date !== todayStr && <button className="btn ghost sm" onClick={() => setDate(todayStr)}>Về hôm nay</button>}
          </div>
          <button className="btn ghost sm" onClick={() => shiftDay(1)}>›</button>
        </div>

        <div className="row">
          <input className="input" value={title} placeholder="Thêm việc cần làm…"
            onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
          <button className="btn" onClick={add} disabled={!title.trim()}>Thêm</button>
        </div>

        {overdue > 0 && (
          <div className="card card-pad todo-overdue">
            <span>Có <b>{overdue}</b> việc chưa xong từ trước.</span>
            <button className="btn sm" onClick={carryOver}>Dồn về hôm nay</button>
          </div>
        )}

        {items.length > 0 && (
          <div className="todo-progress">
            <div className="todo-progress-bar"><span style={{ width: pct + "%" }} /></div>
            <span className="tiny muted">{doneCount}/{items.length} xong</span>
          </div>
        )}

        {items.length === 0 ? (
          <div className="empty"><div className="big">✓</div>Chưa có việc nào cho ngày này.</div>
        ) : (
          <div className="card">
            {items.map((it, i) => (
              <div key={it.id} className={"todo-row" + (it.done ? " done" : "")}
                style={{ borderTop: i ? "1px solid var(--border)" : "none" }}>
                <button className={"todo-check" + (it.done ? " on" : "")} onClick={() => toggle(it)} aria-label="Hoàn thành">
                  {it.done ? "✓" : ""}
                </button>
                {editing === it.id ? (
                  <input className="input todo-edit" autoFocus value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") saveEdit(it); if (e.key === "Escape") setEditing(null); }}
                    onBlur={() => saveEdit(it)} />
                ) : (
                  <span className="todo-title" onClick={() => startEdit(it)} title="Bấm để sửa">{it.title}</span>
                )}
                <button className={"todo-star" + (it.important ? " on" : "")} onClick={() => star(it)} title="Quan trọng">★</button>
                <button className="todo-del" onClick={() => remove(it)} title="Xoá">×</button>
              </div>
            ))}
          </div>
        )}

        {doneCount > 0 && (
          <button className="btn ghost sm" style={{ alignSelf: "flex-start" }} onClick={clearDone}>
            Xoá {doneCount} việc đã xong
          </button>
        )}
      </div>
    </div>
  );
}
