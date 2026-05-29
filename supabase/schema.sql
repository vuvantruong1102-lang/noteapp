-- ============================================================
--  Schema cho app Hán Notes (đặt tiền tố zhnote_ để dùng chung
--  Supabase với project khác mà không đụng tên bảng).
--  Chạy file này trong Supabase SQL Editor.
-- ============================================================

-- 1) GHI CHÚ ---------------------------------------------------
create table if not exists public.zhnote_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text default '',
  content     text default '',
  category    text not null default 'ca_nhan'
              check (category in ('cong_viec','ca_nhan','hoc_tap','tieng_trung')),
  pinned      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists zhnote_notes_user_idx on public.zhnote_notes(user_id, updated_at desc);

-- 2) LỊCH SỬ TRA TỪ (kiêm cache kết quả từng nút) -------------
--    data jsonb gom: { translate, explain, examples, synonyms }
create table if not exists public.zhnote_searches (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  word        text not null,
  pinyin      text default '',
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, word)
);
create index if not exists zhnote_searches_user_idx on public.zhnote_searches(user_id, updated_at desc);

-- 3) ROW LEVEL SECURITY ---------------------------------------
alter table public.zhnote_notes    enable row level security;
alter table public.zhnote_searches enable row level security;

create policy "notes_own" on public.zhnote_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "searches_own" on public.zhnote_searches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4) Tự cập nhật updated_at -----------------------------------
create or replace function public.zhnote_touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

drop trigger if exists zhnote_notes_touch on public.zhnote_notes;
create trigger zhnote_notes_touch before update on public.zhnote_notes
  for each row execute function public.zhnote_touch_updated_at();

drop trigger if exists zhnote_searches_touch on public.zhnote_searches;
create trigger zhnote_searches_touch before update on public.zhnote_searches
  for each row execute function public.zhnote_touch_updated_at();
