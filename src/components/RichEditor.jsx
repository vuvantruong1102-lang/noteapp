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
import Indent from "./editor/Indent.js";
import ChecklistInputRule from "./editor/ChecklistInputRule.js";
import EditorToolbar from "./editor/EditorToolbar.jsx";
import Ruler from "./editor/Ruler.jsx";

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

  // ===== Format painter (chổi quét định dạng) =====
  const [painterOn, setPainterOn] = useState(false);
  const painterFmt = useRef(null); // marks đã chép

  // Tab / Shift+Tab: trong list thì nest/unnest; ngoài list thì thụt/lùi đoạn
  const handleTab = useCallback((editor, shift) => {
    if (editor.isActive("listItem") || editor.isActive("taskItem")) {
      const cmd = shift ? "liftListItem" : "sinkListItem";
      const itemType = editor.isActive("taskItem") ? "taskItem" : "listItem";
      return editor.chain().focus()[cmd](itemType).run();
    }
    return shift
      ? editor.chain().focus().outdentBlock().run()
      : editor.chain().focus().indentBlock().run();
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      FontSize,
      Indent,
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
      handleKeyDown: (view, event) => {
        if (event.key === "Tab") {
          event.preventDefault();
          handleTab(editorRef.current, event.shiftKey);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      // TipTap không bắn onUpdate giữa composition -> an toàn với IME tiếng Trung
      const html = editor.isEmpty ? "" : editor.getHTML();
      lastHTML.current = html;
      onChangeRef.current?.(html);
    },
  });

  // ref ổn định tới editor cho handleKeyDown (đóng kín trong editorProps)
  const editorRef = useRef(null);
  editorRef.current = editor;

  // ===== Format painter: bắt mouseup sau khi bật, áp marks lên vùng vừa bôi đen =====
  const togglePainter = useCallback(() => {
    if (!editor) return;
    if (painterOn) { painterFmt.current = null; setPainterOn(false); return; }
    // chép định dạng tại vị trí con trỏ hiện tại
    const ts = editor.getAttributes("textStyle");
    painterFmt.current = {
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      underline: editor.isActive("underline"),
      strike: editor.isActive("strike"),
      code: editor.isActive("code"),
      color: editor.getAttributes("textStyle").color || null,
      highlight: editor.getAttributes("highlight").color || null,
      fontSize: ts.fontSize || null,
    };
    setPainterOn(true);
  }, [editor, painterOn]);

  const applyPainter = useCallback(() => {
    const f = painterFmt.current;
    if (!editor || !f) return;
    const { empty } = editor.state.selection;
    if (empty) return; // cần một vùng bôi đen mới áp
    let c = editor.chain().focus();
    // xoá marks cũ trên vùng chọn trước, rồi áp lại theo mẫu đã chép
    c = c.unsetAllMarks();
    if (f.bold) c = c.setBold();
    if (f.italic) c = c.setItalic();
    if (f.underline) c = c.setUnderline();
    if (f.strike) c = c.setStrike();
    if (f.code) c = c.setCode();
    if (f.color) c = c.setColor(f.color);
    if (f.highlight) c = c.setHighlight({ color: f.highlight });
    if (f.fontSize) c = c.setFontSize(f.fontSize);
    c.run();
    painterFmt.current = null;
    setPainterOn(false);
  }, [editor]);

  useEffect(() => {
    if (!painterOn || !editor) return;
    const dom = editor.view.dom;
    const onUp = () => {
      // đợi selection cập nhật xong
      setTimeout(() => {
        if (!editor.state.selection.empty) applyPainter();
      }, 0);
    };
    dom.addEventListener("mouseup", onUp);
    return () => dom.removeEventListener("mouseup", onUp);
  }, [painterOn, editor, applyPainter]);

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
      <EditorToolbar editor={editor} onLink={openLink}
        onPainterToggle={togglePainter} painterOn={painterOn} />
      <Ruler editor={editor} />
      <EditorContent editor={editor} className={painterOn ? "painter-on" : undefined} />

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
