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
  translate: (word) => post("/api/translate", { word }),
  explain:   (word) => post("/api/explain",   { word }),
  zdic:      (word) => post("/api/zdic",      { word }),
  examples:  (word) => post("/api/examples",  { word }),
  synonyms:  (word) => post("/api/synonyms",  { word }),
  sentence:  (text) => post("/api/sentence",  { text }),
};
