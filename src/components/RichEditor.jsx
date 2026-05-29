import { useEffect, useRef, useState } from "react";

const FONTS = [
  { label: "Font mặc định",   value: "" },
  { label: "Be Vietnam Pro",  value: "Be Vietnam Pro" },
  { label: "Noto Sans SC",    value: "Noto Sans SC" },
  { label: "Serif",           value: "Georgia, serif" },
  { label: "Monospace",       value: "ui-monospace, SFMono-Regular, Menlo, monospace" },
];

export default function RichEditor({ value, onChange, placeholder }) {
  const ref = useRef(null);
  const savedRangeRef = useRef(null);
  const [sizeInput, setSizeInput] = useState("");

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || "")) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  // Lưu lại range được chọn TRONG editor mỗi khi selection thay đổi.
  // Khi user click sang ô input cỡ chữ thì selection ở editor mất visual,
  // nhưng savedRangeRef giữ được range trước đó để applyFontSize restore.
  useEffect(() => {
    function onSelectionChange() {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && ref.current && ref.current.contains(sel.anchorNode)) {
        savedRangeRef.current = sel.getRangeAt(0).cloneRange();
      }
    }
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  function exec(cmd, val) {
    ref.current?.focus();
    if (savedRangeRef.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
    try { document.execCommand("styleWithCSS", false, true); } catch (e) {}
    document.execCommand(cmd, false, val);
    onChange?.(ref.current.innerHTML);
  }

  // Bọc đoạn chọn vào <span style="font-size: Npx"> — không dùng execCommand
  // vì execCommand("fontSize") chỉ nhận 1-7, không hỗ trợ px tự do.
  function applyFontSize(px) {
    px = parseInt(px);
    if (!px || px < 8 || px > 72) return;
    if (!savedRangeRef.current) return;
    ref.current?.focus();
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRangeRef.current);
    if (sel.isCollapsed) return;

    const range = sel.getRangeAt(0);
    const span = document.createElement("span");
    span.style.fontSize = px + "px";
    try {
      range.surroundContents(span);
    } catch (e) {
      // Chọn xuyên qua nhiều element -> extract rồi insert lại
      const fragment = range.extractContents();
      span.appendChild(fragment);
      range.insertNode(span);
    }
    // Chọn lại đoạn vừa style để có thể tiếp tục đổi cỡ
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(newRange);
    savedRangeRef.current = newRange.cloneRange();
    onChange?.(ref.current.innerHTML);
  }

  function commitSize() {
    if (sizeInput) applyFontSize(sizeInput);
    setSizeInput("");
  }

  const tbBtn = (label, cmd, val, title) => (
    <button title={title} onMouseDown={(e) => { e.preventDefault(); exec(cmd, val); }}>
      {label}
    </button>
  );

  return (
    <>
      <div className="rich-toolbar" onMouseDown={(e) => {
        if (e.target.tagName !== "SELECT" && e.target.tagName !== "INPUT") e.preventDefault();
      }}>
        <select defaultValue="" onChange={(e) => { exec("fontName", e.target.value); e.target.value = ""; }}>
          {FONTS.map(f => <option key={f.label} value={f.value}>{f.label}</option>)}
        </select>

        <span className="font-size-box" title="Chọn chữ rồi nhập cỡ (8-72) → Enter">
          <input
            type="number" min="8" max="72" step="1"
            className="font-size-input" placeholder="cỡ"
            value={sizeInput}
            onChange={(e) => setSizeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commitSize(); }
            }}
          />
          <span className="font-size-unit">px</span>
        </span>

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
