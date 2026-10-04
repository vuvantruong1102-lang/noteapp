import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

/* ---- cỡ chữ & heading ---- */
const FONT_SIZES = ["12", "14", "16", "18", "20", "24", "28", "32", "36", "48"];
const DEFAULT_SIZE = "16";

/* ---- bảng màu ---- */
const TEXT_COLORS = [
  { name: "Đen", v: "#16171a" },
  { name: "Xám", v: "#6b7280" },
  { name: "Đỏ", v: "#dc2626" },
  { name: "Cam", v: "#ea580c" },
  { name: "Vàng", v: "#ca8a04" },
  { name: "Xanh lá", v: "#16a34a" },
  { name: "Xanh dương", v: "#2563eb" },
  { name: "Tím", v: "#7c3aed" },
];
const HIGHLIGHTS = [
  { name: "Vàng", v: "#fef3c7" },
  { name: "Lục", v: "#d1fae5" },
  { name: "Lam", v: "#dbeafe" },
  { name: "Hồng", v: "#fce7f3" },
  { name: "Tím", v: "#ede9fe" },
  { name: "Cam", v: "#ffedd5" },
  { name: "Đỏ", v: "#fee2e2" },
  { name: "Xám", v: "#e5e7eb" },
];

/* ---- icon (stroke = currentColor) ---- */
const I = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p} />
);
const Ic = {
  undo: () => <I><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></I>,
  redo: () => <I><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" /></I>,
  bold: () => <I><path d="M6 4h8a4 4 0 0 1 0 8H6z" /><path d="M6 12h9a4 4 0 0 1 0 8H6z" /></I>,
  italic: () => <I><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" /></I>,
  underline: () => <I><path d="M6 3v7a6 6 0 0 0 12 0V3" /><line x1="4" y1="21" x2="20" y2="21" /></I>,
  strike: () => <I><path d="M16 4H9a3 3 0 0 0-2.83 4" /><path d="M14 12a4 4 0 0 1 0 8H6" /><line x1="4" y1="12" x2="20" y2="12" /></I>,
  indent: () => <I><line x1="3" y1="6" x2="21" y2="6" /><line x1="11" y1="12" x2="21" y2="12" /><line x1="11" y1="18" x2="21" y2="18" /><polyline points="4 10 7 13 4 16" /></I>,
  outdent: () => <I><line x1="3" y1="6" x2="21" y2="6" /><line x1="11" y1="12" x2="21" y2="12" /><line x1="11" y1="18" x2="21" y2="18" /><polyline points="7 10 4 13 7 16" /></I>,
  bullet: () => <I><line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></I>,
  ordered: () => <I><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /><path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" /></I>,
  check: () => <I><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></I>,
  alignLeft: () => <I><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" /></I>,
  alignCenter: () => <I><line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></I>,
  alignRight: () => <I><line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" /></I>,
  justify: () => <I><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></I>,
  quote: () => <I><path d="M3 21c3 0 7-1 7-8V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h3" /><path d="M14 21c3 0 7-1 7-8V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h3" /></I>,
  code: () => <I><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></I>,
  codeBlock: () => <I><rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="9 10 7 12 9 14" /><polyline points="15 10 17 12 15 14" /></I>,
  link: () => <I><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></I>,
  divider: () => <I><line x1="3" y1="12" x2="21" y2="12" /></I>,
  clear: () => <I><path d="M4 7V4h16v3" /><path d="M5 20l14-14" /><path d="M9 20h6" /></I>,
  painter: () => <I><path d="M19 11V5a2 2 0 0 0-2-2h-3" /><rect x="3" y="3" width="8" height="6" rx="1" /><path d="M7 9v5a2 2 0 0 0 2 2h4" /><rect x="13" y="13" width="8" height="8" rx="1" /></I>,
  textColor: () => <I><path d="M4 20h16" /><path d="M6 16L12 4l6 12" /><path d="M8.5 12h7" /></I>,
  highlight: () => <I><path d="M9 11l-4 4v3h3l4-4" /><path d="M13 7l4 4" /><path d="M14 4l6 6-7 7-6-6z" /></I>,
  chevron: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>,
};

