-- ============================================================
--  MIGRATION: thêm hệ thống thẻ (tags) cho ghi chú
--  Chạy 1 lần trong Supabase SQL Editor.
-- ============================================================

create table if not exists public.zhnote_tags (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  color       text default '#00a82d',
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.zhnote_note_tags (
  note_id     uuid not null references public.zhnote_notes(id) on delete cascade,
  tag_id      uuid not null references public.zhnote_tags(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (note_id, tag_id)
);

create index if not exists zhnote_tags_user_idx      on public.zhnote_tags(user_id);
create index if not exists zhnote_note_tags_note_idx on public.zhnote_note_tags(note_id);
create index if not exists zhnote_note_tags_tag_idx  on public.zhnote_note_tags(tag_id);

alter table public.zhnote_tags      enable row level security;
alter table public.zhnote_note_tags enable row level security;

create policy "tags_own"      on public.zhnote_tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "note_tags_own" on public.zhnote_note_tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
