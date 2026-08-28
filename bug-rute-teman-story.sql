-- ============================================================
-- BUG - rute tersimpan, pertemanan, dan story
-- Jalankan di Supabase: SQL Editor -> New query -> Run. Aman diulang.
-- ============================================================

-- 1) Rute tersimpan ------------------------------------------------------
create table if not exists public.saved_routes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 80),
  note         text,
  path         jsonb not null,
  distance_m   double precision not null default 0,
  elevation_m  double precision not null default 0,
  duration_s   integer,
  source       text not null default 'riwayat',   -- riwayat | rekomendasi | rencana
  share_token  text not null default encode(gen_random_bytes(9), 'hex'),
  is_public    boolean not null default true,
  created_at   timestamptz not null default now()
);
create unique index if not exists saved_routes_token_idx on public.saved_routes (share_token);
create index if not exists saved_routes_user_idx on public.saved_routes (user_id, created_at desc);
alter table public.saved_routes enable row level security;

drop policy if exists "rute dibaca pemilik atau bila terbuka" on public.saved_routes;
create policy "rute dibaca pemilik atau bila terbuka" on public.saved_routes
  for select using (is_public or auth.uid() = user_id);

drop policy if exists "rute ditulis pemilik" on public.saved_routes;
create policy "rute ditulis pemilik" on public.saved_routes
  for insert with check (auth.uid() = user_id);

drop policy if exists "rute diubah pemilik" on public.saved_routes;
create policy "rute diubah pemilik" on public.saved_routes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "rute dihapus pemilik" on public.saved_routes;
create policy "rute dihapus pemilik" on public.saved_routes
  for delete using (auth.uid() = user_id);

-- 2) Pertemanan (mengikuti satu arah, seperti media sosial) --------------
create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followee_id uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint tidak_mengikuti_diri_sendiri check (follower_id <> followee_id)
);
create index if not exists follows_followee_idx on public.follows (followee_id);
alter table public.follows enable row level security;

drop policy if exists "ikut dibaca semua" on public.follows;
create policy "ikut dibaca semua" on public.follows for select using (true);

drop policy if exists "ikut ditulis pemilik" on public.follows;
create policy "ikut ditulis pemilik" on public.follows
  for insert with check (auth.uid() = follower_id);

drop policy if exists "ikut dihapus pemilik" on public.follows;
create policy "ikut dihapus pemilik" on public.follows
  for delete using (auth.uid() = follower_id);

-- 3) Story: dukungan story tanpa foto -----------------------------------
-- Story teks tetap disimpan sebagai gambar hasil kanvas, jadi image_url
-- selalu terisi. Kolom di bawah dipakai agar story bisa disunting ulang.
alter table public.stories add column if not exists kind text not null default 'foto';
alter table public.stories add column if not exists bg text;

-- 4) Pencarian pengguna --------------------------------------------------
-- Diperlukan agar pencarian nama berjalan cepat saat pengguna bertambah.
create index if not exists profiles_nama_idx
  on public.profiles using gin (to_tsvector('simple', coalesce(full_name, '')));