/* nút bấm */
function Btn({ onClick, active, disabled, title, label, children }) {
  return (
    <button type="button" className={"tb-btn" + (active ? " is-active" : "")}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick} disabled={disabled} title={title}
      aria-label={label || title} aria-pressed={active ? "true" : "false"}>
      {children}
    </button>
  );
}

/* Dropdown render qua portal -> KHÔNG bao giờ bị khung cuộn cắt mất */
function PortalMenu({ anchorRef, open, onClose, children, width }) {
  const [pos, setPos] = useState(null);
  const menuRef = useRef(null);

  const place = useCallback(() => {
    const a = anchorRef.current;
    if (!a) return;
    const r = a.getBoundingClientRect();
    const w = width || 190;
    let left = r.left;
    // không tràn mép phải
    if (left + w > window.innerWidth - 8) left = window.innerWidth - 8 - w;
    if (left < 8) left = 8;
    // nếu nút nằm ở nửa dưới màn hình (toolbar ở đáy trên mobile) -> mở LÊN TRÊN
    const openUp = r.top > window.innerHeight * 0.55;
    if (openUp) setPos({ bottom: window.innerHeight - r.top + 6, left, width: w });
    else setPos({ top: r.bottom + 6, left, width: w });
  }, [anchorRef, width]);

  useEffect(() => {
    if (!open) return;
    place();
    function onDocDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          anchorRef.current && !anchorRef.current.contains(e.target)) onClose();
    }
    function onScrollResize() { place(); }
    document.addEventListener("mousedown", onDocDown);
    window.addEventListener("resize", onScrollResize);
    window.addEventListener("scroll", onScrollResize, true);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      window.removeEventListener("resize", onScrollResize);
      window.removeEventListener("scroll", onScrollResize, true);
    };
  }, [open, place, onClose, anchorRef]);

  if (!open || !pos) return null;
  const style = pos.bottom != null
    ? { position: "fixed", bottom: pos.bottom, left: pos.left, width: pos.width }
    : { position: "fixed", top: pos.top, left: pos.left, width: pos.width };
  return createPortal(
    <div ref={menuRef} className="tb-menu" role="menu" style={style}
      onMouseDown={(e) => e.preventDefault()}>
      {children}
    </div>,
    document.body
  );
}

/* 1 ô dropdown (trigger + menu) */
function Dropdown({ open, onToggle, onClose, trigger, menuWidth, children }) {
  const ref = useRef(null);
  return (
    <div className="tb-dd" ref={ref}>
      {trigger(ref)}
      <PortalMenu anchorRef={ref} open={open} onClose={onClose} width={menuWidth}>
        {children}
      </PortalMenu>
    </div>
  );
}

