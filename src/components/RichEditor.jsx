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

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || "")) {
      ref.current.innerHTML = value || "";
      renumberOrderedLists();
    }
  }, [value]);

  // Đánh số liên tục cho các danh sách số ở cấp ngoài cùng (mỗi dòng là 1 <ol>
  // riêng nên mặc định đều bắt đầu từ 1; ta gán thuộc tính start nối tiếp nhau).
  // Danh sách gạch đầu dòng (mục con) KHÔNG làm gián đoạn; gặp đoạn văn thì đánh lại từ 1.
  function renumberOrderedLists() {
    const root = ref.current; if (!root) return;
    let count = 0;
    for (const ch of Array.from(root.children)) {
      if (ch.tagName === "OL") {
        const start = count + 1;
        if (ch.getAttribute("start") !== String(start)) ch.setAttribute("start", String(start));
        count += ch.querySelectorAll(":scope > li").length;
      } else if (ch.tagName === "UL") {
        /* mục con gạch đầu dòng -> giữ mạch số */
      } else {
        count = 0; /* đoạn văn/khối khác -> đánh số lại từ 1 */
      }
    }
  }

  function sync() {
    renumberOrderedLists();
    onChange?.(ref.current.innerHTML);
  }

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
      ol:        document.queryCommandState("insertOrderedList"),
      ul:        document.queryCommandState("insertUnorderedList"),
    };
  }
  function togglePainter() {
    if (painterOn) { painter.current = null; setPainterOn(false); return; }
    painter.current = capture();
    setPainterOn(true);
  }
  function applyPainter() {
    const f = painter.current;
    if (!f) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;     // cần quét chọn vùng đích
    if (!ref.current?.contains(sel.anchorNode)) return;
    try { document.execCommand("styleWithCSS", false, true); } catch (e) {}

    // 1) Định dạng danh sách: số thứ tự / gạch đầu dòng
    const isOL = document.queryCommandState("insertOrderedList");
    const isUL = document.queryCommandState("insertUnorderedList");
    if (f.ol && !isOL)            document.execCommand("insertOrderedList");
    else if (f.ul && !isUL)       document.execCommand("insertUnorderedList");
    else if (!f.ol && !f.ul) {                       // nguồn không phải danh sách -> bỏ danh sách ở đích
      if (isOL) document.execCommand("insertOrderedList");
      if (isUL) document.execCommand("insertUnorderedList");
    }

    // 2) Định dạng ký tự
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

  // ===== Tìm block (con trực tiếp của vùng soạn thảo) chứa con trỏ =====
  function blockOf(node) {
    const root = ref.current;
    let el = node && node.nodeType === 3 ? node.parentElement : node;
    while (el && el.parentElement !== root && el !== root) el = el.parentElement;
    return el && el !== root ? el : null;
  }

  // ===== Tab: thụt dòng. Shift+Tab: lùi lại =====
  function handleTab(shift) {
    ref.current?.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const node = sel.anchorNode;
    const el = node && node.nodeType === 3 ? node.parentElement : node;
    const li = el?.closest?.("li");
    if (li) {                                  // trong danh sách -> lồng cấp
      document.execCommand(shift ? "outdent" : "indent");
      sync();
      return;
    }
    let block = blockOf(node);                 // ngoài danh sách -> chỉnh lề trái của dòng
    if (!block) {
      document.execCommand("formatBlock", false, "div");
      block = blockOf(window.getSelection().anchorNode);
    }
    if (block) {
      const cur = parseFloat(block.style.marginLeft) || 0;
      const next = Math.max(0, cur + (shift ? -2.5 : 2.5));
      block.style.marginLeft = next ? next + "em" : "";
      sync();
    }
  }

  function onKeyDown(e) {
    if (e.key === "Tab") { e.preventDefault(); handleTab(e.shiftKey); return; }

    // Backspace ở ĐẦU mục danh sách -> thoát danh sách (xoá số/dấu đầu dòng)
    if (e.key === "Backspace") {
      const sel = window.getSelection();
      if (!sel || !sel.isCollapsed || sel.rangeCount === 0) return;
      const node = sel.anchorNode;
      const el = node && node.nodeType === 3 ? node.parentElement : node;
      const li = el?.closest?.("li");
      if (!li) return;
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
        {tbBtn("⇤",   "outdent",            null, "Giảm thụt (Shift+Tab)")}
        {tbBtn("⇥",   "indent",             null, "Tăng thụt (Tab)")}
        <span className="tb-sep" />
        {tbBtn("❝",   "formatBlock", "blockquote", "Trích dẫn")}
        {tbBtn("✕",   "removeFormat", null, "Xoá định dạng")}
        <span className="tb-sep" />
        <button className={"painter" + (painterOn ? " painter-on" : "")}
          title="Chép định dạng (gồm cả danh sách số/gạch đầu dòng): bấm rồi quét chọn vùng muốn dán. Bấm lại để huỷ."
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
