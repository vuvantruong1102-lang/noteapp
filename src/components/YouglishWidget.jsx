import { useEffect, useRef } from "react";

// Widget Youglish (nguồn video phát âm từ YouTube qua youglish.com).
// LƯU Ý BẢN QUYỀN: dùng cho mục đích thương mại / trong app mobile cần
// xin phép Youglish, và phải luôn hiển thị "Powered by YouGlish.com".
export default function YouglishWidget({ word }) {
  const ready = useRef(false);

  useEffect(() => {
    if (!word) return;

    function search() {
      try {
        const w = window.YG.getWidget("yg-widget");
        if (w.fetch) w.fetch(word, "chinese");
        else w.search(word);
      } catch (e) { /* widget chưa sẵn sàng */ }
    }

    window.onYouglishAPIReady = () => { ready.current = true; search(); };

    if (window.YG && window.YG.getWidget) {
      search();
    } else if (!document.getElementById("yg-script")) {
      const s = document.createElement("script");
      s.id = "yg-script";
      s.src = "https://youglish.com/public/emb/widget.js";
      s.async = true;
      document.body.appendChild(s);
    }
  }, [word]);

  return (
    <div className="stack">
      <a
        id="yg-widget"
        className="youglish-widget"
        data-query={word}
        data-lang="chinese"
        data-components="8"
        data-bkg-color="FFFFFF"
        data-link-color="00A82D"
        data-toggle-ui="0"
        href="https://youglish.com"
        style={{ display: "block", minHeight: 320 }}
      >
        Visit YouGlish.com
      </a>
      <div className="tiny muted" style={{ textAlign: "right" }}>Powered by YouGlish.com</div>
    </div>
  );
}
