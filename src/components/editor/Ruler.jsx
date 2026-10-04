import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Thước căn lề — kéo con trỏ để chỉnh độ thụt lề trái/phải của đoạn đang chọn.
 * Hoạt động với extension Indent (đơn vị em). 1em ≈ 16px.
 * - Tam giác TRÁI (▸): lề trái.
 * - Tam giác PHẢI (◂): lề phải.
 * Chỉ áp cho đoạn/heading (ngoài list). Trong list thì ẩn hint, kéo vẫn set lề đoạn gần nhất.
 */
const EM_PX = 16;      // 1em
const MAX_EM = 32;

export default function Ruler({ editor }) {
  const trackRef = useRef(null);
  const [left, setLeft] = useState(0);    // em
  const [right, setRight] = useState(0);  // em
  const [trackW, setTrackW] = useState(0);
  const dragging = useRef(null);          // 'left' | 'right' | null

  // đọc lề của block hiện tại
  const readIndent = useCallback(() => {
    if (!editor) return;
    const l = editor.getAttributes("paragraph").indentLeft ??
              editor.getAttributes("heading").indentLeft ?? 0;
    const r = editor.getAttributes("paragraph").indentRight ??
              editor.getAttributes("heading").indentRight ?? 0;
    if (!dragging.current) { setLeft(l || 0); setRight(r || 0); }
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    readIndent();
    editor.on("selectionUpdate", readIndent);
    editor.on("transaction", readIndent);
    return () => { editor.off("selectionUpdate", readIndent); editor.off("transaction", readIndent); };
  }, [editor, readIndent]);

  // đo bề rộng vùng soạn thảo để thước khớp
  useEffect(() => {
    if (!editor) return;
    const measure = () => {
      const dom = editor.view?.dom;
      if (dom) setTrackW(dom.clientWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    if (editor.view?.dom) ro.observe(editor.view.dom);
    return () => { window.removeEventListener("resize", measure); ro.disconnect(); };
  }, [editor]);

  const maxPx = MAX_EM * EM_PX;

  const onDown = (which) => (e) => {
    e.preventDefault();
    dragging.current = which;
    const move = (ev) => {
      const track = trackRef.current;
      if (!track || !editor) return;
      const rect = track.getBoundingClientRect();
      const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      if (which === "left") {
        let px = clientX - rect.left;
        px = Math.max(0, Math.min(maxPx, px));
        const em = Math.round((px / EM_PX) * 2) / 2; // bắt theo 0.5em
        setLeft(em);
        editor.chain().setBlockIndent(em).run();
      } else {
        let px = rect.right - clientX;
        px = Math.max(0, Math.min(maxPx, px));
        const em = Math.round((px / EM_PX) * 2) / 2;
        setRight(em);
        editor.chain().setBlockIndentRight(em).run();
      }
    };
    const up = () => {
      dragging.current = null;
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", up);
      editor?.chain().focus().run();
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", up);
  };

  if (!editor) return null;

  const leftPx = Math.min(left * EM_PX, trackW);
  const rightPx = Math.min(right * EM_PX, trackW);

  // vạch chia mỗi 2em
  const ticks = [];
  for (let em = 0; em <= MAX_EM; em += 2) {
    const x = em * EM_PX;
    if (x > trackW) break;
    ticks.push(<span key={em} className="ruler-tick" style={{ left: x }} />);
  }

  return (
    <div className="ruler" role="group" aria-label="Thước căn lề">
      <div className="ruler-track" ref={trackRef} style={{ width: trackW || "100%" }}>
        {ticks}
        {/* marker lề trái */}
        <button type="button" className="ruler-marker ruler-left"
          style={{ left: leftPx }} onMouseDown={onDown("left")} onTouchStart={onDown("left")}
          title={`Lề trái: ${left}em — kéo để chỉnh`} aria-label="Kéo chỉnh lề trái" />
        {/* marker lề phải */}
        <button type="button" className="ruler-marker ruler-right"
          style={{ right: rightPx }} onMouseDown={onDown("right")} onTouchStart={onDown("right")}
          title={`Lề phải: ${right}em — kéo để chỉnh`} aria-label="Kéo chỉnh lề phải" />
      </div>
    </div>
  );
}
