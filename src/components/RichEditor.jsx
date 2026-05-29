import { useEffect, useRef, useState } from "react";

const FONTS = [
  { label: "Font mặc định",   value: "" },
  { label: "Be Vietnam Pro",  value: "Be Vietnam Pro" },
  { label: "Noto Sans SC",    value: "Noto Sans SC" },
  { label: "Serif",           value: "Georgia, serif" },
  { label: "Monospace",       value: "ui-monospace, SFMono-Regular, Menlo, monospace" },
];

const SIZES = [
  { label: "Cỡ chữ",      value: "" },
  { label: "Nhỏ",         value: "2" },
  { label: "Bình thường", value: "3" },
  { label: "Lớn",         value: "5" },
  { label: "Rất lớn",     value: "6" },
  { label: "Tiêu đề",     value: "7" },
];

export default function RichEditor({ value, onChange, placeholder }) {
  const ref = useRef(null);
  const painter = useRef(null);          // định dạng đã "quét"
  const [painterOn, setPainterOn] = useState(false);

  // Đặt innerHTML khi value đến từ bên ngoài (load), không phải khi gõ.
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || "")) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  function sync() { onChange?.(ref.current.innerHTML); }

  function exec(cmd, val) {
    ref.current?.focus();
    try { document.execCommand("styleWithCSS", false, true); } catch (e) {}
    document.execCommand(cmd, false, val);
    sync();
  }

  const tbBtn = (label, cmd, val, title) => (
    <button title={title} onMouseDown={(e) => { e.preventDefault(); exec(cmd, val); }}>
      {label}
    </button>
  );

  // ===== Chổi quét định dạng (format painter) =====
  function capture() {
    ref.current?.focus();
    return {
      bold:      document.queryCommandState("bold"),
      italic:    document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strike:    document.queryCommandState("strikeThrough"),
      fontName:  document.queryCommandValue("fontName"),
      fontSize:  document.queryCommandValue("fontSize"),
    };
  }
  function togglePainter() {
    if (painterOn) { painter.current = null; setPainterOn(false); return; }
    painter.current = capture();   // chép định dạng tại vị trí con trỏ / vùng chọn hiện tại
    setPainterOn(true);
  }
  function applyPainter() {
    const f = painter.current;
    if (!f) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;     // cần quét chọn vùng đích
    if (!ref.current?.contains(sel.anchorNode)) return;
    try { document.execCommand("styleWithCSS", false, true); } catch (e) {}
    if (document.queryCommandState("bold")          !== f.bold)      document.execCommand("bold");
    if (document.queryCommandState("italic")        !== f.italic)    document.execCommand("italic");
    if (document.queryCommandState("underline")     !== f.underline) document.execCommand("underline");
    if (document.queryCommandState("strikeThrough") !== f.strike)    document.execCommand("strikeThrough");
    if (f.fontName)                       document.execCommand("fontName", false, f.fontName);
    if (f.fontSize && /^[1-7]$/.test(f.fontSize)) document.execCommand("fontSize", false, f.fontSize);
    painter.current = null;
    setPainterOn(false);
    sync();
  }

  // ===== Backspace ở ĐẦU mục danh sách -> thoát danh sách (xoá số/dấu đầu dòng) =====
  function onKeyDown(e) {
    if (e.key !== "Backspace") return;
    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed || sel.rangeCount === 0) return;
    const node = sel.anchorNode;
    const el = node && node.nodeType === 3 ? node.parentElement : node;
    const li = el?.closest?.("li");
    if (!li) return;
    // Con trỏ có đang ở ngay đầu mục không?
    const r = document.createRange();
    r.selectNodeContents(li);
    r.setEnd(sel.anchorNode, sel.anchorOffset);
    if (r.toString() !== "") return;
    e.preventDefault();
    ref.current?.focus();
    if (li.closest("ol"))      document.execCommand("insertOrderedList");
    else if (li.closest("ul")) document.execCommand("insertUnorderedList");
    else                       document.execCommand("outdent");
    sync();
  }

  return (
    <>
      <div className="rich-toolbar" onMouseDown={(e) => { if (e.target.tagName !== "SELECT") e.preventDefault(); }}>
        <select defaultValue="" onChange={(e) => { exec("fontName", e.target.value); e.target.value = ""; }}>
          {FONTS.map(f => <option key={f.label} value={f.value}>{f.label}</option>)}
        </select>
        <select defaultValue="" onChange={(e) => { exec("fontSize", e.target.value); e.target.value = ""; }}>
          {SIZES.map(s => <option key={s.label} value={s.value}>{s.label}</option>)}
        </select>
        <span className="tb-sep" />
        {tbBtn(<b>B</b>,  "bold",          null, "Đậm (Ctrl+B)")}
        {tbBtn(<i>I</i>,  "italic",        null, "Nghiêng (Ctrl+I)")}
        {tbBtn(<u>U</u>,  "underline",     null, "Gạch chân (Ctrl+U)")}
        {tbBtn(<s>S</s>,  "strikeThrough", null, "Gạch ngang")}
        <span className="tb-sep" />
        {tbBtn("• ≡", "insertUnorderedList", null, "Danh sách có dấu đầu dòng")}
        {tbBtn("1. ≡", "insertOrderedList",  null, "Danh sách đánh số")}
        {tbBtn("⇤",   "outdent",            null, "Giảm thụt")}
        {tbBtn("⇥",   "indent",             null, "Tăng thụt")}
        <span className="tb-sep" />
        {tbBtn("❝",   "formatBlock", "blockquote", "Trích dẫn")}
        {tbBtn("✕",   "removeFormat", null, "Xoá định dạng")}
        <span className="tb-sep" />
        <button className={"painter" + (painterOn ? " painter-on" : "")}
          title="Chép định dạng: bấm vào đây rồi quét chọn vùng muốn dán định dạng. Bấm lại để huỷ."
          onMouseDown={(e) => { e.preventDefault(); togglePainter(); }}>🖌</button>
      </div>
      <div
        ref={ref}
        className={"rich-editor" + (painterOn ? " painter-on" : "")}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        onInput={sync}
        onKeyDown={onKeyDown}
        onMouseUp={applyPainter}
        data-placeholder={placeholder || "Bắt đầu viết…"}
      />
    </>
  );
}
