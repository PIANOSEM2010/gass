-- ============================================================================
-- BUG - kolaborasi perjalanan gowes
--
-- Memungkinkan pemilik sebuah perjalanan mengundang orang lain yang ikut gowes
-- bersamanya. Setiap kolaborator mendapat CATATAN PERJALANANNYA SENDIRI, bukan
-- sekadar namanya ditempel di postingan orang lain. Jadi perjalanan itu muncul
-- di beranda dan profilnya, dan ikut terhitung sebagai gowesnya - karena ia
-- memang benar-benar ikut bersepeda.
--
-- Jalankan di Supabase: SQL Editor -> New query -> Run. Aman diulang.
-- ============================================================================

-- 1) Penanda asal salinan ------------------------------------------------
-- Menunjuk perjalanan asli. Dengan ini kita selalu tahu perjalanan mana yang
-- sebenarnya satu kejadian, sehingga bisa ditampilkan sebagai kolaborasi dan
-- bisa dibatalkan tanpa menyentuh yang lain.
alter table public.activities
  add column if not exists collab_from uuid references public.activities(id) on delete set null;

alter table public.activities
  add column if not exists collab_by uuid references auth.users(id) on delete set null;

create index if not exists activities_collab_idx on public.activities (collab_from);

comment on column public.activities.collab_from is
  'Bila terisi, baris ini salinan kolaborasi dari perjalanan tersebut.';
comment on column public.activities.collab_by is
  'Pengguna yang mengundang, yaitu pemilik perjalanan aslinya.';


-- 2) Menambahkan kolaborator --------------------------------------------
-- Dibuat sebagai fungsi karena aturan akses melarang seorang pengguna menulis
-- baris aktivitas atas nama orang lain - dan larangan itu memang benar. Fungsi
-- ini berjalan dengan hak pemilik basis data, tetapi hanya mau bekerja bila
-- pemanggilnya benar-benar pemilik perjalanan yang dibagikan.
create or replace function public.tambah_kolaborator(
  p_activity_id uuid,
  p_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  asli   public.activities;
  sudah  uuid;
  baru   uuid;
begin
  select * into asli from public.activities where id = p_activity_id;
  if asli.id is null then
    raise exception 'Perjalanan tidak ditemukan';
  end if;

  -- Hanya pemilik perjalanan yang boleh mengundang.
  if asli.user_id <> auth.uid() then
    raise exception 'Hanya pemilik perjalanan yang bisa menambahkan kolaborator';
  end if;

  -- Tidak perlu mengundang diri sendiri.
  if p_user_id = asli.user_id then
    raise exception 'Kamu sudah pemilik perjalanan ini';
  end if;

  -- Kolaborator yang sama tidak digandakan.
  select id into sudah
  from public.activities
  where collab_from = p_activity_id and user_id = p_user_id
  limit 1;
  if sudah is not null then
    return sudah;
  end if;

  insert into public.activities (
    user_id, distance_m, duration_s, elevation_gain_m, path,
    started_at, activity_date, note, event_id, collab_from, collab_by
  )
  values (
    p_user_id, asli.distance_m, asli.duration_s, asli.elevation_gain_m, asli.path,
    asli.started_at, asli.activity_date, asli.note, asli.event_id,
    p_activity_id, asli.user_id
  )
  returning id into baru;

  return baru;
end;
$$;

revoke all on function public.tambah_kolaborator(uuid, uuid) from public;
grant execute on function public.tambah_kolaborator(uuid, uuid) to authenticated;


-- 3) Membatalkan kolaborator --------------------------------------------
create or replace function public.hapus_kolaborator(
  p_activity_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  asli public.activities;
begin
  select * into asli from public.activities where id = p_activity_id;
  if asli.id is null then
    raise exception 'Perjalanan tidak ditemukan';
  end if;

  -- Boleh dibatalkan oleh pemilik perjalanan asli, atau oleh kolaborator itu
  -- sendiri bila ia tidak ingin perjalanan itu ada di profilnya.
  if asli.user_id <> auth.uid() and p_user_id <> auth.uid() then
    raise exception 'Tidak berwenang membatalkan kolaborasi ini';
  end if;

  delete from public.activities
  where collab_from = p_activity_id and user_id = p_user_id;
end;
$$;

revoke all on function public.hapus_kolaborator(uuid, uuid) from public;
grant execute on function public.hapus_kolaborator(uuid, uuid) to authenticated;


-- 4) Menyunting catatan perjalanan ---------------------------------------
-- Pemilik boleh mengubah catatan perjalanannya. Kebijakan ubah pada tabel
-- activities perlu ada agar penyuntingan dari aplikasi diizinkan.
drop policy if exists "aktivitas diubah pemilik" on public.activities;
create policy "aktivitas diubah pemilik" on public.activities
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
