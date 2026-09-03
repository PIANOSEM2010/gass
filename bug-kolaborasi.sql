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


-- 2) Memperbarui rentetan hari dan total ---------------------------------
--
-- Rentetan biasanya dihitung oleh /api/activity saat pengguna menekan Simpan.
-- Kolaborator tidak melewati jalur itu - perjalanannya disalin langsung di
-- basis data - sehingga tanpa fungsi ini rentetannya tidak ikut hidup meski ia
-- benar-benar bersepeda hari itu.
--
-- Aturannya disamakan persis dengan yang dipakai aplikasi:
--   - Satu hari dianggap terpenuhi bila total jarak hari itu minimal 1 km.
--   - Tanggal memakai waktu Bulungan (WITA, UTC+8), bukan waktu peladen.
--   - Ada tenggang dua hari: rentetan baru putus bila absen lebih dari itu.
create or replace function public.segarkan_rentetan(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hari_ini    date := (now() + interval '8 hours')::date;
  kemarin     date := hari_ini - 1;
  dua_hari    date := hari_ini - 2;
  total_hari  double precision;
  total_jarak double precision;
  total_rute  integer;
  lama        public.user_streaks;
  rentet_baru integer;
  tgl_baru    date;
  nama        text;
  asal        text;
begin
  -- Total jarak hari ini, dihitung ulang dari aktivitas sungguhan supaya
  -- tidak pernah menggandakan hitungan bila fungsi ini dipanggil dua kali.
  select coalesce(sum(distance_m), 0) into total_hari
  from public.activities
  where user_id = p_user_id
    and (started_at + interval '8 hours')::date = hari_ini
    and coalesce(is_demo, false) = false;

  select coalesce(sum(distance_m), 0), count(*) into total_jarak, total_rute
  from public.activities
  where user_id = p_user_id
    and coalesce(is_demo, false) = false;

  select * into lama from public.user_streaks where user_id = p_user_id;

  rentet_baru := coalesce(lama.current_streak, 0);
  tgl_baru    := lama.last_activity_date;

  if total_hari >= 1000 and coalesce(tgl_baru, date '1900-01-01') <> hari_ini then
    if tgl_baru in (kemarin, dua_hari) then
      rentet_baru := coalesce(lama.current_streak, 0) + 1;
    else
      rentet_baru := 1;
    end if;
    tgl_baru := hari_ini;
  end if;

  select full_name, organization into nama, asal
  from public.profiles where id = p_user_id;

  insert into public.user_streaks (
    user_id, current_streak, longest_streak, last_activity_date,
    total_distance_m, total_rides, full_name, organization, updated_at
  )
  values (
    p_user_id, rentet_baru,
    greatest(coalesce(lama.longest_streak, 0), rentet_baru), tgl_baru,
    total_jarak, total_rute, nama, asal, now()
  )
  on conflict (user_id) do update set
    current_streak     = excluded.current_streak,
    longest_streak     = excluded.longest_streak,
    last_activity_date = excluded.last_activity_date,
    total_distance_m   = excluded.total_distance_m,
    total_rides        = excluded.total_rides,
    full_name          = coalesce(excluded.full_name, public.user_streaks.full_name),
    organization       = coalesce(excluded.organization, public.user_streaks.organization),
    updated_at         = now();
end;
$$;

revoke all on function public.segarkan_rentetan(uuid) from public;
grant execute on function public.segarkan_rentetan(uuid) to authenticated;


-- 3) Menambahkan kolaborator --------------------------------------------
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

  -- Rentetan hari kolaborator ikut hidup, karena ia memang bersepeda hari itu.
  perform public.segarkan_rentetan(p_user_id);

  return baru;
end;
$$;

revoke all on function public.tambah_kolaborator(uuid, uuid) from public;
grant execute on function public.tambah_kolaborator(uuid, uuid) to authenticated;


-- 4) Membatalkan kolaborator --------------------------------------------
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

  -- Total jarak dan jumlah perjalanan dihitung ulang setelah salinannya
  -- dibuang. Rentetan hari yang sudah tercatat tidak ditarik kembali: hari itu
  -- memang sudah dilalui, dan mencabutnya kemudian akan membuat riwayat
  -- rentetan orang berubah-ubah tanpa sebab yang bisa mereka lihat.
  perform public.segarkan_rentetan(p_user_id);
end;
$$;

revoke all on function public.hapus_kolaborator(uuid, uuid) from public;
grant execute on function public.hapus_kolaborator(uuid, uuid) to authenticated;


-- 5) Menyunting catatan perjalanan ---------------------------------------
-- Pemilik boleh mengubah catatan perjalanannya. Kebijakan ubah pada tabel
-- activities perlu ada agar penyuntingan dari aplikasi diizinkan.
drop policy if exists "aktivitas diubah pemilik" on public.activities;
create policy "aktivitas diubah pemilik" on public.activities
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
