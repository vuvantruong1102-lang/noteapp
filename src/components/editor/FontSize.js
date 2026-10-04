import { Extension } from "@tiptap/core";

/**
 * FontSize — đặt/huỷ cỡ chữ.
 *
 * (1) Mark trên textStyle: <span style="font-size"> — cho đoạn text được chọn.
 * (2) Node attribute trên paragraph / heading / listItem / taskItem — để SỐ
 *     THỨ TỰ của danh sách đánh số (::marker) và dấu đầu dòng cũng phóng to
 *     theo, vì ::marker thừa hưởng font-size từ <li>.
 *
 * Vẫn lưu HTML, tương thích ngược với note cũ.
 */
const BLOCK_TYPES = ["paragraph", "heading", "listItem", "taskItem"];

export const FontSize = Extension.create({
  name: "fontSize",

  addOptions() {
    return { types: ["textStyle"], blockTypes: BLOCK_TYPES };
  },

  addGlobalAttributes() {
    return [
      // (1) mark inline
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el) => el.style.fontSize || null,
            renderHTML: (attrs) =>
              attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
          },
        },
      },
      // (2) attribute trên block (để ::marker scale theo)
      {
        types: this.options.blockTypes,
        attributes: {
          blockFontSize: {
            default: null,
            parseHTML: (el) => el.style.fontSize || null,
            renderHTML: (attrs) =>
              attrs.blockFontSize ? { style: `font-size: ${attrs.blockFontSize}` } : {},
          },
        },
      },
    ];
  },

  addCommands() {
    const setBlockFontSize = (size) => ({ state, dispatch }) => {
      const { from, to } = state.selection;
      const { tr, doc } = state;
      const blockTypes = this.options.blockTypes;
      let changed = false;
      doc.nodesBetween(from, to, (node, pos) => {
        if (blockTypes.includes(node.type.name)) {
          if ((node.attrs.blockFontSize || null) !== (size || null)) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, blockFontSize: size });
            changed = true;
          }
        }
      });
      if (changed && dispatch) dispatch(tr);
      return true;
    };

    return {
      setFontSize:
        (size) =>
        ({ chain }) =>
          chain()
            .setMark("textStyle", { fontSize: size })
            .command(setBlockFontSize(size))
            .run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain()
            .setMark("textStyle", { fontSize: null })
            .removeEmptyTextStyle()
            .command(setBlockFontSize(null))
            .run(),
    };
  },
});

export default FontSize;
