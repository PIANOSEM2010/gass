-- ============================================================================
-- BUG - dukungan wilayah
--
-- Sampai sekarang aplikasi menganggap semua penggunanya berada di Kabupaten
-- Bulungan: judul dasbor, titik awal peta, batas pencarian tempat, dan nama
-- tempat cadangan pada kartu semuanya tertulis tetap. Kolom di bawah membuat
-- tiap pengguna punya wilayahnya sendiri, sehingga aplikasi yang sama bisa
-- dipakai di seluruh Indonesia.
--
-- Jalankan di Supabase: SQL Editor -> New query -> Run. Aman diulang.
-- ============================================================================

alter table public.profiles add column if not exists region text;
alter table public.profiles add column if not exists province text;
alter table public.profiles add column if not exists region_lat double precision;
alter table public.profiles add column if not exists region_lng double precision;

comment on column public.profiles.region is
  'Kabupaten atau kota pengguna, misalnya "Kabupaten Bulungan".';
comment on column public.profiles.province is
  'Provinsi pengguna, misalnya "Kalimantan Utara".';
comment on column public.profiles.region_lat is
  'Titik acuan wilayah, dipakai sebagai pusat peta dan batas pencarian tempat.';

-- Pengguna lama diberi wilayah bawaan agar tampilannya tidak kosong.
-- Ubah nilainya bila basis penggunamu bukan di Bulungan.
update public.profiles
set region     = coalesce(region, 'Kabupaten Bulungan'),
    province   = coalesce(province, 'Kalimantan Utara'),
    region_lat = coalesce(region_lat, 2.8450),
    region_lng = coalesce(region_lng, 117.3680)
where region is null;
