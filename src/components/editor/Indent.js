import { Extension } from "@tiptap/core";
import { TextSelection, AllSelection } from "@tiptap/pm/state";

/**
 * Indent — thụt/lùi lề cho paragraph & heading bằng thuộc tính indent (0..8),
 * render ra style margin-left. CHỈ áp dụng cho các block đang nằm trong vùng chọn
 * (đoạn/dòng có con trỏ), không đụng cả tài liệu.
 *
 * Trong list thì KHÔNG dùng extension này — RichEditor sẽ gọi sinkListItem/
 * liftListItem để nest/unnest như Google Docs.
 */
const STEP = 1;          // mỗi lần Tab = +1 cấp
const MAX = 8;
const EM_PER_LEVEL = 2;  // 1 cấp = 2em

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
          indent: {
            default: 0,
            parseHTML: (el) => {
              const ml = parseFloat(el.style.marginLeft || "0");
              if (!ml) return 0;
              return Math.min(MAX, Math.round(ml / EM_PER_LEVEL));
            },
            renderHTML: (attrs) =>
              attrs.indent
                ? { style: `margin-left: ${attrs.indent * EM_PER_LEVEL}em` }
                : {},
          },
        },
      },
    ];
  },

  addCommands() {
    const setIndent = (delta) => ({ state, dispatch }) => {
      const { selection, doc, tr } = state;
      const { from, to } = selection;
      const types = this.options.types;
      let changed = false;
      doc.nodesBetween(from, to, (node, pos) => {
        if (types.includes(node.type.name)) {
          const cur = node.attrs.indent || 0;
          const next = Math.max(0, Math.min(MAX, cur + delta * STEP));
          if (next !== cur) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next });
            changed = true;
          }
        }
      });
      if (changed && dispatch) dispatch(tr);
      return changed;
    };
    return {
      indentBlock: () => setIndent(+1),
      outdentBlock: () => setIndent(-1),
    };
  },
});

export default Indent;

// tiện ích nhỏ (không bắt buộc) — để tránh cảnh báo import thừa nếu dùng sau
export { TextSelection, AllSelection };
