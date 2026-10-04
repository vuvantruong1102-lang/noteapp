import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Thước căn lề — kéo con trỏ để chỉnh độ thụt lề trái/phải của đoạn/dòng đang chọn.
 * Hoạt động với extension Indent (đơn vị em). 1em ≈ 16px.
 * - Tam giác TRÁI: lề trái  — khi lề=0 nằm sát ĐẦU TRÁI vạch thước.
 * - Tam giác PHẢI: lề phải  — khi lề=0 nằm sát ĐẦU PHẢI vạch thước.
 * Hộp thước (.ruler-inner) khớp đúng cột soạn thảo nên 2 marker nằm đúng 2 đầu vạch đen.
 */
const EM_PX = 16;
const MAX_EM = 80;

export default function Ruler({ editor }) {
  const trackRef = useRef(null);
  const [left, setLeft] = useState(0);    // em
  const [right, setRight] = useState(0);  // em
  const [trackW, setTrackW] = useState(0);
  const dragging = useRef(null);

  const readIndent = useCallback(() => {
    if (!editor) return;
    const pick = (attr) =>
      editor.getAttributes("listItem")[attr] ||
      editor.getAttributes("taskItem")[attr] ||
      editor.getAttributes("paragraph")[attr] ||
      editor.getAttributes("heading")[attr] || 0;
    if (!dragging.current) { setLeft(pick("indentLeft")); setRight(pick("indentRight")); }
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    readIndent();
    editor.on("selectionUpdate", readIndent);
    editor.on("transaction", readIndent);
    return () => { editor.off("selectionUpdate", readIndent); editor.off("transaction", readIndent); };
  }, [editor, readIndent]);

  // đo bề rộng CỦA CHÍNH VẠCH THƯỚC (track) -> marker tính theo đúng nó
  useEffect(() => {
    const measure = () => {
      if (trackRef.current) setTrackW(trackRef.current.clientWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    return () => { window.removeEventListener("resize", measure); ro.disconnect(); };
  }, [editor]);

  const onDown = (which) => (e) => {
    e.preventDefault();
    dragging.current = which;
    const move = (ev) => {
      const track = trackRef.current;
      if (!track || !editor) return;
      const rect = track.getBoundingClientRect();
      const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const maxPx = Math.max(0, rect.width - 20); // chừa 20px để 2 marker không đè nhau
      if (which === "left") {
        let px = clientX - rect.left;
        px = Math.max(0, Math.min(maxPx - right * EM_PX, px));
        const em = Math.round((px / EM_PX) * 2) / 2;
        setLeft(em);
        editor.chain().setBlockIndent(em).run();
      } else {
        let px = rect.right - clientX;
        px = Math.max(0, Math.min(maxPx - left * EM_PX, px));
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

  const ticks = [];
  for (let em = 2; em < MAX_EM; em += 2) {
    const x = em * EM_PX;
    if (x >= trackW) break;
    ticks.push(<span key={em} className="ruler-tick" style={{ left: x }} />);
  }

  return (
    <div className="ruler" role="group" aria-label="Thước căn lề">
      <div className="ruler-inner">
        <div className="ruler-track" ref={trackRef}>
          {ticks}
          <button type="button" className="ruler-marker ruler-left"
            style={{ left: leftPx }} onMouseDown={onDown("left")} onTouchStart={onDown("left")}
            title={`Lề trái: ${left}em — kéo để chỉnh`} aria-label="Kéo chỉnh lề trái" />
          <button type="button" className="ruler-marker ruler-right"
            style={{ right: rightPx }} onMouseDown={onDown("right")} onTouchStart={onDown("right")}
            title={`Lề phải: ${right}em — kéo để chỉnh`} aria-label="Kéo chỉnh lề phải" />
        </div>
      </div>
    </div>
  );
}
