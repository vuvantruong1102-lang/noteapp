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
const MAX = 80;   // trần (em)

function clamp(v) { return Math.max(0, Math.min(MAX, v)); }
function emOf(style) { const n = parseFloat(style || "0"); return isNaN(n) ? 0 : n; }

export const Indent = Extension.create({
  name: "indent",

  addOptions() {
    // gồm cả listItem/taskItem -> khi kéo ruler trong danh sách, CẢ SỐ THỨ TỰ
    // và dấu đầu dòng cũng dịch theo (vì lề đặt trên <li>, không phải <p> bên trong).
    return { types: ["paragraph", "heading", "listItem", "taskItem"] };
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
    const LIST_ITEMS = ["listItem", "taskItem"];
    const edit = (fn) => ({ state, dispatch }) => {
      const { from, to } = state.selection;
      const { tr, doc } = state;
      // 1) thu thập vị trí các listItem/taskItem trong vùng chọn
      const listItemPositions = [];
      doc.nodesBetween(from, to, (node, pos) => {
        if (LIST_ITEMS.includes(node.type.name)) listItemPositions.push([pos, pos + node.nodeSize]);
      });
      const insideListItem = (pos) =>
        listItemPositions.some(([s, e]) => pos > s && pos < e);

      let changed = false;
      doc.nodesBetween(from, to, (node, pos) => {
        const name = node.type.name;
        if (LIST_ITEMS.includes(name)) {
          // đặt lề trên chính <li> -> số thứ tự / dấu đầu dòng dịch theo
          const next = fn(node.attrs);
          if (next) { tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...next }); changed = true; }
        } else if (name === "paragraph" || name === "heading") {
          if (insideListItem(pos)) {
            // đoạn NẰM TRONG list: KHÔNG giữ lề riêng (nếu note cũ lỡ có margin trên <p>
            // thì xoá đi) -> tránh chữ bị thụt kẹt không kéo thước về 0 được.
            if ((node.attrs.indentLeft || 0) !== 0 || (node.attrs.indentRight || 0) !== 0) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, indentLeft: 0, indentRight: 0 });
              changed = true;
            }
          } else {
            // đoạn/heading ngoài list
            const next = fn(node.attrs);
            if (next) { tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...next }); changed = true; }
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
