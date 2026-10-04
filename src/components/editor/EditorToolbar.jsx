import { useState, useRef, useEffect } from "react";

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
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p} />
);
const Ic = {
  undo: () => <I><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></I>,
  redo: () => <I><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" /></I>,
  bold: () => <I><path d="M6 4h8a4 4 0 0 1 0 8H6z" /><path d="M6 12h9a4 4 0 0 1 0 8H6z" /></I>,
  italic: () => <I><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" /></I>,
  underline: () => <I><path d="M6 3v7a6 6 0 0 0 12 0V3" /><line x1="4" y1="21" x2="20" y2="21" /></I>,
  strike: () => <I><path d="M16 4H9a3 3 0 0 0-2.83 4" /><path d="M14 12a4 4 0 0 1 0 8H6" /><line x1="4" y1="12" x2="20" y2="12" /></I>,
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
  textColor: () => <I><path d="M4 20h16" /><path d="M6 16L12 4l6 12" /><path d="M8.5 12h7" /></I>,
  highlight: () => <I><path d="M9 11l-4 4v3h3l4-4" /><path d="M13 7l4 4" /><path d="M14 4l6 6-7 7-6-6z" /></I>,
  more: () => <I><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></I>,
  chevron: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>,
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

/* dropdown nhỏ (đóng khi click ngoài) */
function Menu({ open, onClose, children, align = "left" }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    function h(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, onClose]);
  if (!open) return null;
  return <div ref={ref} className={"tb-menu tb-menu-" + align} role="menu"
    onMouseDown={(e) => e.preventDefault()}>{children}</div>;
}

export default function EditorToolbar({ editor, onLink }) {
  const [openMenu, setOpenMenu] = useState(null); // 'heading'|'size'|'color'|'hl'|'more'
  const toggle = (m) => setOpenMenu((x) => (x === m ? null : m));
  const close = () => setOpenMenu(null);

  // tick: ép re-render khi selection / nội dung đổi để active-state đúng
  const [, force] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const h = () => force((n) => n + 1);
    editor.on("selectionUpdate", h);
    editor.on("transaction", h);
    return () => { editor.off("selectionUpdate", h); editor.off("transaction", h); };
  }, [editor]);

  if (!editor) return null;

  /* heading hiện tại */
  const headingLabel = editor.isActive("heading", { level: 1 }) ? "Tiêu đề 1"
    : editor.isActive("heading", { level: 2 }) ? "Tiêu đề 2"
    : editor.isActive("heading", { level: 3 }) ? "Tiêu đề 3"
    : "Văn bản";

  /* cỡ chữ hiện tại tại con trỏ */
  const curSize = (editor.getAttributes("textStyle").fontSize || "").replace("px", "") || DEFAULT_SIZE;

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

  const Sep = () => <span className="tb-sep" aria-hidden="true" />;

  return (
    <div className="rich-toolbar" role="toolbar" aria-label="Thanh định dạng">
      <div className="tb-scroll">
        {/* undo / redo */}
        <div className="tb-group">
          <Btn title="Hoàn tác (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}><Ic.undo /></Btn>
          <Btn title="Làm lại (Ctrl+Shift+Z)" onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}><Ic.redo /></Btn>
        </div>
        <Sep />

        {/* heading + size */}
        <div className="tb-group">
          <div className="tb-dd">
            <button type="button" className="tb-select" onMouseDown={(e) => e.preventDefault()}
              onClick={() => toggle("heading")} title="Kiểu đoạn" aria-haspopup="menu"
              aria-expanded={openMenu === "heading"}>
              <span className="tb-select-txt">{headingLabel}</span><Ic.chevron />
            </button>
            <Menu open={openMenu === "heading"} onClose={close}>
              {[["Văn bản", 0], ["Tiêu đề 1", 1], ["Tiêu đề 2", 2], ["Tiêu đề 3", 3]].map(([lbl, lvl]) => (
                <button key={lvl} role="menuitem" className={"tb-mi tb-h" + lvl}
                  onClick={() => setHeading(lvl)}>{lbl}</button>
              ))}
            </Menu>
          </div>
          <div className="tb-dd">
            <button type="button" className="tb-select tb-select-sm" onMouseDown={(e) => e.preventDefault()}
              onClick={() => toggle("size")} title="Cỡ chữ" aria-haspopup="menu"
              aria-expanded={openMenu === "size"}>
              <span className="tb-select-txt">{curSize}</span><Ic.chevron />
            </button>
            <Menu open={openMenu === "size"} onClose={close}>
              <div className="tb-sizes">
                {FONT_SIZES.map((s) => (
                  <button key={s} role="menuitem"
                    className={"tb-mi tb-mi-c" + (s === curSize ? " is-active" : "")}
                    onClick={() => setSize(s)}>{s}</button>
                ))}
              </div>
            </Menu>
          </div>
        </div>
        <Sep />

        {/* bold italic underline strike */}
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

        {/* màu chữ + highlight */}
        <div className="tb-group">
          <div className="tb-dd">
            <Btn title="Màu chữ" onClick={() => toggle("color")}><Ic.textColor /></Btn>
            <Menu open={openMenu === "color"} onClose={close}>
              <div className="tb-swatches">
                {TEXT_COLORS.map((c) => (
                  <button key={c.v} role="menuitem" className="tb-swatch" title={c.name}
                    style={{ background: c.v }}
                    onClick={() => { editor.chain().focus().setColor(c.v).run(); close(); }} />
                ))}
              </div>
              <button className="tb-reset" onClick={() => { editor.chain().focus().unsetColor().run(); close(); }}>
                Màu mặc định
              </button>
            </Menu>
          </div>
          <div className="tb-dd">
            <Btn title="Tô nền (highlight)" onClick={() => toggle("hl")}><Ic.highlight /></Btn>
            <Menu open={openMenu === "hl"} onClose={close}>
              <div className="tb-swatches">
                {HIGHLIGHTS.map((c) => (
                  <button key={c.v} role="menuitem" className="tb-swatch" title={c.name}
                    style={{ background: c.v }}
                    onClick={() => { editor.chain().focus().toggleHighlight({ color: c.v }).run(); close(); }} />
                ))}
              </div>
              <button className="tb-reset" onClick={() => { editor.chain().focus().unsetHighlight().run(); close(); }}>
                Bỏ tô nền
              </button>
            </Menu>
          </div>
        </div>
        <Sep />

        {/* alignment */}
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

        {/* list + checklist */}
        <div className="tb-group">
          <Btn title="Danh sách dấu đầu dòng" active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}><Ic.bullet /></Btn>
          <Btn title="Danh sách đánh số" active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}><Ic.ordered /></Btn>
          <Btn title="Danh sách việc cần làm" active={editor.isActive("taskList")}
            onClick={() => editor.chain().focus().toggleTaskList().run()}><Ic.check /></Btn>
        </div>
        <Sep />

        {/* quote / code / link / divider */}
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

        {/* clear */}
        <div className="tb-group">
          <Btn title="Xoá định dạng"
            onClick={() => editor.chain().focus().unsetAllMarks().unsetFontSize().setParagraph().run()}>
            <Ic.clear />
          </Btn>
        </div>
      </div>
    </div>
  );
}
