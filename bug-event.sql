-- ============================================================
-- BUG - fitur Event Gowes
-- Jalankan di Supabase: SQL Editor -> New query -> Run. Aman diulang.
-- ============================================================

-- 1) Event ---------------------------------------------------------------
create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),
  creator_id    uuid not null references auth.users(id) on delete cascade,
  name          text not null check (char_length(name) between 3 and 90),
  logo_url      text,
  description   text,
  start_at      timestamptz,
  meeting_point text,
  -- Titik-titik jalur yang ditandai pengaju, berurutan dari start ke finish.
  waypoints     jsonb not null default '[]'::jsonb,
  distance_m    double precision not null default 0,
  -- Catatan yang muncul di halaman event
  catatan_rawan text,
  catatan_etika text,
  -- Alur persetujuan admin
  status        text not null default 'menunggu'
                check (status in ('menunggu', 'disetujui', 'ditolak')),
  alasan_tolak  text,
  reviewed_by   uuid references auth.users(id) on delete set null,
  reviewed_at   timestamptz,
  share_token   text not null default encode(gen_random_bytes(9), 'hex'),
  created_at    timestamptz not null default now()
);
create unique index if not exists events_token_idx on public.events (share_token);
create index if not exists events_status_idx on public.events (status, start_at);
alter table public.events enable row level security;

-- Event yang sudah disetujui boleh dibaca siapa saja; pengaju selalu bisa
-- melihat miliknya sendiri walau masih menunggu atau ditolak.
drop policy if exists "event disetujui dibaca semua" on public.events;
create policy "event disetujui dibaca semua" on public.events
  for select using (
    status = 'disetujui'
    or auth.uid() = creator_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "event diajukan pengguna" on public.events;
create policy "event diajukan pengguna" on public.events
  for insert with check (auth.uid() = creator_id and status = 'menunggu');

-- Pengaju boleh menyunting selama masih menunggu; admin boleh kapan saja
-- (untuk menyetujui atau menolak).
drop policy if exists "event diubah pengaju atau admin" on public.events;
create policy "event diubah pengaju atau admin" on public.events
  for update using (
    (auth.uid() = creator_id and status = 'menunggu')
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "event dihapus pengaju atau admin" on public.events;
create policy "event dihapus pengaju atau admin" on public.events
  for delete using (
    auth.uid() = creator_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- 2) Peserta event -------------------------------------------------------
create table if not exists public.event_participants (
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  finished_at timestamptz,
  activity_id uuid references public.activities(id) on delete set null,
  primary key (event_id, user_id)
);
create index if not exists event_participants_event_idx on public.event_participants (event_id);
alter table public.event_participants enable row level security;

drop policy if exists "peserta dibaca semua" on public.event_participants;
create policy "peserta dibaca semua" on public.event_participants
  for select using (true);

drop policy if exists "peserta ditulis pemilik" on public.event_participants;
create policy "peserta ditulis pemilik" on public.event_participants
  for insert with check (auth.uid() = user_id);

drop policy if exists "peserta diubah pemilik" on public.event_participants;
create policy "peserta diubah pemilik" on public.event_participants
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "peserta dihapus pemilik" on public.event_participants;
create policy "peserta dihapus pemilik" on public.event_participants
  for delete using (auth.uid() = user_id);

-- 3) Penanda event pada aktivitas ---------------------------------------
alter table public.activities add column if not exists event_id uuid
  references public.events(id) on delete set null;

-- 4) Wadah berkas untuk logo event --------------------------------------
insert into storage.buckets (id, name, public)
values ('event', 'event', true)
on conflict (id) do nothing;

drop policy if exists "logo event diunggah pengguna" on storage.objects;
create policy "logo event diunggah pengguna" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'event' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "logo event dibaca semua" on storage.objects;
create policy "logo event dibaca semua" on storage.objects
  for select using (bucket_id = 'event');
