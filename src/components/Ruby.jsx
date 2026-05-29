import { pinyin } from "pinyin-pro";

// Hiển thị chữ Hán kèm pinyin phía trên (ruby) cho từng chữ.
export default function Ruby({ text, size = 20 }) {
  if (!text) return null;
  const chars = Array.from(text);
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "flex-end" }}>
      {chars.map((ch, i) => {
        const isHan = /[\u4e00-\u9fff]/.test(ch);
        const py = isHan ? pinyin(ch, { toneType: "symbol" }) : "";
        return (
          <span className="ruby" key={i}>
            <span className="py">{py}</span>
            <span className="hz zh" style={{ fontSize: size }}>{ch}</span>
          </span>
        );
      })}
    </span>
  );
}
