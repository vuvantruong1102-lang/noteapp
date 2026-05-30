import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../context/AuthContext.jsx";

function toDateStr(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(str, n) {
  const d = new Date(str + "T00:00:00"); d.setDate(d.getDate() + n); return toDateStr(d);
}
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function dayLabel(str, today) {
  const dm = cap(new Date(str + "T00:00:00").toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" }));
  if (str === today) return "Hôm nay · " + dm;
  if (str === addDays(today, 1)) return "Ngày mai · " + dm;
  if (str === addDays(today, -1)) return "Hôm qua · " + dm;
  return dm;
}
function sortTasks(arr) {
  return [...arr].sort((a, b) =>
    (a.done ? 1 : 0) - (b.done ? 1 : 0) ||
    (a.position || 0) - (b.position || 0) ||
    (a.created_at || "").localeCompare(b.created_at || ""));
}

const FORWARD_DAYS = 13; // hôm nay + 13 ngày tới

export default function Todo() {
  const { user } = useAuth();
  const today = toDateStr(new Date());
  const [byDate, setByDate] = useState({});
  const [open, setOpen] = useState({ [today]: true });
  const [drafts, setDrafts] = useState({});
  const [editing, setEditing] = useState(null);
  const [editText, setEditText] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // Tự dồn việc CHƯA XONG của những ngày đã qua sang hôm nay
    await supabase.from("zhnote_todos").update({ due_date: today })
      .lt("due_date", today).eq("done", false);
    const { data } = await supabase.from("zhnote_todos").select("*")
      .order("position", { ascending: true }).order("created_at", { ascending: true });
    const map = {};
    (data || []).forEach(t => { (map[t.due_date] = map[t.due_date] || []).push(t); });
    Object.keys(map).forEach(k => { map[k] = sortTasks(map[k]); });
    setByDate(map);
    setLoading(false);
  }, [today]);

  useEffect(() => { load(); }, [load]);

  // Danh sách ngày: hôm nay + 13 ngày tới, cộng mọi ngày đang có việc
  const set = new Set();
  for (let i = 0; i <= FORWARD_DAYS; i++) set.add(addDays(today, i));
  Object.keys(byDate).forEach(d => set.add(d));
  const arr = [...set];
  const days = [...arr.filter(d => d >= today).sort(), ...arr.filter(d => d < today).sort().reverse()];

  function toggleDay(d) { setOpen(o => ({ ...o, [d]: !o[d] })); }

  async function add(date) {
    const t = (drafts[date] || "").trim(); if (!t) return;
    setDrafts(s => ({ ...s, [date]: "" }));
    const list = byDate[date] || [];
    const pos = list.length ? Math.max(...list.map(x => x.position || 0)) + 1 : 0;
    const { data } = await supabase.from("zhnote_todos")
      .insert({ user_id: user.id, title: t, due_date: date, position: pos }).select().single();
    if (data) setByDate(m => ({ ...m, [date]: sortTasks([...(m[date] || []), data]) }));
  }
  async function toggle(it) {
    const done = !it.done;
    setByDate(m => ({ ...m, [it.due_date]: sortTasks((m[it.due_date] || []).map(x => x.id === it.id ? { ...x, done } : x)) }));
    await supabase.from("zhnote_todos").update({ done, completed_at: done ? new Date().toISOString() : null }).eq("id", it.id);
  }
  async function remove(it) {
    setByDate(m => ({ ...m, [it.due_date]: (m[it.due_date] || []).filter(x => x.id !== it.id) }));
    await supabase.from("zhnote_todos").delete().eq("id", it.id);
  }
  function startEdit(it) { setEditing(it.id); setEditText(it.title); }
  async function saveEdit(it) {
    const t = editText.trim(); setEditing(null);
    if (!t || t === it.title) return;
    setByDate(m => ({ ...m, [it.due_date]: (m[it.due_date] || []).map(x => x.id === it.id ? { ...x, title: t } : x) }));
    await supabase.from("zhnote_todos").update({ title: t }).eq("id", it.id);
  }

  return (
    <div className="page todo-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Việc cần làm</h1>
          <p className="page-sub">Mỗi dòng là một ngày — bấm để mở và thêm việc. Việc chưa tick sẽ tự dồn sang ngày kế tiếp.</p>
        </div>
      </div>

      {loading ? (
        <div className="card card-pad muted">Đang tải…</div>
      ) : (
        <div className="todo-days">
          {days.map(d => {
            const list = byDate[d] || [];
            const done = list.filter(x => x.done).length;
            const isOpen = !!open[d];
            return (
              <div key={d} className={"card todo-day" + (d === today ? " is-today" : "")}>
                <button className="todo-day-head" onClick={() => toggleDay(d)}>
                  <span className="todo-day-caret">{isOpen ? "▾" : "▸"}</span>
                  <span className="todo-day-name">{dayLabel(d, today)}</span>
                  <span className="todo-day-count">{list.length ? `${done}/${list.length}` : ""}</span>
                </button>

                {isOpen && (
                  <div className="todo-day-body">
                    {list.map(it => (
                      <div key={it.id} className={"todo-row" + (it.done ? " done" : "")}>
                        <button className={"todo-check" + (it.done ? " on" : "")}
                          onClick={() => toggle(it)} aria-label="Hoàn thành">{it.done ? "✓" : ""}</button>
                        {editing === it.id ? (
                          <input className="input todo-edit" autoFocus value={editText}
                            onChange={e => setEditText(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") saveEdit(it); if (e.key === "Escape") setEditing(null); }}
                            onBlur={() => saveEdit(it)} />
                        ) : (
                          <span className="todo-title" onClick={() => startEdit(it)} title="Bấm để sửa">{it.title}</span>
                        )}
                        <button className="todo-del" onClick={() => remove(it)} title="Xoá">×</button>
                      </div>
                    ))}

                    <div className="todo-add">
                      <input className="input" placeholder="Thêm việc cho ngày này…" value={drafts[d] || ""}
                        onChange={e => setDrafts(s => ({ ...s, [d]: e.target.value }))}
                        onKeyDown={e => e.key === "Enter" && add(d)} />
                      <button className="btn sm" onClick={() => add(d)} disabled={!(drafts[d] || "").trim()}>Thêm</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
