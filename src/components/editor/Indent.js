import { Extension } from "@tiptap/core";

/**
 * Indent — thụt/lùi lề TRÁI (và lề phải) cho paragraph & heading.
 * Lưu bằng marginLeft / marginRight (đơn vị em) => vẫn là HTML thuần,
 * tương thích ngược. CHỈ áp cho block đang nằm trong vùng chọn.
 *
 * - indentBlock / outdentBlock: bước nhảy cố định (nút toolbar + phím Tab).
 * - setBlockIndent(em) / setBlockIndentRight(em): đặt giá trị tuỳ ý (thước kéo).
 *
 * Trong list thì KHÔNG dùng extension này — RichEditor gọi sink/liftListItem.
 */
const STEP = 2;    // 1 lần Tab = 2em
const MAX = 32;    // trần (em)

function clamp(v) { return Math.max(0, Math.min(MAX, v)); }
function emOf(style) { const n = parseFloat(style || "0"); return isNaN(n) ? 0 : n; }

export const Indent = Extension.create({
  name: "indent",

  addOptions() {
    return { types: ["paragraph", "heading"] };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indentLeft: {
            default: 0,
            parseHTML: (el) => emOf(el.style.marginLeft),
            renderHTML: (attrs) =>
              attrs.indentLeft ? { style: `margin-left: ${attrs.indentLeft}em` } : {},
          },
          indentRight: {
            default: 0,
            parseHTML: (el) => emOf(el.style.marginRight),
            renderHTML: (attrs) =>
              attrs.indentRight ? { style: `margin-right: ${attrs.indentRight}em` } : {},
          },
        },
      },
    ];
  },

  addCommands() {
    const edit = (fn) => ({ state, dispatch }) => {
      const { from, to } = state.selection;
      const { tr, doc } = state;
      const types = this.options.types;
      let changed = false;
      doc.nodesBetween(from, to, (node, pos) => {
        if (types.includes(node.type.name)) {
          const next = fn(node.attrs);
          if (next) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...next });
            changed = true;
          }
        }
      });
      if (changed && dispatch) dispatch(tr);
      return changed;
    };

    return {
      indentBlock: () =>
        edit((a) => {
          const v = clamp((a.indentLeft || 0) + STEP);
          return v !== (a.indentLeft || 0) ? { indentLeft: v } : null;
        }),
      outdentBlock: () =>
        edit((a) => {
          const v = clamp((a.indentLeft || 0) - STEP);
          return v !== (a.indentLeft || 0) ? { indentLeft: v } : null;
        }),
      setBlockIndent: (em) =>
        edit(() => ({ indentLeft: clamp(em) })),
      setBlockIndentRight: (em) =>
        edit(() => ({ indentRight: clamp(em) })),
    };
  },
});

export default Indent;
