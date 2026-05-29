// Gọi các serverless function ở /api. Cùng origin nên không cần CORS.
async function post(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "request_failed");
  return data;
}

export const api = {
  lookup:      (word) => post("/api/lookup", { word }),                          // tức thì, không AI
  translatevi: (word, definition_en, han_viet) =>
                 post("/api/translatevi", { word, definition_en, han_viet }),    // AI dịch Việt
  explain:     (word) => post("/api/explain", { word }),
  zdic:        (word) => post("/api/zdic",    { word }),
  sentence:    (text) => post("/api/sentence", { text }),
};