export default function EditorToolbar({ editor, onLink, onPainterToggle, painterOn }) {
  const [openMenu, setOpenMenu] = useState(null); // 'heading'|'size'|'color'|'hl'
  const toggle = (m) => setOpenMenu((x) => (x === m ? null : m));
  const close = () => setOpenMenu(null);

  // re-render khi selection / nội dung đổi để active-state đúng
  const [, force] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const h = () => force((n) => n + 1);
    editor.on("selectionUpdate", h);
    editor.on("transaction", h);
    return () => { editor.off("selectionUpdate", h); editor.off("transaction", h); };
  }, [editor]);

  if (!editor) return null;

  const headingLabel = editor.isActive("heading", { level: 1 }) ? "Tiêu đề 1"
    : editor.isActive("heading", { level: 2 }) ? "Tiêu đề 2"
    : editor.isActive("heading", { level: 3 }) ? "Tiêu đề 3"
    : "Văn bản";

  const curSize =
    (editor.getAttributes("textStyle").fontSize ||
      editor.getAttributes("listItem").blockFontSize ||
      editor.getAttributes("paragraph").blockFontSize ||
      editor.getAttributes("heading").blockFontSize ||
      "").replace("px", "") || DEFAULT_SIZE;

  const setHeading = (lvl) => {
    if (lvl === 0) editor.chain().focus().setParagraph().run();
    else editor.chain().focus().toggleHeading({ level: lvl }).run();
    close();
  };
  const setSize = (px) => {
    if (px === DEFAULT_SIZE) editor.chain().focus().unsetFontSize().run();
    else editor.chain().focus().setFontSize(px + "px").run();
    close();
  };

  // Thụt / lùi đoạn hiện tại (list thì dùng lệnh list; đoạn thường dùng command indent của editor)
  const indent = () => editor.chain().focus().indentBlock().run();
  const outdent = () => editor.chain().focus().outdentBlock().run();

  const Sep = () => <span className="tb-sep" aria-hidden="true" />;

  return (
    <div className="rich-toolbar" role="toolbar" aria-label="Thanh định dạng">
      <div className="tb-scroll">
        <div className="tb-group">
          <Btn title="Hoàn tác (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}><Ic.undo /></Btn>
          <Btn title="Làm lại (Ctrl+Shift+Z)" onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}><Ic.redo /></Btn>
        </div>
        <Sep />

        <div className="tb-group">
          <Dropdown open={openMenu === "heading"} onToggle={() => toggle("heading")} onClose={close}
            menuWidth={170}
            trigger={(ref) => (
              <button ref={ref} type="button" className="tb-select" onMouseDown={(e) => e.preventDefault()}
                onClick={() => toggle("heading")} title="Kiểu đoạn" aria-haspopup="menu"
                aria-expanded={openMenu === "heading"}>
                <span className="tb-select-txt">{headingLabel}</span><Ic.chevron />
              </button>
            )}>
            {[["Văn bản", 0], ["Tiêu đề 1", 1], ["Tiêu đề 2", 2], ["Tiêu đề 3", 3]].map(([lbl, lvl]) => (
              <button key={lvl} role="menuitem" className={"tb-mi tb-h" + lvl}
                onMouseDown={(e) => e.preventDefault()} onClick={() => setHeading(lvl)}>{lbl}</button>
            ))}
          </Dropdown>

          <Dropdown open={openMenu === "size"} onToggle={() => toggle("size")} onClose={close}
            menuWidth={210}
            trigger={(ref) => (
              <button ref={ref} type="button" className="tb-select tb-select-sm" onMouseDown={(e) => e.preventDefault()}
                onClick={() => toggle("size")} title="Cỡ chữ" aria-haspopup="menu"
                aria-expanded={openMenu === "size"}>
                <span className="tb-select-txt">{curSize}</span><Ic.chevron />
              </button>
            )}>
            <div className="tb-sizes">
              {FONT_SIZES.map((s) => (
                <button key={s} role="menuitem"
                  className={"tb-mi tb-mi-c" + (s === curSize ? " is-active" : "")}
                  onMouseDown={(e) => e.preventDefault()} onClick={() => setSize(s)}>{s}</button>
              ))}
            </div>
          </Dropdown>
        </div>
        <Sep />

        <div className="tb-group">
          <Btn title="Đậm (Ctrl+B)" active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}><Ic.bold /></Btn>
          <Btn title="Nghiêng (Ctrl+I)" active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}><Ic.italic /></Btn>
          <Btn title="Gạch chân (Ctrl+U)" active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}><Ic.underline /></Btn>
          <Btn title="Gạch ngang" active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}><Ic.strike /></Btn>
        </div>
        <Sep />

        <div className="tb-group">
          <Dropdown open={openMenu === "color"} onToggle={() => toggle("color")} onClose={close}
            menuWidth={176}
            trigger={(ref) => (
              <button ref={ref} type="button" className="tb-btn" onMouseDown={(e) => e.preventDefault()}
                onClick={() => toggle("color")} title="Màu chữ" aria-haspopup="menu"
                aria-expanded={openMenu === "color"}><Ic.textColor /></button>
            )}>
            <div className="tb-swatches">
              {TEXT_COLORS.map((c) => (
                <button key={c.v} role="menuitem" className="tb-swatch" title={c.name}
                  style={{ background: c.v }} onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { editor.chain().focus().setColor(c.v).run(); close(); }} />
              ))}
            </div>
            <button className="tb-reset" onMouseDown={(e) => e.preventDefault()}
              onClick={() => { editor.chain().focus().unsetColor().run(); close(); }}>Màu mặc định</button>
          </Dropdown>

          <Dropdown open={openMenu === "hl"} onToggle={() => toggle("hl")} onClose={close}
            menuWidth={176}
            trigger={(ref) => (
              <button ref={ref} type="button" className="tb-btn" onMouseDown={(e) => e.preventDefault()}
                onClick={() => toggle("hl")} title="Tô nền (highlight)" aria-haspopup="menu"
                aria-expanded={openMenu === "hl"}><Ic.highlight /></button>
            )}>
            <div className="tb-swatches">
              {HIGHLIGHTS.map((c) => (
                <button key={c.v} role="menuitem" className="tb-swatch" title={c.name}
                  style={{ background: c.v }} onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { editor.chain().focus().toggleHighlight({ color: c.v }).run(); close(); }} />
              ))}
            </div>
            <button className="tb-reset" onMouseDown={(e) => e.preventDefault()}
              onClick={() => { editor.chain().focus().unsetHighlight().run(); close(); }}>Bỏ tô nền</button>
          </Dropdown>
        </div>

        {/* ngắt xuống dòng 2 của thanh công cụ */}
        <span className="tb-break" aria-hidden="true" />

        <div className="tb-group">
          <Btn title="Canh trái" active={editor.isActive({ textAlign: "left" })}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}><Ic.alignLeft /></Btn>
          <Btn title="Canh giữa" active={editor.isActive({ textAlign: "center" })}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}><Ic.alignCenter /></Btn>
          <Btn title="Canh phải" active={editor.isActive({ textAlign: "right" })}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}><Ic.alignRight /></Btn>
          <Btn title="Canh đều" active={editor.isActive({ textAlign: "justify" })}
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}><Ic.justify /></Btn>
        </div>
        <Sep />

        <div className="tb-group">
          <Btn title="Giảm thụt lề (Shift+Tab)" onClick={outdent}><Ic.outdent /></Btn>
          <Btn title="Tăng thụt lề (Tab)" onClick={indent}><Ic.indent /></Btn>
          <Btn title="Danh sách dấu đầu dòng" active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}><Ic.bullet /></Btn>
          <Btn title="Danh sách đánh số" active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}><Ic.ordered /></Btn>
          <Btn title="Danh sách việc cần làm" active={editor.isActive("taskList")}
            onClick={() => editor.chain().focus().toggleTaskList().run()}><Ic.check /></Btn>
        </div>
        <Sep />

        <div className="tb-group">
          <Btn title="Trích dẫn" active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}><Ic.quote /></Btn>
          <Btn title="Mã nội dòng" active={editor.isActive("code")}
            onClick={() => editor.chain().focus().toggleCode().run()}><Ic.code /></Btn>
          <Btn title="Khối mã" active={editor.isActive("codeBlock")}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Ic.codeBlock /></Btn>
          <Btn title="Chèn liên kết (Ctrl+K)" active={editor.isActive("link")}
            onClick={onLink}><Ic.link /></Btn>
          <Btn title="Đường kẻ ngang"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}><Ic.divider /></Btn>
        </div>
        <Sep />

        <div className="tb-group">
          <Btn title="Chép định dạng (quét định dạng): bấm rồi bôi đen vùng muốn dán"
            active={painterOn} onClick={onPainterToggle}><Ic.painter /></Btn>
          <Btn title="Xoá định dạng"
            onClick={() => editor.chain().focus().unsetAllMarks().unsetFontSize().setParagraph().run()}>
            <Ic.clear />
          </Btn>
        </div>
      </div>
    </div>
  );
}
