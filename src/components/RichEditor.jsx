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

  // Đảm bảo selection nằm TRONG editor; nếu không có sẵn thì đặt con trỏ ở cuối
  function ensureSelectionInEditor() {
    ref.current?.focus();
    let sel = window.getSelection();
    if (savedRangeRef.current) {
      try { sel.removeAllRanges(); sel.addRange(savedRangeRef.current); } catch (e) {}
    }
    sel = window.getSelection();
    if (!sel.rangeCount || !ref.current.contains(sel.anchorNode)) {
      const r = document.createRange();
      r.selectNodeContents(ref.current);
      r.collapse(false); // cuối editor
      sel.removeAllRanges();
      sel.addRange(r);
    }
    return window.getSelection();
  }

  function exec(cmd, val) {
    ensureSelectionInEditor();
    try { document.execCommand("styleWithCSS", false, true); } catch (e) {}
    document.execCommand(cmd, false, val);
    onChange?.(ref.current.innerHTML);
  }

  // Bọc đoạn chọn vào <span style="font-size: Npx">. Hai trường hợp:
  //   - Có chọn text: surroundContents (hoặc extract+wrap nếu range xuyên element)
  //   - Không có chọn (con trỏ rỗng / editor trống): chèn span với zero-width
  //     space, đặt con trỏ BÊN TRONG span -> gõ tiếp sẽ vào span với cỡ mới.
  function applyFontSize(px) {
    px = parseInt(px);
    if (!px || px < 8 || px > 72) return;
    if (!ref.current) return;

    const sel = ensureSelectionInEditor();
    const range = sel.getRangeAt(0);
    const span = document.createElement("span");
    span.style.fontSize = px + "px";

    if (sel.isCollapsed) {
      // Chưa chọn text -> mode "set cỡ chữ rồi gõ tiếp"
      const zws = document.createTextNode("\u200B"); // zero-width space
      span.appendChild(zws);
      range.insertNode(span);
      const newRange = document.createRange();
      newRange.setStart(zws, 1);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      savedRangeRef.current = newRange.cloneRange();
    } else {
      // Có chọn text -> bọc lại
      try {
        range.surroundContents(span);
      } catch (e) {
        const fragment = range.extractContents();
        span.appendChild(fragment);
        range.insertNode(span);
      }
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      sel.removeAllRanges();
      sel.addRange(newRange);
      savedRangeRef.current = newRange.cloneRange();
    }
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

        <span className="font-size-box" title="Nhập cỡ (8-72) rồi Enter. Nếu chưa chọn text, cỡ sẽ áp dụng cho phần gõ tiếp theo.">
          <input
            type="number" min="8" max="72" step="1"
            className="font-size-input" placeholder="cỡ"
            value={sizeInput}
            onChange={(e) => setSizeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commitSize(); }
            }}
            onBlur={() => { if (sizeInput) commitSize(); }}
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
