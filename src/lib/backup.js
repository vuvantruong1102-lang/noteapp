import { supabase } from "./supabase.js";

// Xuất toàn bộ dữ liệu của người dùng ra file JSON tải về máy.
// Đầy đủ: ghi chú (kèm nội dung HTML), nhóm, thẻ, liên kết thẻ-ghi chú,
// và lịch sử tra từ tiếng Trung kèm cache kết quả.
export async function exportBackup(user) {
  if (!user) return;
  const [notesRes, tagsRes, linksRes, searchesRes] = await Promise.all([
    supabase.from("zhnote_notes").select("*").order("created_at", { ascending: true }),
    supabase.from("zhnote_tags").select("*").order("created_at", { ascending: true }),
    supabase.from("zhnote_note_tags").select("note_id,tag_id,created_at"),
    supabase.from("zhnote_searches").select("*").order("created_at", { ascending: true }),
  ]);

  const links = linksRes.data || [];
  const backup = {
    app: "VTNotes",
    version: 1,
    exported_at: new Date().toISOString(),
    user_id: user.id,
    tags: tagsRes.data || [],
    notes: (notesRes.data || []).map((n) => ({
      ...n,
      tag_ids: links.filter((l) => l.note_id === n.id).map((l) => l.tag_id),
    })),
    searches: searchesRes.data || [],
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vtnotes-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
