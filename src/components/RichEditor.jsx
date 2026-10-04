import { useEffect, useRef, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import FontSize from "./editor/FontSize.js";
import ChecklistInputRule from "./editor/ChecklistInputRule.js";
import EditorToolbar from "./editor/EditorToolbar.jsx";

/* Note cũ có thể là plain text (không thẻ HTML). TipTap nhận HTML,
   nên ta bọc plain text thành <p> và giữ xuống dòng. HTML thì giữ nguyên. */
function normalizeInitial(value) {
  const v = value || "";
  if (!v.trim()) return "";
  const looksHtml = /<\/?[a-z][\s\S]*>/i.test(v);
  if (looksHtml) return v;
  const esc = v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc
    .split(/\n{2,}/)
    .map((p) => "<p>" + p.replace(/\n/g, "<br>") + "</p>")
    .join("");
}

export default function RichEditor({ value, onChange, placeholder }) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // nhớ HTML đã đẩy ra ngoài -> bỏ qua khi value quay lại y hệt (khỏi reset con trỏ)
  const lastHTML = useRef(normalizeInitial(value));

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const linkInputRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      ChecklistInputRule,
      Placeholder.configure({ placeholder: placeholder || "Bắt đầu viết…" }),
    ],
    content: normalizeInitial(value),
    editorProps: {
      attributes: { class: "rich-editor tiptap", spellcheck: "false" },
    },
    onUpdate: ({ editor }) => {
      // TipTap không bắn onUpdate giữa composition -> an toàn với IME tiếng Trung
      const html = editor.isEmpty ? "" : editor.getHTML();
      lastHTML.current = html;
      onChangeRef.current?.(html);
    },
  });

  // value đổi từ ngoài (load note khác) -> set lại; bỏ qua nếu trùng (tránh reset con trỏ)
  useEffect(() => {
    if (!editor) return;
    const incoming = normalizeInitial(value);
    if (incoming === lastHTML.current) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (incoming === current) { lastHTML.current = incoming; return; }
    lastHTML.current = incoming;
    editor.commands.setContent(incoming || "", false);
  }, [value, editor]);

  // ===== Link dialog =====
  const openLink = useCallback(() => {
    if (!editor) return;
    setLinkUrl(editor.getAttributes("link").href || "");
    setLinkOpen(true);
    setTimeout(() => linkInputRef.current?.focus(), 30);
  }, [editor]);

  const applyLink = () => {
    const url = linkUrl.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      const href = /^(https?:|mailto:|tel:)/i.test(url) ? url : "https://" + url;
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    setLinkOpen(false); setLinkUrl("");
  };
  const removeLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false); setLinkUrl("");
  };

  // Ctrl/Cmd+K mở link dialog
  useEffect(() => {
    if (!editor) return;
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K") && editor.isFocused) {
        e.preventDefault(); openLink();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editor, openLink]);

  return (
    <div className="rich-wrap">
      <EditorToolbar editor={editor} onLink={openLink} />
      <EditorContent editor={editor} />

      {linkOpen && (
        <div className="link-dialog-backdrop" onMouseDown={() => setLinkOpen(false)}>
          <div className="link-dialog" onMouseDown={(e) => e.stopPropagation()}>
            <label className="link-dialog-label">Liên kết</label>
            <input ref={linkInputRef} className="input link-dialog-input"
              placeholder="https://…" value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); applyLink(); }
                if (e.key === "Escape") { e.preventDefault(); setLinkOpen(false); }
              }} />
            <div className="link-dialog-row">
              {editor?.isActive("link") && (
                <button className="btn ghost sm" onClick={removeLink}>Gỡ liên kết</button>
              )}
              <div style={{ flex: 1 }} />
              <button className="btn ghost sm" onClick={() => setLinkOpen(false)}>Huỷ</button>
              <button className="btn sm" onClick={applyLink}>Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
