import { Extension } from "@tiptap/core";

/**
 * Gõ "[] " hoặc "[ ] " (hoặc "[x] ") ở đầu dòng -> chuyển thành checklist.
 * Chỉ chạy qua input rule của ProseMirror nên an toàn với IME:
 * input rule không kích hoạt giữa lúc composition tiếng Trung.
 */
export const ChecklistInputRule = Extension.create({
  name: "checklistInputRule",

  addInputRules() {
    return [
      {
        find: /^\[( |x|X)?\]\s$/,
        handler: ({ range, chain }) => {
          chain().deleteRange(range).toggleTaskList().run();
        },
      },
    ];
  },
});

export default ChecklistInputRule;
