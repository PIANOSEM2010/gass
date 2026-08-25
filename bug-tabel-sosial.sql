-- ============================================================
-- BUG - tabel untuk umpan sosial (kudos, komentar, story, catatan)
-- Jalankan sekali di Supabase: SQL Editor -> New query -> Run.
-- Aman diulang: semuanya memakai IF NOT EXISTS.
-- ============================================================

-- 1) Catatan & keterbukaan pada aktivitas -------------------------------
alter table public.activities add column if not exists note text;
alter table public.activities add column if not exists is_public boolean not null default true;

-- 2) Kudos (apresiasi) --------------------------------------------------
create table if not exists public.activity_kudos (
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (activity_id, user_id)
);
alter table public.activity_kudos enable row level security;

drop policy if exists "kudos dibaca semua" on public.activity_kudos;
create policy "kudos dibaca semua" on public.activity_kudos
  for select using (true);

drop policy if exists "kudos ditulis pemilik" on public.activity_kudos;
create policy "kudos ditulis pemilik" on public.activity_kudos
  for insert with check (auth.uid() = user_id);

drop policy if exists "kudos dihapus pemilik" on public.activity_kudos;
create policy "kudos dihapus pemilik" on public.activity_kudos
  for delete using (auth.uid() = user_id);

-- 3) Komentar -----------------------------------------------------------
create table if not exists public.activity_comments (
  id          uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 500),
  created_at  timestamptz not null default now()
);
create index if not exists activity_comments_aktivitas_idx
  on public.activity_comments (activity_id, created_at);
alter table public.activity_comments enable row level security;

drop policy if exists "komentar dibaca semua" on public.activity_comments;
create policy "komentar dibaca semua" on public.activity_comments
  for select using (true);

drop policy if exists "komentar ditulis pemilik" on public.activity_comments;
create policy "komentar ditulis pemilik" on public.activity_comments
  for insert with check (auth.uid() = user_id);

drop policy if exists "komentar dihapus pemilik" on public.activity_comments;
create policy "komentar dihapus pemilik" on public.activity_comments
  for delete using (auth.uid() = user_id);

-- 4) Story (kedaluwarsa 24 jam) ----------------------------------------
create table if not exists public.stories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  image_url   text not null,
  caption     text,
  activity_id uuid references public.activities(id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '24 hours')
);
create index if not exists stories_kedaluwarsa_idx on public.stories (expires_at desc);
alter table public.stories enable row level security;

drop policy if exists "story aktif dibaca semua" on public.stories;
create policy "story aktif dibaca semua" on public.stories
  for select using (expires_at > now());

drop policy if exists "story ditulis pemilik" on public.stories;
create policy "story ditulis pemilik" on public.stories
  for insert with check (auth.uid() = user_id);

drop policy if exists "story dihapus pemilik" on public.stories;
create policy "story dihapus pemilik" on public.stories
  for delete using (auth.uid() = user_id);

-- 5) Aktivitas orang lain boleh dibaca bila terbuka ---------------------
drop policy if exists "aktivitas terbuka dibaca semua" on public.activities;
create policy "aktivitas terbuka dibaca semua" on public.activities
  for select using (is_public or auth.uid() = user_id);

-- 6) Wadah berkas untuk foto story -------------------------------------
insert into storage.buckets (id, name, public)
values ('story', 'story', true)
on conflict (id) do nothing;

drop policy if exists "story unggah pemilik" on storage.objects;
create policy "story unggah pemilik" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'story' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "story dibaca semua" on storage.objects;
create policy "story dibaca semua" on storage.objects
  for select using (bucket_id = 'story');
