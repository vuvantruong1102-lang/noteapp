# Hán Notes — Ghi chú & học tiếng Trung

App ghi chú cá nhân kèm bộ công cụ học tiếng Trung. Giao diện sáng, tối giản,
tone xanh Evernote, tối ưu cho mobile.

- **Frontend:** React 18 + Vite + React Router, font Be Vietnam Pro / Noto Sans SC
- **Backend:** Vercel Serverless Functions (Node ESM) gọi OpenAI
- **Dữ liệu & Auth:** Supabase (đăng nhập email + mật khẩu), bảng tiền tố `zhnote_`
- **Triển khai:** Vercel

## Tính năng

**Ghi chú** — 4 nhóm: Công việc · Cá nhân · Học tập · Tiếng Trung. Viết nhanh,
ghim, lọc theo nhóm, hiển thị ngày tháng.

**Tiếng Trung → Từ vựng** — gõ một từ rồi dùng các nút:
| Nút | Việc | Nguồn |
|-----|------|-------|
| Dịch | nghĩa tiếng Việt + pinyin + giải thích | OpenAI |
| Giải thích | phần mở đầu + mục 字源演变, đã dịch | baike.baidu.com → OpenAI |
| Ví dụ | ~5 câu mẫu + breakdown + dịch + ngữ pháp | OpenAI |
| Video | video phát âm | widget youglish.com |
| Đồng nghĩa | từ đồng/gần nghĩa kèm sắc thái | OpenAI |

Lịch sử tra cứu lưu ở Supabase (`zhnote_searches`) kiêm **cache** kết quả từng
nút — tra lại từ cũ không tốn token.

**Dịch câu** — dán câu tiếng Trung, app tách từ + sinh pinyin, dịch và giải
thích ngữ pháp, liệt kê từ mới, lưu thẳng vào ghi chú.

## Cài đặt

```bash
npm install
cp .env.example .env        # rồi điền giá trị thật
```

### Biến môi trường
| Biến | Phía | Ghi chú |
|------|------|---------|
| `VITE_SUPABASE_URL` | client | URL project Supabase |
| `VITE_SUPABASE_ANON_KEY` | client | anon key (an toàn để lộ, có RLS) |
| `OPENAI_API_KEY` | server | **không** có tiền tố VITE_ |
| `OPENAI_MODEL` | server | mặc định `gpt-4o-mini` |

### Supabase
1. Tạo project (hoặc dùng project chung sẵn có).
2. Mở **SQL Editor**, chạy toàn bộ `supabase/schema.sql` (tạo bảng + RLS).
3. Vào **Authentication → Providers**, bật Email. Nếu muốn đăng nhập không cần
   xác nhận email, tắt "Confirm email" trong giai đoạn dev.

### Chạy local
Vì có serverless function, dùng Vercel CLI để `/api` hoạt động:
```bash
npm i -g vercel
vercel dev
```
(Chạy `npm run dev` thuần chỉ phục vụ frontend, các nút gọi `/api` sẽ lỗi trừ
khi bật proxy trong `vite.config.js`.)

## Deploy lên Vercel
1. Push repo lên GitHub.
2. Trên Vercel: **New Project** → import repo. Framework tự nhận là Vite.
3. Thêm 4 biến môi trường ở trên (Settings → Environment Variables).
4. Deploy. Thư mục `api/` tự thành serverless functions, `vercel.json` lo phần
   SPA fallback.

## Cấu trúc thư mục
```
api/                serverless functions
  _lib/openai.js    helper gọi OpenAI (Vercel bỏ qua folder _)
  translate.js  explain.js  examples.js  synonyms.js  sentence.js
src/
  pages/            Login, Notes, NoteEditor, Chinese, Translate
  components/       BottomNav, NoteCard, Ruby, Spinner, YouglishWidget
  context/          AuthContext
  lib/              supabase.js, api.js
supabase/schema.sql bảng + RLS + trigger
```

## Lưu ý
- **Baike (nút Giải thích):** IP datacenter của Vercel đôi khi bị Baidu chặn →
  kết quả tự chuyển sang `source: ai_fallback`. Nếu chặn nhiều, đặt proxy IP
  Trung Quốc trước Baike. Đã có sẵn 2 chỗ `TODO (cache)` để lưu kết quả.
- **Youglish:** dùng widget cho mục đích thương mại / app mobile cần xin phép
  Youglish, và phải luôn hiển thị "Powered by YouGlish.com" (đã có sẵn).
- **OpenAI key** chỉ nằm ở serverless function, không lộ ra client.
- Bundle pinyin-pro khá lớn; nếu cần nhẹ hơn có thể lazy-load trang Tiếng Trung.
