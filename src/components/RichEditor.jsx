import { useEffect, useRef, useState } from "react";

const FONTS = [
  { label: "Font mặc định",   value: "" },
  { label: "Arial",           value: "Arial" },
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Be Vietnam Pro",  value: "Be Vietnam Pro" },
  { label: "Noto Sans SC",    value: "Noto Sans SC" },
  { label: "Georgia",         value: "Georgia" },
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
  const painter = useRef(null);     // định dạng đã "quét"
  const armed = useRef(false);      // đã bấm chuột trong editor để chọn vùng đích chưa
  const [painterOn, setPainterOn] = useState(false);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || "")) {
      ref.current.innerHTML = value || "";
      normalizeLists();
    }
  }, [value]);

  function sync() {
    normalizeLists();
    onChange?.(ref.current.innerHTML);
  }

  // ===== Đánh số mượt như Google Docs =====
  // Gộp các danh sách cùng loại nằm SÁT NHAU thành MỘT danh sách -> trình duyệt
  // tự đánh số 1,2,3… liên tục và Enter tự tăng số. Với <ol> bị <ul> (mục con)
  // xen giữa thì nối số bằng thuộc tính start.
  function normalizeLists() {
    const root = ref.current; if (!root) return;
    let n = root.firstElementChild;
    while (n) {
      const next = n.nextElementSibling;
      if (next && n.tagName === next.tagName && (n.tagName === "OL" || n.tagName === "UL")) {
        while (next.firstChild) n.appendChild(next.firstChild);
        next.remove();
        continue; // thử gộp tiếp
      }
      n = n.nextElementSibling;
    }
    let count = 0;
    for (const ch of Array.from(root.children)) {
      if (ch.tagName === "OL") {
        const start = count + 1;
        if (ch.getAttribute("start") !== String(start)) ch.setAttribute("start", String(start));
        count += ch.querySelectorAll(":scope > li").length;
      }
      // Các khối khác (đoạn văn, danh sách gạch đầu dòng) KHÔNG reset ->
      // số thứ tự nối tiếp liên tục toàn tài liệu (1,2,3,4…).
    }
  }

  function exec(cmd, val) {
    ref.current?.focus();
    try { document.execCommand("styleWithCSS", false, true); } catch (e) {}
    document.execCommand(cmd, false, val);
    normalizeLists();
    sync();
  }

  const tbBtn = (label, cmd, val, title) => (
    <button title={title} onMouseDown={(e) => { e.preventDefault(); exec(cmd, val); }}>{label}</button>
  );

  // ===== Chổi quét định dạng =====
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
    armed.current = false;
    setPainterOn(true);
  }
  function applyPainter() {
    const f = painter.current;
    if (!f) { setPainterOn(false); return; }
    ref.current?.focus();
    try { document.execCommand("styleWithCSS", false, true); } catch (e) {}

    const isOL = document.queryCommandState("insertOrderedList");
    const isUL = document.queryCommandState("insertUnorderedList");
    if (f.ol && !isOL)            document.execCommand("insertOrderedList");
    else if (f.ul && !isUL)       document.execCommand("insertUnorderedList");
    else if (!f.ol && !f.ul) {
      if (isOL) document.execCommand("insertOrderedList");
      if (isUL) document.execCommand("insertUnorderedList");
    }
    if (document.queryCommandState("bold")          !== f.bold)      document.execCommand("bold");
    if (document.queryCommandState("italic")        !== f.italic)    document.execCommand("italic");
    if (document.queryCommandState("underline")     !== f.underline) document.execCommand("underline");
    if (document.queryCommandState("strikeThrough") !== f.strike)    document.execCommand("strikeThrough");
    if (f.fontName)                                document.execCommand("fontName", false, f.fontName);
    if (f.fontSize && /^[1-7]$/.test(f.fontSize))  document.execCommand("fontSize", false, f.fontSize);

    painter.current = null;
    setPainterOn(false);
    normalizeLists();
    sync();
  }

  // Khi bật chổi quét: chờ người dùng QUÉT CHỌN vùng đích trong editor rồi thả chuột mới dán.
  useEffect(() => {
    if (!painterOn) { armed.current = false; return; }
    function onUp() {
      if (!armed.current) return;   // chỉ áp dụng khi vùng chọn bắt đầu từ trong editor
      armed.current = false;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
      if (!ref.current || !ref.current.contains(sel.anchorNode) || !ref.current.contains(sel.focusNode)) return;
      applyPainter();
    }
    document.addEventListener("mouseup", onUp);
    return () => document.removeEventListener("mouseup", onUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [painterOn]);

  function blockOf(node) {
    const root = ref.current;
    let el = node && node.nodeType === 3 ? node.parentElement : node;
    while (el && el.parentElement !== root && el !== root) el = el.parentElement;
    return el && el !== root ? el : null;
  }

  function handleTab(shift) {
    ref.current?.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const node = sel.anchorNode;
    const el = node && node.nodeType === 3 ? node.parentElement : node;
    const li = el?.closest?.("li");
    if (li) { document.execCommand(shift ? "outdent" : "indent"); normalizeLists(); sync(); return; }
    let block = blockOf(node);
    if (!block) { document.execCommand("formatBlock", false, "div"); block = blockOf(window.getSelection().anchorNode); }
    if (block) {
      const cur = parseFloat(block.style.marginLeft) || 0;
      const next = Math.max(0, cur + (shift ? -2.5 : 2.5));
      block.style.marginLeft = next ? next + "em" : "";
      sync();
    }
  }

  function onKeyDown(e) {
    // Gõ "1." + dấu cách -> tự thành danh sách đánh số; "-"/"*" + dấu cách -> gạch đầu dòng
    if (e.key === " ") {
      const sel = window.getSelection();
      if (sel && sel.isCollapsed && sel.rangeCount) {
        const node = sel.anchorNode;
        const el = node && node.nodeType === 3 ? node.parentElement : node;
        if (!el?.closest?.("li")) {
          const container = blockOf(node);
          const rr = document.createRange();
          rr.selectNodeContents(container || ref.current);
          rr.setEnd(sel.anchorNode, sel.anchorOffset);
          const before = rr.toString();
          const safe = container || !before.includes("\n");
          const t = before.trim();
          if (safe && /^\d{1,2}\.$/.test(t)) {
            e.preventDefault(); rr.deleteContents();
            document.execCommand("insertOrderedList"); normalizeLists(); sync(); return;
          }
          if (safe && /^[-*]$/.test(t)) {
            e.preventDefault(); rr.deleteContents();
            document.execCommand("insertUnorderedList"); normalizeLists(); sync(); return;
          }
        }
      }
    }

    if (e.key === "Tab") { e.preventDefault(); handleTab(e.shiftKey); return; }
    if (e.key === "Backspace") {
      const sel = window.getSelection();
      if (!sel || !sel.isCollapsed || sel.rangeCount === 0) return;
      const node = sel.anchorNode;
      const el = node && node.nodeType === 3 ? node.parentElement : node;
      const li = el?.closest?.("li");
      const container = li || blockOf(node);
      if (!container) return;
      // Con trỏ có đang ở NGAY ĐẦU khối không?
      const r = document.createRange();
      r.selectNodeContents(container);
      r.setEnd(sel.anchorNode, sel.anchorOffset);
      if (r.toString() !== "") return;

      if (li) {                         // đầu mục danh sách -> thoát danh sách
        e.preventDefault();
        ref.current?.focus();
        if (li.closest("ol"))      document.execCommand("insertOrderedList");
        else if (li.closest("ul")) document.execCommand("insertUnorderedList");
        else                       document.execCommand("outdent");
        normalizeLists();
        sync();
        return;
      }
      // Dòng thường đang thụt vào -> Backspace giảm/bỏ thụt (thay vì gộp dòng)
      const cur = parseFloat(container.style.marginLeft) || 0;
      if (cur > 0) {
        e.preventDefault();
        const next = Math.max(0, cur - 2.5);
        container.style.marginLeft = next ? next + "em" : "";
        sync();
      }
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
          title="Chép định dạng: bấm rồi quét chọn vùng muốn dán. Bấm lại để huỷ."
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
        onMouseDown={() => { if (painterOn) armed.current = true; }}
        data-placeholder={placeholder || "Bắt đầu viết…"}
      />
    </>
  );
}
