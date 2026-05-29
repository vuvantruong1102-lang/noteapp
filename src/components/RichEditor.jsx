import { useEffect, useRef } from "react";

const FONTS = [
  { label: "Font mặc định",   value: "" },
  { label: "Be Vietnam Pro",  value: "Be Vietnam Pro" },
  { label: "Noto Sans SC",    value: "Noto Sans SC" },
  { label: "Serif",           value: "Georgia, serif" },
  { label: "Monospace",       value: "ui-monospace, SFMono-Regular, Menlo, monospace" },
];

const SIZES = [
  { label: "Cỡ chữ", value: "" },
  { label: "Nhỏ",         value: "2" },
  { label: "Bình thường", value: "3" },
  { label: "Lớn",         value: "5" },
  { label: "Rất lớn",     value: "6" },
  { label: "Tiêu đề",     value: "7" },
];

export default function RichEditor({ value, onChange, placeholder }) {
  const ref = useRef(null);

  // Đặt innerHTML khi value đến từ bên ngoài (load), không phải khi gõ.
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || "")) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  function exec(cmd, val) {
    ref.current?.focus();
    try { document.execCommand("styleWithCSS", false, true); } catch (e) {}
    document.execCommand(cmd, false, val);
    onChange?.(ref.current.innerHTML);
  }

  // Mọi nút trên toolbar dùng onMouseDown + preventDefault để không cướp focus
  // khỏi vùng soạn thảo (nếu mất focus thì execCommand áp dụng sai vị trí).
  const tbBtn = (label, cmd, val, title) => (
    <button title={title} onMouseDown={(e) => { e.preventDefault(); exec(cmd, val); }}>
      {label}
    </button>
  );

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
      </div>
      <div
        ref={ref}
        className="rich-editor"
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        onInput={() => onChange?.(ref.current.innerHTML)}
        data-placeholder={placeholder || "Bắt đầu viết…"}
      />
    </>
  );
}
